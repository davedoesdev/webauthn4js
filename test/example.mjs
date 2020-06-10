/*eslint-env node */

import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mod_fastify from 'fastify';
import fastify_static from 'fastify-static';
import sodium_plus  from 'sodium-plus';
const { SodiumPlus } = sodium_plus;
import makeWebAuthn from '../index.js';
const readFile = fs.promises.readFile;

const challenge_timeout = 60000;
const port = 3000;

const __dirname = dirname(fileURLToPath(import.meta.url));

const users = new Map();
let num_users = 0;

class ErrorWithStatus extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

const keys_dir = join(__dirname, 'keys');

const fastify = mod_fastify({
    logger: true,
    https: {
        key: await readFile(join(keys_dir, 'server.key')),
        cert: await readFile(join(keys_dir, 'server.crt'))
    }
});

fastify.register(fastify_static, {
    root: join(__dirname, 'fixtures'),
    index: 'example.html'
});

const webAuthn = await makeWebAuthn({
    RPDisplayName: 'WebAuthnJS',
    RPID: 'localhost',
    RPOrigin: `https://localhost:${port}`,
    RPIcon: `https://localhost:${port}/logo.png`,
    AuthenticatorSelection: {
        userVerification: 'preferred'
    }
});

const sodium = await SodiumPlus.auto();
const session_data_key = await sodium.crypto_secretbox_keygen();

async function make_secret_session_data(username, type, session_data) {
    const nonce = await sodium.randombytes_buf(
        sodium.CRYPTO_SECRETBOX_NONCEBYTES);
    return {
        ciphertext: (await sodium.crypto_secretbox(
            JSON.stringify([ username, type, session_data, Date.now() ]),
            nonce,
            session_data_key)).toString('base64'),
        nonce: nonce.toString('base64')
    };
}

async function verify_secret_session_data(
    expected_username,
    expected_type,
    secret_session_data) {
    try {
        const [ username, type, session_data, timestamp ] = JSON.parse(
            await sodium.crypto_secretbox_open(
                Buffer.from(secret_session_data.ciphertext, 'base64'),
                Buffer.from(secret_session_data.nonce, 'base64'),
                session_data_key));
        if (username !== expected_username) {
            throw new Error('wrong username');
        }
        if (type !== expected_type) {
            throw new Error('wrong type');
        }
        if ((timestamp + challenge_timeout) <= Date.now()) {
            throw new Error('session timed out');
        }
        return session_data;
    } catch (ex) {
        ex.statusCode = 400;
        throw ex;
    }
}

async function register(fastify) {
    fastify.get('/:username',  async request => {
        let user = users.get(request.params.username);
        if (!user) {
            user = {
                id: `user${num_users++}`,
                name: request.params.username,
                displayName: request.params.username.split('@')[0],
                iconURL: '',
                credentials: []
            };
            users.set(request.params.username, user);
        }
        const excludeCredentials = user.credentials.map(c => ({
            type: 'public-key',
            id: c.ID
        }));
        const { options, sessionData } = await webAuthn.beginRegistration(
            user,
            cco => {
                cco.excludeCredentials = excludeCredentials;
                return cco;
            });
        return {
            options,
            session_data: await make_secret_session_data(
                request.params.username, 'registration', sessionData)
        };
    });

    fastify.put('/:username', async (request, reply) => {
        const user = users.get(request.params.username);
        if (!user) {
            throw new ErrorWithStatus('no user', 404);
        }
        const session_data = await verify_secret_session_data(
            request.params.username, 'registration', request.body.session_data);
        let credential;
        try {
            credential = await webAuthn.finishRegistration(
                user, session_data, request.body.ccr);
        } catch (ex) {
            ex.statusCode = 400;
            throw ex;
        }
        user.credentials.push(credential);
        reply.code(204);
    });
}

async function login(fastify) {
    fastify.get('/:username',  async request => {
        const user = users.get(request.params.username);
        if (!user) {
            throw new ErrorWithStatus('no user', 404);
        }
        const { options, sessionData } = await webAuthn.beginLogin(user);
        return {
            options,
            session_data: await make_secret_session_data(
                request.params.username, 'login', sessionData)
        };
    });

    fastify.post('/:username', async (request, reply) => {
        const user = users.get(request.params.username);
        if (!user) {
            throw new ErrorWithStatus('no user', 404);
        }
        const session_data = await verify_secret_session_data(
            request.params.username, 'login', request.body.session_data);
        let credential;
        try {
            credential = await webAuthn.finishLogin(
                user, session_data, request.body.car);
        } catch (ex) {
            ex.statusCode = 400;
            throw ex;
        }
        if (credential.Authenticator.CloneWarning) {
            throw new Error('credential appears to be cloned', 403);
        }
        const user_cred = user.credentials.find(c => c.ID === credential.ID);
        if (!user_cred) {
            // Should have been checked already in Go by webAuthn.finishLogin
            throw new ErrorWithStatus('no credential', 500);
        }
        user_cred.Authenticator.SignCount = credential.Authenticator.SignCount;
        reply.code(204);
    });
}

fastify.register(register, {
    prefix: '/register/'
});

fastify.register(login, {
    prefix: '/login/'
});

await fastify.listen(port);

console.log(`Please visit https://localhost:${port}`);

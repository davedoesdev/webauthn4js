/*eslint-env node */

import * as path from 'path';
import * as fs from 'fs';
import mod_fastify, { FastifyError } from 'fastify';
import fastify_static from 'fastify-static';
import sodium_plus from 'sodium-plus';
import makeWebAuthn from '..';

const readFile = fs.promises.readFile;

const challenge_timeout = 60000;
const port = 3000;

const users = new Map();
let num_users = 0;

class ErrorWithStatus extends Error {
    constructor(message : string, public statusCode : number) {
        super(message);
    }
}

async function register(fastify, options) {
    const {
        webAuthn,
        make_secret_session_data,
        verify_secret_session_data
    } = options;

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
        const { options, sessionData } = await webAuthn.beginRegistration(
            user,
            cco => {
                cco.excludeCredentials = user.credentials.map(c => ({
                    type: 'public-key',
                    id: c.ID
                }));
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
            request.params.username, 'registration', request.body);
        let credential;
        try {
            credential = await webAuthn.finishRegistration(
                user, session_data, request.body);
        } catch (ex) {
            ex.statusCode = 400;
            throw ex;
        }
        user.credentials.push(credential);
        reply.code(204);
    });
}

async function login(fastify, options) {
    const {
        webAuthn,
        make_secret_session_data,
        verify_secret_session_data
    } = options;

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
            request.params.username, 'login', request.body);
        let credential;
        try {
            credential = await webAuthn.finishLogin(
                user, session_data, request.body);
        } catch (ex) {
            ex.statusCode = 400;
            throw ex;
        }
        if (credential.Authenticator.CloneWarning) {
            throw new ErrorWithStatus('credential appears to be cloned', 403);
        }
        const user_cred = user.credentials.find(c => c.ID === credential.ID);
        user_cred.Authenticator.SignCount = credential.Authenticator.SignCount;
        reply.code(204);
    });
}

    const fastify = mod_fastify({
        logger: true,
        https: {
            key: await readFile(path.join(__dirname, 'keys', 'server.key')),
            cert: await readFile(path.join(__dirname, 'keys', 'server.crt'))
        }
    });

    fastify.register(fastify_static, {
        root: path.join(__dirname, 'fixtures'),
        index: ['example.html']
    });

    const webAuthn = await makeWebAuthn({
        RPDisplayName: 'WebAuthnJS',
        RPID: 'localhost',
        RPOrigin: `https://localhost:${port}`,
        RPIcon: 'https://webauthnjs.example.com/logo.png',
        AuthenticatorSelection: {
            userVerification: 'preferred'
        }
    });

    const sodium = await sodium_plus.SodiumPlus.auto();
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

    async function verify_secret_session_data(expected_username, expected_type, obj) {
        try {
            const secret_session_data = obj.session_data;
            delete obj.session_data;
            const [ username, type, session_data, timestamp ] = JSON.parse(
                (await sodium.crypto_secretbox_open(
                    Buffer.from(secret_session_data.ciphertext, 'base64'),
                    Buffer.from(secret_session_data.nonce, 'base64'),
                    session_data_key)).toString());
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

    const options = {
        webAuthn,
        make_secret_session_data,
        verify_secret_session_data
    };

    fastify.register(register, Object.assign({
        prefix: '/register/'
    }, options));

    fastify.register(login, Object.assign({
        prefix: '/login/'
    }, options));

    await fastify.listen(port);

    console.log(`Please visit https://localhost:${port}`);

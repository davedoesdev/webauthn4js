/*eslint-env node */

import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mod_fastify from 'fastify';
import fastify_static from '@fastify/static';
import { make_secret_session_data, verify_secret_session_data } from './session.mjs';
import * as schemas from './schemas.mjs';
import makeWebAuthn from '../../index.js';
const readFile = fs.promises.readFile;

const port = 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));

const users = new Map();

class ErrorWithStatus extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

const keys_dir = join(__dirname, '..', 'keys');

const fastify = mod_fastify({
    logger: true,
    https: {
        key: await readFile(join(keys_dir, 'server.key')),
        cert: await readFile(join(keys_dir, 'server.crt'))
    }
});

fastify.register(fastify_static, {
    root: join(__dirname, '..', 'fixtures'),
    index: 'example.html'
});

const webAuthn = await makeWebAuthn({
    RPDisplayName: 'WebAuthnJS',
    RPID: 'localhost',
    RPOrigins: [`https://localhost:${port}`],
    AuthenticatorSelection: {
        userVerification: 'preferred'
    }
});

async function register(fastify) {
    fastify.get('/:username', {
        schema: schemas.register.get
    }, async request => {
        let user = users.get(request.params.username);
        if (!user) {
            user = {
                id: `user${users.size}`,
                name: request.params.username,
                displayName: request.params.username.split('@')[0],
                iconURL: '',
                credentials: []
            };
            users.set(request.params.username, user);
        }
        const excludeCredentials = user.credentials.map(c => ({
            type: 'public-key',
            id: c.id
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

    fastify.put('/:username', {
        schema: schemas.register.put
    }, async (request, reply) => {
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
        for (const u of users.values()) {
            if (u.credentials.find(c => c.id === credential.id)) {
                throw new ErrorWithStatus('credential in use', 409);
            }
        }
        user.credentials.push(credential);
        reply.code(204);
    });
}

async function login(fastify) {
    fastify.get('/:username', {
        schema: schemas.login.get
    }, async request => {
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

    fastify.post('/:username', {
        schema: schemas.login.post
    }, async (request, reply) => {
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
        if (credential.authenticator.cloneWarning) {
            throw new ErrorWithStatus('credential appears to be cloned', 403);
        }
        const user_cred = user.credentials.find(c => c.id === credential.id);
        if (!user_cred) {
            // Should have been checked already in Go by webAuthn.finishLogin
            throw new ErrorWithStatus('no credential', 500);
        }
        user_cred.authenticator.signCount = credential.authenticator.signCount;
        reply.code(204);
    });
}

fastify.register(register, {
    prefix: '/register/'
});

fastify.register(login, {
    prefix: '/login/'
});

await fastify.listen({ port });

console.log(`Please visit https://localhost:${port}`);

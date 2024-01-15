/*eslint-env node */

import * as fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mod_fastify, {  FastifyPluginAsync } from 'fastify';
import fastify_static from '@fastify/static';
import * as schemas from '../test/example/schemas.mjs';
import {
    ISecretSessionData,
    make_secret_session_data,
    verify_secret_session_data
} from '../test/example/session.mjs';
import makeWebAuthn from '../index.js';
import {
    User,
    Credential,
    CredentialCreationResponse,
    CredentialAssertionResponse,
    CredentialDescriptor
} from './webauthn';
const readFile = fs.promises.readFile;

const port = 3000;

const __dirname = dirname(fileURLToPath(import.meta.url));

const users = new Map<string, User>();

class ErrorWithStatus extends Error {
    constructor(message : string, public statusCode : number) {
        super(message);
    }
}

const test_dir = join(__dirname, '..', 'test');
const keys_dir = join(test_dir, 'keys');

const fastify = mod_fastify({
    logger: true,
    https: {
        key: await readFile(join(keys_dir, 'server.key')),
        cert: await readFile(join(keys_dir, 'server.crt'))
    }
});

fastify.register(fastify_static, {
    root: join(test_dir, 'fixtures'),
    index: ['example.html']
});

const webAuthn = await makeWebAuthn({
    RPDisplayName: 'WebAuthnJS',
    RPID: 'localhost',
    RPOrigins: [`https://localhost:${port}`],
    /*Timeouts: {
        Login: {
            Enforce: true,
            Timeout: 60 * 1000,
            TimeoutUVD: 60 * 1000
        },
        Registration: {
            Enforce: true,
            Timeout: 60 * 1000,
            TimeoutUVD: 60 * 1000
        }
    }*/
});

interface IUserRoute {
    Params: { username : string }
}

const register : FastifyPluginAsync = async function (fastify) {
    fastify.get<IUserRoute>('/:username', {
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
        const excludeCredentials = user.credentials.map((c) : CredentialDescriptor => ({
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

    interface ICreateRoute extends IUserRoute {
        Body: {
            ccr : CredentialCreationResponse,
            session_data : ISecretSessionData
        }
    }

    fastify.put<ICreateRoute>('/:username', {
        schema: schemas.register.put
    }, async (request, reply) => {
        const user = users.get(request.params.username);
        if (!user) {
            throw new ErrorWithStatus('no user', 404);
        }
        const session_data = await verify_secret_session_data(
            request.params.username, 'registration', request.body.session_data);
        let credential : Credential;
        try {
            credential = await webAuthn.finishRegistration(
                user, session_data, request.body.ccr);
        } catch (ex : any) { // eslint-disable-line @typescript-eslint/no-explicit-any
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

const login : FastifyPluginAsync = async function (fastify) {
    fastify.get<IUserRoute>('/:username', {
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

    interface IAssertRoute extends IUserRoute {
        Body: {
            car : CredentialAssertionResponse,
            session_data : ISecretSessionData
        }
    }

    fastify.post<IAssertRoute>('/:username', {
        schema: schemas.login.post
    }, async (request, reply) => {
        const user = users.get(request.params.username);
        if (!user) {
            throw new ErrorWithStatus('no user', 404);
        }
        const session_data = await verify_secret_session_data(
            request.params.username, 'login', request.body.session_data);
        let credential : Credential;
        try {
            credential = await webAuthn.finishLogin(
                user, session_data, request.body.car);
        } catch (ex : any) { // eslint-disable-line @typescript-eslint/no-explicit-any
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

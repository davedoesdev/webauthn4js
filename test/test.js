const { join } = require('path');
const { readFile } = require('fs').promises;
const mod_fastify = require('fastify');
const fastify_static = require('fastify-static');
const { SodiumPlus } = require('sodium-plus');
const makeWebAuthn = require('..');
const { expect } = require('chai');

const challenge_timeout = 60000;
const port = 3000;
const origin = `https://localhost:${port}`;
const username = 'foo@bar.com';

class ErrorWithStatus extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

const users = new Map();
let num_users = 0;

before(async function () {
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
        prefix: '/test'
    });

    const webAuthn = await makeWebAuthn({
        RPDisplayName: 'WebAuthnJS',
        RPID: 'localhost',
        RPOrigin: origin,
        RPIcon: `${origin}/test/logo.png`,
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

    browser.config.after.push(async function () {
        await fastify.close();
        webAuthn.exit();
    });

    await browser.url(`${origin}/test/test.html`);
});

async function executeAsync(f, ...args) {
    const r = await browser.executeAsync(function (f, ...args) {
        (async function () {
            let done = args[args.length - 1];
            function bufferDecode(value) {
                return Uint8Array.from(atob(value), c => c.charCodeAt(0));
            }
            function bufferEncode(value) {
                return btoa(String.fromCharCode.apply(null, new Uint8Array(value)))
                    .replace(/\+/g, "-")
                    .replace(/\//g, "_")
                    .replace(/=/g, "");
            }
            try {
                done(await eval(f)(...args.slice(0, -1)));
            } catch (ex) {
                done({ error: ex.message });
            }
        })();
    }, f.toString(), ...args);

    if (r && r.error) {
        throw new Error(r.error);
    }

    return r;
}

let cred_id;
let cred_pubkey;

async function register(username) {
    return await executeAsync(async username => {
        const get_response = await fetch(`/register/${username}`);
        if (!get_response.ok) {
            throw new Error(`Registration GET failed with ${get_response.status}`);
        }
        const { options, session_data } = await get_response.json();
        const { publicKey } = options;
        publicKey.challenge = bufferDecode(publicKey.challenge);
        publicKey.user.id = bufferDecode(publicKey.user.id);
        if (publicKey.excludeCredentials) {
            for (const c of publicKey.excludeCredentials) {
                c.id = bufferDecode(c.id);
            }
        }
        const credential = await navigator.credentials.create(options);
        const { id, rawId, type, response: cred_response } = credential;
        const { attestationObject, clientDataJSON } = cred_response;
        const put_response = await fetch(`/register/${username}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ccr: {
                    id,
                    rawId: bufferEncode(rawId),
                    type,
                    response: {
                        attestationObject: bufferEncode(attestationObject),
                        clientDataJSON: bufferEncode(clientDataJSON)
                    }
                },
                session_data
            })
        });
        if (!put_response.ok) {
            throw new Error(`Registration PUT failed with ${put_response.status}`);
        }
        return { id, type };
    }, username);
}

describe('register', function () {
    it('should register credential', async function () {
        const { id, type } = await register(username);

        expect(num_users).to.equal(1);

        expect(type).to.equal('public-key');

        const user = users.get(username);

        expect(user.id).to.equal('user0');
        expect(user.name).to.equal(username);
        expect(user.displayName).to.equal('foo');
        expect(user.iconURL).to.equal('');

        expect(user.credentials.length).to.equal(1);

        const cred = user.credentials[0];
        // ID returned from credentials.create is b64url encoded
        // ID from Go is b64 encoded
        expect(cred.ID.replace(/\+/g, "-")
                      .replace(/\//g, "_")
                      .replace(/=/g, "")).to.equal(id);
        expect(cred.AttestationType).to.equal('none');
        expect(cred.Authenticator.SignCount).to.equal(0);
        expect(cred.Authenticator.CloneWarning).to.be.false;

        cred_id = id;
        cred_pubkey = cred.PublicKey;
    });

    // register again

    // clone warning - different user

    // login

    // can we use a different authenticator in test mode?

});

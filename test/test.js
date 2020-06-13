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
const username2 = 'foo2@bar.com';

class ErrorWithStatus extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

function b64url(b64) {
    return b64.replace(/\+/g, "-")
              .replace(/\//g, "_")
              .replace(/=/g, "");
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
                if (request.params.username === username2) {
                    user.id = Buffer.from(user.id);
                }
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
            for (const u of users.values()) {
                if (u.credentials.find(c => c.ID === credential.ID)) {
                    throw new ErrorWithStatus('credential in use', 409);
                }
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
                throw new ErrorWithStatus('credential appears to be cloned', 403);
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

        // Check Go exit isn't called twice by our beforeExit handler
        const handlers = process.listeners('beforeExit');
        handlers[handlers.length - 1]();
    });

    await browser.url(`${origin}/test/test.html`);
});

/* istanbul ignore next */
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
                done({ err: ex.message });
            }
        })();
    }, f.toString(), ...args);

    if (r && r.err) {
        throw new Error(r.err);
    }

    return r;
}

/* istanbul ignore next */
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
        const put_request =  {
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
        };
        const put_response = await fetch(`/register/${username}`, put_request);
        if (!put_response.ok) {
            throw new Error(`Registration PUT failed with ${put_response.status}`);
        }
        window.last_put_request = put_request;
        return { id, type };
    }, username);
}

/* istanbul ignore next */
async function login(username) {
    return await executeAsync(async username => {
        const get_response = await fetch(`/login/${username}`);
        if (!get_response.ok) {
            throw new Error(`Login GET failed with ${get_response.status}`);
        }
        const { options, session_data } = await get_response.json();
        const { publicKey } = options;
        publicKey.challenge = bufferDecode(publicKey.challenge);
        for (const c of publicKey.allowCredentials) {
            c.id = bufferDecode(c.id);
        }
        const assertion = await navigator.credentials.get(options);
        const { id, rawId, type, response: assertion_response } = assertion;
        const { authenticatorData, clientDataJSON, signature, userHandle } = assertion_response;
        const post_request = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                car: {
                    id,
                    rawId: bufferEncode(rawId),
                    type,
                    response: {
                        authenticatorData: bufferEncode(authenticatorData),
                        clientDataJSON: bufferEncode(clientDataJSON),
                        signature: bufferEncode(signature),
                        userHandle: bufferEncode(userHandle)
                    }
                },
                session_data
            })
        };
        const post_response = await fetch(`/login/${username}`, post_request);
        if (!post_response.ok) {
            throw new Error(`Login POST failed with ${post_response.status}`);
        }
        window.last_post_request = post_request;
        return { id, type }; 
    }, username);
}

let cred_id;
let cred_pubkey;

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
        // id returned from credentials.create is b64url encoded
        // ID from Go is b64 encoded
        expect(b64url(cred.ID)).to.equal(id);
        expect(cred.AttestationType).to.equal('none');
        expect(cred.Authenticator.SignCount).to.equal(0);
        expect(cred.Authenticator.CloneWarning).to.be.false;

        cred_id = id;
        cred_pubkey = cred.PublicKey;
    });

    it('should fail to use same credential', async function () {
        let ex;
        try {
            await register(username);
        } catch (e) {
            ex = e;
        }
        expect(ex.message).to.equal('An attempt was made to use an object that is not, or is no longer, usable');
    });

    it('should register second user', async function () {
        const { id, type } = await register(username2);

        expect(num_users).to.equal(2);

        expect(type).to.equal('public-key');

        const user = users.get(username);

        expect(user.id).to.equal('user0');
        expect(user.name).to.equal(username);
        expect(user.displayName).to.equal('foo');
        expect(user.iconURL).to.equal('');

        expect(user.credentials.length).to.equal(1);

        const cred = user.credentials[0];
        expect(b64url(cred.ID)).to.equal(cred_id);
        expect(cred.AttestationType).to.equal('none');
        expect(cred.Authenticator.SignCount).to.equal(0);
        expect(cred.Authenticator.CloneWarning).to.be.false;
        expect(cred.PublicKey).to.equal(cred_pubkey);

        const user2 = users.get(username2);

        expect(user2.id.toString()).to.equal('user1');
        expect(user2.name).to.equal(username2);
        expect(user2.displayName).to.equal('foo2');
        expect(user2.iconURL).to.equal('');

        expect(user2.credentials.length).to.equal(1);

        const cred2 = user2.credentials[0];
        expect(b64url(cred2.ID)).to.equal(id);
        expect(cred2.AttestationType).to.equal('none');
        expect(cred2.Authenticator.SignCount).to.equal(0);
        expect(cred2.Authenticator.CloneWarning).to.be.false;
        expect(b64url(cred2.ID)).not.to.equal(cred_id);
        expect(cred2.PublicKey).not.to.equal(cred_pubkey);
    });

    it('should fail to register with duplicate attestation', async function () {
        let ex;
        try {
            /* istanbul ignore next */
            await executeAsync(async username => {
                const put_response = await fetch(`/register/${username}`, last_put_request);
                if (!put_response.ok) {
                    throw new Error(`Registration PUT failed with ${put_response.status}`);
                }
            }, username2);
        } catch (e) {
            ex = e;
        }
        expect(ex.message).to.equal('Registration PUT failed with 409');
    });
});

describe('login', function () {
    it('should login', async function () {
        const { id, type } = await login(username);

        expect(num_users).to.equal(2);

        expect(type).to.equal('public-key');

        const user = users.get(username);

        expect(user.id).to.equal('user0');
        expect(user.name).to.equal(username);
        expect(user.displayName).to.equal('foo');
        expect(user.iconURL).to.equal('');

        expect(user.credentials.length).to.equal(1);

        const cred = user.credentials[0];
        expect(b64url(cred.ID)).to.equal(id);
        expect(cred.AttestationType).to.equal('none');
        expect(cred.Authenticator.SignCount).to.equal(1);
        expect(cred.Authenticator.CloneWarning).to.be.false;
    });

    it('should fail to register with duplicate assertion', async function () {
        let ex;
        try {
            /* istanbul ignore next */
            await executeAsync(async username => {
                const post_response = await fetch(`/login/${username}`, last_post_request);
                if (!post_response.ok) {
                    throw new Error(`Login POST failed with ${post_response.status}`);
                }
            }, username);
        } catch (e) {
            ex = e;
        }
        expect(ex.message).to.equal('Login POST failed with 403');
    });


    // clone warning - replay

    // login
    // fail to login unknown user
    // login second user?


    // how can we get Go logs?
});

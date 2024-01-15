/* eslint-env node, mocha, browser */
/* global browser,
          bufferEncode,
          bufferDecode,
          last_post_request,
          last_put_request */

const { join } = require('path');
const { readFile } = require('fs').promises;
const mod_fastify = require('fastify');
const fastify_static = require('@fastify/static');
const makeWebAuthn = require('..');
let expect;
const crypto = require('crypto');
const { promisify } = require('util');

const port = 3000;
const origin = `https://localhost:${port}`;
const username = 'foo@bar.com';
const username2 = 'foo2@bar.com';
const username3 = 'foo3@bar.com';

const config = {
    RPDisplayName: 'WebAuthnJS',
    RPID: 'localhost',
    RPOrigins: [origin],
    AuthenticatorSelection: {
        userVerification: 'preferred'
    }
};

class ErrorWithStatus extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

function b64url(b64) {
    return b64
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}

const users = new Map();

before(async function () {
    ({ expect } = await import('chai'));

    const keys_dir = join(__dirname, 'keys');

    const fastify = mod_fastify({
        logger: true,
        https: {
            key: await readFile(join(keys_dir, 'server.key')),
            cert: await readFile(join(keys_dir, 'server.crt'))
        },
        forceCloseConnections: true
    });

    fastify.register(fastify_static, {
        root: join(__dirname, 'fixtures'),
        prefix: '/test'
    });

    const webAuthn = await makeWebAuthn(config);

    const {
        make_secret_session_data,
        verify_secret_session_data
    } = await import('./example/session.mjs');

    const schemas = await import('./example/schemas.mjs');

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
                if (request.params.username === username2) {
                    user.id = Buffer.from(user.id);
                }
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
            /* istanbul ignore if */
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

    browser.options.after.push(async function () {
        await fastify.close();

        await promisify(cb => {
            webAuthn.on('exit', n => {
                expect(n).to.equal(0);
                cb();
            });
            webAuthn.exit();
        })();
    });

    await browser.addVirtualAuthenticator('ctap2_1', 'usb');

    await browser.url(`${origin}/test/test.html`);
});

/* istanbul ignore next */
async function executeAsync(f, ...args) {
    const r = await browser.executeAsync(function (f, ...args) {
        (async function () {
            let done = args[args.length - 1];
            window.bufferDecode = function (value) {
                return Uint8Array.from(atob(value
                    .replace(/-/g, "+")
                    .replace(/_/g, "/")), c => c.charCodeAt(0));
            };
            window.bufferEncode = function (value) {
                return btoa(String.fromCharCode.apply(null, new Uint8Array(value)))
                    .replace(/\+/g, "-")
                    .replace(/\//g, "_")
                    .replace(/=/g, "");
            };
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
async function register(username, opts) {
    return await executeAsync(async (username, opts) => {
        opts = Object.assign({
            alter_challenge: false
        }, opts);
        const get_response = await fetch(`/register/${username}`);
        if (!get_response.ok) {
            throw new Error(`Registration GET failed with ${get_response.status} ${await get_response.text()}`);
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
        if (opts.alter_challenge) {
            publicKey.challenge[0] ^= 0xff;
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
            throw new Error(`Registration PUT failed with ${put_response.status} ${await put_response.text()}`);
        }
        window.last_put_request = put_request;
        return { id, type };
    }, username, opts);
}

/* istanbul ignore next */
async function login(username, opts) {
    return await executeAsync(async (username, opts) => {
        opts = Object.assign({
            post_username: username,
            session_username: username
        }, opts);
        const get_response = await fetch(`/login/${username}`);
        if (!get_response.ok) {
            throw new Error(`Login GET failed with ${get_response.status} ${await get_response.text()}`);
        }
        let { options, session_data } = await get_response.json();
        const { publicKey } = options;
        publicKey.challenge = bufferDecode(publicKey.challenge);
        for (const c of publicKey.allowCredentials) {
            c.id = bufferDecode(c.id);
        }
        const assertion = await navigator.credentials.get(options);
        const { id, rawId, type, response: assertion_response } = assertion;
        const { authenticatorData, clientDataJSON, signature, userHandle } = assertion_response;
        if (opts.session_username !== username) {
            const get_response = await fetch(`/login/${opts.session_username}`);
            if (!get_response.ok) {
                throw new Error(`Login GET failed with ${get_response.status} ${await get_response.text()}`);
            }
            ({ session_data } = await get_response.json());
        }
        if (opts.modify_sig) {
            const sigview = new Uint8Array(signature);
            for (let i = 0; i < sigview.length; ++i) {
                sigview[i] ^= 1;
            }
        }
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
        const post_response = await fetch(`/login/${opts.post_username}`, post_request);
        if (!post_response.ok) {
            throw new Error(`Login POST failed with ${post_response.status} ${await post_response.text()}`);
        }
        window.last_post_request = post_request;
        return { id, type }; 
    }, username, opts);
}

let cred_id;
let cred_pubkey;

describe('register', function () {
    it('should register credential', async function () {
        const { id, type } = await register(username);

        expect(users.size).to.equal(1);

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
        expect(b64url(cred.id)).to.equal(id);
        expect(cred.attestationType).to.equal('none');
        expect(cred.authenticator.signCount).to.equal(1);
        expect(cred.authenticator.cloneWarning).to.be.false;

        cred_id = id;
        cred_pubkey = cred.publicKey;
    });

    it('should fail to use same credential', async function () {
        let ex;
        try {
            await register(username);
        } catch (e) {
            ex = e;
        }
        expect(ex.message).to.equal('The user attempted to register an authenticator that contains one of the credentials already registered with the relying party.');
    });

    it('should register second user', async function () {
        const { id, type } = await register(username2);

        expect(users.size).to.equal(2);

        expect(type).to.equal('public-key');

        const user = users.get(username);

        expect(user.id).to.equal('user0');
        expect(user.name).to.equal(username);
        expect(user.displayName).to.equal('foo');
        expect(user.iconURL).to.equal('');

        expect(user.credentials.length).to.equal(1);

        const cred = user.credentials[0];
        expect(b64url(cred.id)).to.equal(cred_id);
        expect(cred.attestationType).to.equal('none');
        expect(cred.authenticator.signCount).to.equal(1);
        expect(cred.authenticator.cloneWarning).to.be.false;
        expect(cred.publicKey).to.equal(cred_pubkey);

        const user2 = users.get(username2);

        expect(user2.id.toString()).to.equal('user1');
        expect(user2.name).to.equal(username2);
        expect(user2.displayName).to.equal('foo2');
        expect(user2.iconURL).to.equal('');

        expect(user2.credentials.length).to.equal(1);

        const cred2 = user2.credentials[0];
        expect(b64url(cred2.id)).to.equal(id);
        expect(cred2.attestationType).to.equal('none');
        expect(cred2.authenticator.signCount).to.equal(1);
        expect(cred2.authenticator.cloneWarning).to.be.false;
        expect(b64url(cred2.id)).not.to.equal(cred_id);
        expect(cred2.publicKey).not.to.equal(cred_pubkey);
    });

    it('should fail to register with duplicate attestation', async function () {
        let ex;
        try {
            /* istanbul ignore next */
            await executeAsync(async username => {
                const put_response = await fetch(`/register/${username}`, last_put_request);
                if (!put_response.ok) {
                    throw new Error(`Registration PUT failed with ${put_response.status} ${await put_response.text()}`);
                }
            }, username2);
        } catch (e) {
            ex = e;
        }
        expect(ex.message).to.equal('Registration PUT failed with 409 {"statusCode":409,"error":"Conflict","message":"credential in use"}');
    });

    it('should fail to register with wrong challenge', async function () {
        let ex;
        try {
            await register(username3, { alter_challenge: true });
        } catch (e) {
            ex = e;
        }
        expect(ex.message).to.equal('Registration PUT failed with 400 {"statusCode":400,"error":"Bad Request","message":"Error validating challenge"}');
    });
});

describe('login', function () {
    it('should login', async function () {
        const { id, type } = await login(username);

        // username3 although not registered is still in the DB
        expect(users.size).to.equal(3);

        expect(type).to.equal('public-key');

        const user = users.get(username);

        expect(user.id).to.equal('user0');
        expect(user.name).to.equal(username);
        expect(user.displayName).to.equal('foo');
        expect(user.iconURL).to.equal('');

        expect(user.credentials.length).to.equal(1);

        const cred = user.credentials[0];
        expect(b64url(cred.id)).to.equal(id);
        expect(cred.attestationType).to.equal('none');
        expect(cred.authenticator.signCount).to.equal(2);
        expect(cred.authenticator.cloneWarning).to.be.false;
    });

    it('should fail to login with duplicate assertion', async function () {
        let ex;
        try {
            /* istanbul ignore next */
            await executeAsync(async username => {
                const post_response = await fetch(`/login/${username}`, last_post_request);
                if (!post_response.ok) {
                    throw new Error(`Login POST failed with ${post_response.status} ${await post_response.text()}`);
                }
            }, username);
        } catch (e) {
            ex = e;
        }
        expect(ex.message).to.equal('Login POST failed with 403 {"statusCode":403,"error":"Forbidden","message":"credential appears to be cloned"}');
    });

    it('should fail to login as different user', async function () {
        let ex;
        try {
            await login(username, {
                post_username: username2,
                session_username: username2
            });
        } catch (e) {
            ex = e;
        }
        expect(ex.message).to.equal('Login POST failed with 400 {"statusCode":400,"error":"Bad Request","message":"User does not own the credential returned"}');
    });

    it('should check username in session', async function () {
        let ex;
        try {
            await login(username, { post_username: username2 });
        } catch (e) {
            ex = e;
        }
        expect(ex.message).to.equal('Login POST failed with 400 {"statusCode":400,"error":"Bad Request","message":"wrong username"}');
    });

    it('should check session type', async function () {
        let ex;
        try {
            /* istanbul ignore next */
            await executeAsync(async username => {
                const get_response = await fetch(`/register/${username}`);
                if (!get_response.ok) {
                    throw new Error(`Registration GET failed with ${get_response.status} ${await get_response.text()}`);
                }
                const { session_data } = await get_response.json();
                const request = Object.assign({}, last_post_request);
                const body = JSON.parse(request.body);
                body.session_data = session_data;
                request.body = JSON.stringify(body);
                const post_response = await fetch(`/login/${username}`, request);
                if (!post_response.ok) {
                    throw new Error(`Login POST failed with ${post_response.status} ${await post_response.text()}`);
                }
            }, username);
        } catch (e) {
            ex = e;
        }
        expect(ex.message).to.equal('Login POST failed with 400 {"statusCode":400,"error":"Bad Request","message":"wrong type"}');
    });

    it('should check user exists', async function () {
        let ex;
        try {
            /* istanbul ignore next */
            await executeAsync(async username => {
                const put_response = await fetch(`/register/${username}`, last_put_request);
                if (!put_response.ok) {
                    throw new Error(`Registration PUT failed with ${put_response.status} ${await put_response.text()}`);
                }
            }, 'bar@foo.com');
        } catch (e) {
            ex = e;
        }
        expect(ex.message).to.equal('Registration PUT failed with 404 {"statusCode":404,"error":"Not Found","message":"no user"}');

        try {
            /* istanbul ignore next */
            await executeAsync(async username => {
                const get_response = await fetch(`/login/${username}`);
                if (!get_response.ok) {
                    throw new Error(`Login GET failed with ${get_response.status} ${await get_response.text()}`);
                }
            }, 'bar@foo.com');
        } catch (e) {
            ex = e;
        }
        expect(ex.message).to.equal('Login GET failed with 404 {"statusCode":404,"error":"Not Found","message":"no user"}');

        try {
            /* istanbul ignore next */
            await executeAsync(async username => {
                const post_response = await fetch(`/login/${username}`, last_post_request);
                if (!post_response.ok) {
                    throw new Error(`Login POST failed with ${post_response.status} ${await post_response.text()}`);
                }
            }, 'bar@foo.com');
        } catch (e) {
            ex = e;
        }
        expect(ex.message).to.equal('Login POST failed with 404 {"statusCode":404,"error":"Not Found","message":"no user"}');
    });

    it('should check timestamp', async function () {
        let ex;
        const orig_now = Date.now;
        Date.now = function (dummy) {
            let now = orig_now.call(this);
            if (dummy === 'dummy') {
                now += 60000;
            }
            return now;
        };
        try {
            /* istanbul ignore next */
            await executeAsync(async username => {
                const get_response = await fetch(`/login/${username}`);
                if (!get_response.ok) {
                    throw new Error(`Login GET failed with ${get_response.status} ${await get_response.text()}`);
                }
                const { session_data } = await get_response.json();
                const request = Object.assign({}, last_post_request);
                const body = JSON.parse(request.body);
                body.session_data = session_data;
                request.body = JSON.stringify(body);
                const post_response = await fetch(`/login/${username}`, request);
                if (!post_response.ok) {
                    throw new Error(`Login POST failed with ${post_response.status} ${await post_response.text()}`);
                }
            }, username);
        } catch (e) {
            ex = e;
        } finally {
            Date.now = orig_now;
        }
        expect(ex.message).to.equal('Login POST failed with 400 {"statusCode":400,"error":"Bad Request","message":"session timed out"}');
    });

    it('should login second user', async function () {
        const { id, type } = await login(username2);

        // username3 although not registered is still in the DB
        expect(users.size).to.equal(3);

        expect(type).to.equal('public-key');

        const user = users.get(username2);

        expect(user.id.toString()).to.equal('user1');
        expect(user.name).to.equal(username2);
        expect(user.displayName).to.equal('foo2');
        expect(user.iconURL).to.equal('');

        expect(user.credentials.length).to.equal(1);

        const cred = user.credentials[0];
        expect(b64url(cred.id)).to.equal(id);
        expect(cred.attestationType).to.equal('none');
        expect(cred.authenticator.signCount).to.equal(2);
        expect(cred.authenticator.cloneWarning).to.be.false;
    });

    it('should fail to login third user', async function () {
        let ex;
        try {
            await login(username3);
        } catch (e) {
            ex = e;
        }
        expect(ex.message).to.equal('Login GET failed with 500 {"statusCode":500,"error":"Internal Server Error","message":"Found no credentials for user"}');
    });

    it('should fail to verify bad signature', async function () {
        let ex;
        try {
            await login(username, { modify_sig: true });
        } catch (e) {
            ex = e;
        }
        expect(ex.message).to.equal('Login POST failed with 400 {"statusCode":400,"error":"Bad Request","message":"Error validating the assertion signature: Signature invalid or not provided"}');
        await login(username);
    });
});

describe('init', function () {
    it('should error with invalid config', async function () {
        let ex;
        try {
            await makeWebAuthn({});
        } catch (e) {
            ex = e;
        }
        expect(ex.message).to.equal("error occurred validating the configuration: the field 'RPDisplayName' must be configured but it is empty");
        // Note: also tests exit without webauthn being made
    });

    it('should error if it fails to generate random bytes', async function () {
        let ex;
        const orig_randomBytes = crypto.randomBytes;
        crypto.randomBytes = (n, cb) => cb(new Error('dummy'));
        try {
            await makeWebAuthn({});
        } catch (e) {
            ex = e;
        } finally {
            crypto.randomBytes = orig_randomBytes;
        }
        expect(ex.message).to.equal('dummy');
    });

    it('should emit exit event', async function () {
        const webAuthn = await makeWebAuthn(config);
        await promisify(cb => {
            webAuthn.on('exit', n => {
                expect(n).to.equal(0);
                cb();
            });
            webAuthn.exit();
        })();
    });

    it('should pass through exit code', async function () {
        const webAuthn = await makeWebAuthn(config);
        await promisify(cb => {
            webAuthn.on('error', err => {
                expect(err.message).to.equal('wasm_exec exit with code 123');
            });
            webAuthn.on('exit', n => {
                expect(n).to.equal(123);
                cb();
            });
            webAuthn.exit(123);
        })();
    });

    it('should catch errors instantiating wasm', async function () {
        const Mod = require('module');
        const req = Mod.prototype.require;
        Mod.prototype.require = function (f) {
            const r = req.call(this, f);
            if (f === './wasm_exec.js') {
                return (...args) => {
                    r(...args);
                    throw new Error('dummy');
                };
            }
            return r;
        };
        let ex;
        try {
            await makeWebAuthn(config);
        } catch (e) {
            ex = e;
        } finally {
            Mod.prototype.require = req;
        }
        expect(ex.message).to.equal('dummy');
    });

    it('should exit on beforeExit', async function () {
        // should be two handlers:
        // - async-exit-hook
        // - one for webAuthn made in before()
        expect(process.listeners('beforeExit').length).to.equal(2);
        const webAuthn = await makeWebAuthn(config);
        expect(process.listeners('beforeExit').length).to.equal(3);
        await promisify(cb => {
            webAuthn.on('exit', n => {
                expect(n).to.equal(0);
                expect(process.listeners('beforeExit').length).to.equal(2);
                cb();
            });
            const h = process.listeners('beforeExit')[2];
            h();
            h(); // check Go exit isn't called twice
        })();
    });
});

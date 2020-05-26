'use strict';
const path = require('path');
const { EventEmitter } = require('events');
const { randomBytes } = require('crypto');
const { promisify } = require('util');

class WebAuthn4JS extends EventEmitter {
    constructor(methods) {
        super();
        this.methods = methods;
        this.beginRegistration = promisify(this._beginRegistration.bind(this));
        this.finishRegistration = promisify(this._finishRegistration.bind(this));
        this.beginLogin = promisify(this._beginLogin.bind(this));
        this.finishLogin = promisify(this._finishLogin.bind(this));
        // TODO: dedup the implementations below
    }

    _user(user) {
        user = Object.assign({}, user);
        if (!Buffer.isBuffer(user.id)) {
            user.id = Buffer.from(user.id);
        }
        user.id = user.id.toString('base64');
        return user;
    }

    _beginRegistration(user, ...args) {
        const cb = args[args.length - 1];
        try {
            const regOpts = args.slice(0, args.length - 1).map(f =>
                cco => JSON.stringify(f(JSON.parse(cco))));
            this.methods.beginRegistration(
                JSON.stringify(_user(user)),
                ...regOpts,
                (err, options, sessionData) => {
                    if (err) {
                        return process.nextTick(cb, err);
                    }
                    process.nextTick(cb, null, {
                        options: JSON.parse(options),
                        sessionData: JSON.parse(sessionData)
                    });
                });
        } catch (ex) {
            cb(ex);
        }
    }

    _finishRegistration(user, sessionData, response, cb) {
        try {
            this.methods.finishRegistration(
                JSON.stringify(_user(user)),
                JSON.stringify(sessionData),
                JSON.stringify(response),
                (err, credential) => {
                    if (err) {
                        return process.nextTick(cb, err);
                    }
                    process.nextTick(cb, null, JSON.parse(credential));
                });
        } catch (ex) {
            cb(ex);
        }
    }

    _beginLogin(user, ...args) {
        const cb = args[args.length - 1];
        try {
            const loginOpts = args.slice(0, args.length - 1).map(f =>
                cro => JSON.stringify(f(JSON.parse(cro))));
            this.methods.beginLogin(
                JSON.stringify(_user(user)),
                ...loginOpts,
                (err, options, sessionData) => {
                    if (err) {
                        return process.nextTick(cb, err);
                    }
                    process.nextTick(cb, null, {
                        options: JSON.parse(options),
                        sessionData: JSON.parse(sessionData)
                    });
                });
        } catch (ex) {
            cb(ex);
        }
    }

    _finishLogin(user, sessionData, response, cb) {
        try {
            this.methods.finishLogin(
                JSON.stringify(_user(user)),
                JSON.stringify(sessionData),
                JSON.stringify(response),
                (err, credential) => {
                    if (err) {
                        return process.nextTick(cb, err);
                    }
                    process.nextTick(cb, null, JSON.parse(credential));
                });
        } catch (ex) {
            cb(ex);
        }
    }
}

exports.make = promisify((config, cb) => {
    let called = false;
    let webauthn = null;

    function done(err, obj) {
        if (!called) {
            called = true;
            webauthn = obj;
            return cb(err, obj);
        }

        if (err) {
            if (!webauthn) {
                throw err;
            }
            webauthn.emit('error', err);
        }
    }

    randomBytes(64, (err, uid) => {
        if (err) {
            return done(err);
        }

        uid = uid.toString('hex');

        global[uid] = methods => {
            delete global[uid];
            process.on('beforeExit', () => methods.exit());
            methods.init(JSON.stringify(config), err => {
                if (err) {
                    return done(new Error(err));
                }
                done(null, new WebAuthn4JS(methods));
            });
        };

        try {
            require('./wasm_exec.js')({
                argv: [
                    process.argv[0],
                    'go_js_wasm_exec',
                    path.join(__dirname, 'webauthn4js.wasm'),
                    uid
                ],
                exit(n) {
                    if ((n !== 0) || !webauthn) {
                        return done(new Error(`wasm_exec exit with code ${n}`));
                    }
                    webauthn.emit('exit');
                },
                hrtime: process.hrtime.bind(process),
                on: process.on.bind(process)
            }, require.main);
        } catch (ex) {
            done(ex);
        }
    });
});

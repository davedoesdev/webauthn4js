/*eslint-env node */
'use strict';
const path = require('path');
const { EventEmitter } = require('events');
const { randomBytes } = require('crypto');
const { promisify } = require('util');

class WebAuthn4JS extends EventEmitter {
    constructor(methods) {
        super();
        this.methods = methods;
        this.beginRegistration = promisify(
            this._begin.bind(this, 'Registration'));
        this.finishRegistration = promisify(
            this._finish.bind(this, 'Registration'));
        this.beginLogin = promisify(
            this._begin.bind(this, 'Login'));
        this.finishLogin = promisify(
            this._finish.bind(this, 'Login'));

    }

    exit() {
        this.methods.checked_exit();
    }

    _user(user) {
        user = Object.assign({}, user);
        if (!Buffer.isBuffer(user.id)) {
            user.id = Buffer.from(user.id);
        }
        user.id = user.id.toString('base64');
        return user;
    }

    _begin(type, user, ...args) {
        const cb = args[args.length - 1];
        try {
            const opts = args.slice(0, args.length - 1).map(f =>
                cxo => JSON.stringify(f(JSON.parse(cxo))));
            this.methods[`begin${type}`](
                JSON.stringify(this._user(user)),
                ...opts,
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

    _finish(type, user, sessionData, response, cb) {
        try {
            this.methods[`finish${type}`](
                JSON.stringify(this._user(user)),
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

module.exports = promisify((config, cb) => {
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
            methods.exit_called = false;
            methods.checked_exit = function () {
                if (!this.exit_called) {
                    this.exit_called = true;
                    this.exit();
                }
            };
            process.on('beforeExit', () => methods.checked_exit());
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

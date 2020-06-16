/*eslint-env node */
'use strict';
const path = require('path');
const events = require('events');
const crypto = require('crypto');
const { promisify } = require('util');

function argify(f) {
    return promisify((...args) => {
        const cb = args[args.length - 1];
        f(...args.slice(0, args.length - 1), (err, ...r) => {
            if (err) {
                return cb(new Error(err));
            }
            cb(null, r);
        });
    });
}

class WebAuthn4JS extends events.EventEmitter {
    constructor(methods) {
        super();
        this.methods = methods;
        this.beginRegistration = this._begin.bind(this,
            argify(methods.beginRegistration.bind(methods)));
        this.finishRegistration = this._finish.bind(this,
            argify(methods.finishRegistration.bind(methods)));
        this.beginLogin = this._begin.bind(this,
            argify(methods.beginLogin.bind(methods)));
        this.finishLogin = this._finish.bind(this,
            argify(methods.finishLogin.bind(methods)));
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

    async _begin(method, user, ...args) {
        const [options, sessionData] = await method(
            JSON.stringify(this._user(user)),
            ...args.map(f => cxo => JSON.stringify(f(JSON.parse(cxo)))));
        return {
            options: JSON.parse(options),
            sessionData: JSON.parse(sessionData)
        };
    }

    async _finish(method, user, sessionData, response) {
        return JSON.parse(await method(
            JSON.stringify(this._user(user)),
            JSON.stringify(sessionData),
            JSON.stringify(response)));
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

    crypto.randomBytes(64, (err, uid) => {
        if (err) {
            return done(err);
        }

        uid = uid.toString('hex');

        let init_err;

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
                    init_err = new Error(err);
                    return process.nextTick(() => methods.checked_exit());
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
                    if (init_err) {
                        return done(init_err);
                    }
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

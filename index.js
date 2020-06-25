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
    init(methods, checked_exit) {
        this.methods = methods;
        this.checked_exit = checked_exit;
        this.beginRegistration = this._begin.bind(this,
            argify(methods.beginRegistration.bind(methods)));
        this.finishRegistration = this._finish.bind(this,
            argify(methods.finishRegistration.bind(methods)));
        this.beginLogin = this._begin.bind(this,
            argify(methods.beginLogin.bind(methods)));
        this.finishLogin = this._finish.bind(this,
            argify(methods.finishLogin.bind(methods)));
    }

    exit(n) {
        this.checked_exit(n);
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
    const webauthn = new WebAuthn4JS();

    function error(err) {
        if (webauthn.methods) {
            return webauthn.emit('error', err);
        }
        cb(err);
    }

    crypto.randomBytes(64, (err, uid) => {
        if (err) {
            return error(err);
        }

        uid = uid.toString('hex');

        let init_err;

        global[uid] = methods => {
            delete global[uid];

            let exit_called = false;
            function checked_exit(n) {
                if (!exit_called) {
                    exit_called = true;
                    methods.exit(n || 0);
                }
            }
            webauthn.on('exit', () => exit_called = true);
            process.on('beforeExit', () => checked_exit());

            methods.init(JSON.stringify(config), err => {
                if (err) {
                    init_err = new Error(err);
                    return process.nextTick(checked_exit);
                }
                webauthn.init(methods, checked_exit);
                cb(null, webauthn);
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
                        return error(init_err);
                    }
                    if ((n !== 0) || !webauthn.methods) {
                        error(new Error(`wasm_exec exit with code ${n}`));
                    }
                    webauthn.emit('exit', n);
                },
                hrtime: process.hrtime.bind(process),
                on: process.on.bind(process)
            }, require.main);
        } catch (ex) {
            error(ex);
        }
    });
});

module.exports.schemas = require('./schemas.json');

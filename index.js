/*eslint-env node */
'use strict';
const fs = require('fs');
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

    exit(code) {
        this.checked_exit(code);
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
            ...args.map(f => cxo => {
                const cxo2 = f(JSON.parse(cxo));
                if (cxo2 && cxo2.excludeCredentials) {
                    for (const c of cxo2.excludeCredentials) {
                        c.id = c.id
                            .replace(/\+/g, "-")
                            .replace(/\//g, "_")
                            .replace(/=/g, "");
                    }
                }
                return JSON.stringify(cxo2);
            }));
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

    (async () => {
        try {
            let init_err;
            const uid = (await promisify(crypto.randomBytes)(64)).toString('hex');
            const gt = {
                crypto: {
                    getRandomValues(b) {
                        crypto.randomFillSync(b);
                    }
                },
                performance: require('perf_hooks').performance,
                TextEncoder,
                TextDecoder,
                Uint8Array,
                Object,
                Array,
                [uid]: methods => {
                    delete global[uid];

                    let exit_called = false;
                    function checked_exit(n) {
                        if (!exit_called) {
                            exited();
                            methods.exit(n || 0);
                        }
                    }
                    function before_exit() {
                        checked_exit();
                    }
                    function exited() {
                        exit_called = true;
                        process.removeListener('beforeExit', before_exit);
                    }
                    webauthn.on('exit', exited);
                    process.on('beforeExit', before_exit);

                    methods.init(JSON.stringify(config), err => {
                        if (err) {
                            init_err = new Error(err);
                            return process.nextTick(checked_exit);
                        }
                        webauthn.init(methods, checked_exit);
                        cb(null, webauthn);
                    });
                }
            };

            const wasm_file = path.join(__dirname, 'webauthn4js.wasm');
            require('./wasm_exec.js')(gt);
            const go = new gt.Go();
            go.argv = [ wasm_file, uid ];
            go.exit = n => {
                if (init_err) {
                    return error(init_err);
                }
                if ((n !== 0) || !webauthn.methods) {
                    error(new Error(`wasm_exec exit with code ${n}`));
                }
                webauthn.emit('exit', n);
            };

            const data = await fs.promises.readFile(wasm_file);
            const result = await WebAssembly.instantiate(data, go.importObject);

            go.run(result.instance);
        } catch (ex) {
            error(ex);
        }
    })();
});

const schemas = require('./schemas/schemas.json');

function reviver(k, v) {
    if (v.$ref) {
        Object.assign(v, schemas.$defs[v.$ref]);
        delete v.$ref;
    }
    return v;
}

module.exports.schemas = JSON.parse(JSON.stringify(schemas), reviver);

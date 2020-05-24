'use strict';
const path = require('path');
const { EventEmitter } = require('events');
const { randomBytes } = require('crypto');
const { promisify } = require('util');

class WebAuthn4JS extends EventEmitter {
    constructor(methods) {
        super();
        this.methods = methods;

        // define _ methods below which call this.methods, with cb
        // then make async ones here
    }

    begin_registration
    finish_registration ? takes http request and calls create_credential
    create_credential

    begin_login
    finish_login ? takes http request and called validate_login
    validate_login


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

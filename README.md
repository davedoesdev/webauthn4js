This library handles [Web
Authentication](https://w3c.github.io/webauthn/) for Node.js
applications that wish to implement a passwordless solution for users.

It’s implemented as bindings to the [Go WebAuthn
library](https://github.com/go-webauthn/webauthn), which has been
compiled to Web Assembly. It was inspired by
[go-webauthn-js](https://github.com/pulsejet/go-webauthn-js) but uses
Go’s built-in Web Assembly compiler instead of GopherJS.

API documentation is available
[here](http://rawgit.davedoesdev.com/davedoesdev/webauthn4js/master/docs/index.html).

# Example

Here’s an example program which uses WebAuthn4JS to register and
authenticate users. It uses
[Fastify](https://github.com/fastify/fastify) to run a Web server with
handlers to allow users to register and login.

A [corresponding Web page](#browser) uses the Web Authentication browser
API to interact with the user’s authenticator, such as a FIDO2 token,
and then makes requests to the server.

The example is modelled after [this
example](https://github.com/hbolimovsky/webauthn-example) of the Go
WebAuthn library.

## Server-side

Users are stored in memory so have to re-register when the server is
restarted. In a real implementation, you’d store users in a database.

I’ll describe the example bit-by-bit below. You can also find it in
[test/example/example.mjs](test/example/example.mjs). Run it using:

``` bash
node test/example/example.mjs
```

### Setup

<div class="formalpara-title">

**example.mjs**

</div>

``` javascript
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mod_fastify from 'fastify';
import fastify_static from 'fastify-static';
import { make_secret_session_data, verify_secret_session_data } from './session.mjs';
import * as schemas from './schemas.mjs';
import makeWebAuthn from 'webauthn4js';
const readFile = fs.promises.readFile;
```

First the imports. Notice that \`\`webauthn4js\`\`\`'s default export is
a factory function which will let us make an object to handle Web
Authentication registration and login.

``` javascript
const port = 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));
```

Here we define the port number that the server will listen on and find
the directory on the filesystem that we’re running from.

``` javascript
const users = new Map();
```

The users are kept in memory, indexed by their username.

``` javascript
class ErrorWithStatus extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}
```

Fastify uses `statusCode` properties on thrown `Error` objects to return
HTTP status codes to the browser. This is just a convenience class.

``` javascript
const keys_dir = join(__dirname, '..', 'keys');

const fastify = mod_fastify({
    logger: true,
    https: {
        key: await readFile(join(keys_dir, 'server.key')),
        cert: await readFile(join(keys_dir, 'server.crt'))
    }
});

fastify.register(fastify_static, {
    root: join(__dirname, '..', 'fixtures'),
    index: 'example.html'
});
```

Here we configure Fastify to serve over HTTPS the [Web
page](#index.html) users will use to interact with their authenticators.

``` javascript
const webAuthn = await makeWebAuthn({
    RPDisplayName: 'WebAuthnJS',
    RPID: 'localhost',
    RPOrigins: [`https://localhost:${port}`],
    AuthenticatorSelection: {
        userVerification: 'preferred'
    }
});
```

Now we make our
[`WebAuthn4JS`](http://rawgit.davedoesdev.com/davedoesdev/webauthn4js/master/docs/interfaces/WebAuthn4JS.html)
object which will handle registration and login. Note this example
assumes it’s running on `localhost`.

### Registration

``` javascript
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
            users.set(request.params.username, user);
        }
```

We set up a GET handler to start the registration of a new credential
(public key) for a user. Note in this example we don’t verify user name
belongs to the requester. In a real application we might perform email
verification or generate unguessable user names, for example.

We generate a unique ID and maintain a list of credentials for each user
and store this information in the `users` `Map`.

``` javascript
        const excludeCredentials = user.credentials.map(c => ({
            type: 'public-key',
            id: c.id
        }));
```

This is a list of credentials that the user shouldn’t use for
registering with this server. We specify here that the browser shouldn’t
use any credential that the user has already registerd.

``` javascript
        const { options, sessionData } = await webAuthn.beginRegistration(
            user,
            cco => {
                cco.excludeCredentials = excludeCredentials;
                return cco;
            });
```

Now we begin registration, calling
[`beginRegistration`](http://rawgit.davedoesdev.com/davedoesdev/webauthn4js/master/docs/interfaces/WebAuthn4JS.html#beginRegistration)
and passing in the user and the excluded (existing) credentials.

``` javascript
        return {
            options,
            session_data: await make_secret_session_data(
                request.params.username, 'registration', sessionData)
        };
    });
```

Once registration has started, we need to return data to the browser so
it can ask the user to register using their authenticator. We return the
options that WebAuthn4JS generates for the browser’s
[`navigator.credentials.create()`](https://developer.mozilla.org/en-US/docs/Web/API/CredentialsContainer/create)
call, along with session data that WebAuthn4JS will check when the
browser makes its PUT request to complete registration. Note we sign and
encrypt this data to ensure it won’t be tampered with.

``` javascript
    fastify.put('/:username', {
        schema: schemas.register.put
    }, async (request, reply) => {
        const user = users.get(request.params.username);
        if (!user) {
            throw new ErrorWithStatus('no user', 404);
        }
```

We set up a PUT handler to complete a registration previously started
with a GET request for the same user. If the user doesn’t exist then
registration wasn’t started and a 404 error is returned.

``` javascript
        const session_data = await verify_secret_session_data(
            request.params.username, 'registration', request.body.session_data);
```

First we verify the session data to ensure it hasn’t been tampered with.

``` javascript
        let credential;
        try {
            credential = await webAuthn.finishRegistration(
                user, session_data, request.body.ccr);
        } catch (ex) {
            ex.statusCode = 400;
            throw ex;
        }
```

Then we complete the registration process, calling
[`finishRegistration`](http://rawgit.davedoesdev.com/davedoesdev/webauthn4js/master/docs/interfaces/WebAuthn4JS.html#finishRegistration)
and receiving a
[`Credential`](http://rawgit.davedoesdev.com/davedoesdev/webauthn4js/master/docs/interfaces/Credential.html)
object. Note the credential isn’t yet associated with a user.

``` javascript
        for (const u of users.values()) {
            if (u.credentials.find(c => c.id === credential.id)) {
                throw new ErrorWithStatus('credential in use', 409);
            }
        }
```

If the credential is in use by any user already, this is an error.

``` javascript
        user.credentials.push(credential);
        reply.code(204);
    });
}
```

Finally for registration, we associate the credential with the requested
user.

### Login

``` javascript
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
```

Login’s GET handler first checks the user exists and then calls
[`beginLogin`](http://rawgit.davedoesdev.com/davedoesdev/webauthn4js/master/docs/interfaces/WebAuthn4JS.html#beginLogin),
passing in the user object. We then return to the browser the options
for
[`navigator.credentials.get()`](https://developer.mozilla.org/en-US/docs/Web/API/CredentialsContainer/get)
and signed and encrypted session data.

``` javascript
    fastify.post('/:username', {
        schema: schemas.login.post
    }, async (request, reply) => {
        const user = users.get(request.params.username);
        if (!user) {
            throw new ErrorWithStatus('no user', 404);
        }
        const session_data = await verify_secret_session_data(
            request.params.username, 'login', request.body.session_data);
```

Login’s POST handler checks the user exists and verifies the session
data it received from the browser.

``` javascript
        let credential;
        try {
            credential = await webAuthn.finishLogin(
                user, session_data, request.body.car);
        } catch (ex) {
            ex.statusCode = 400;
            throw ex;
        }
```

It then completes the login process by calling
[`finishLogin`](http://rawgit.davedoesdev.com/davedoesdev/webauthn4js/master/docs/interfaces/WebAuthn4JS.html#finishLogin),
passing in the user object, session data and authentication request it
received from the browser (i.e. the result of
`navigator.credentials.get()`).

``` javascript
        if (credential.authenticator.cloneWarning) {
            throw new ErrorWithStatus('credential appears to be cloned', 403);
        }
        const user_cred = user.credentials.find(c => c.id === credential.id);
        if (!user_cred) {
            // Should have been checked already in Go by webAuthn.finishLogin
            throw new ErrorWithStatus('no credential', 500);
        }
```

Here we do a couple of checks on the credential used for login:

-   The credential hasn’t been cloned, i.e. we received a duplicate
    login request from the same authenticator. This is actually checked
    by the underlying Go WebAuthn library.

-   The credential belongs to the requested user. Again, this should
    have already been checked in Go.

``` javascript
        user_cred.authenticator.signCount = credential.authenticator.signCount;
        reply.code(204);
    });
}
```

Finally for login, we have to update the `signCount` for the credential
in the user’s credentials list. This enables the Go library to check for
duplicate requests.

``` javascript
fastify.register(register, {
    prefix: '/register/'
});

fastify.register(login, {
    prefix: '/login/'
});

await fastify.listen(port);

console.log(`Please visit https://localhost:${port}`);
```

The server-side code ends by registering our handlers with Fastify and
then listening for requests.

## Browser-side

You can find the browser files in the [test/fixtures](test/fixtures)
directory.

It’s driven by the following HTML file, which is served when you connect
to the server.

<div class="formalpara-title">

**example.html**

</div>

``` html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>WebAuthn Demo</title>
    <script src="example.js"></script>
  </head>
  <body>
    <p>
      <label for="email">Username:</label>
      <input type="text" name="username" id="email" placeholder="e.g. foo@bar.com">
    </p>
    <p>
      <button onclick="registerUser()">Register</button>
      <button onclick="loginUser()">Login</button>
    </p>
  </body>
</html>
```

The code for `registerUser()` and `loginUser()` is contained in
[test/fixtures/example.js](test/fixtures/example.js), which I’ll
describe now.

<div class="formalpara-title">

**example.js**

</div>

``` javascript
// URLBase64 to ArrayBuffer
function bufferDecode(value) {
    return Uint8Array.from(atob(value
        .replace(/-/g, "+")
        .replace(/_/g, "/")), c => c.charCodeAt(0));
}

// ArrayBuffer to URLBase64
function bufferEncode(value) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(value)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}
```

First some functions to decode data we receive from the server and
encode data we send to the server. WebAuthn4JS (and the Go library)
expect data to be base64 encoded.

``` javascript
async function registerUser() { // eslint-disable-line no-unused-vars
    const username = document.getElementById('email').value;
    try {
        const get_response = await fetch(`/register/${username}`);
        if (!get_response.ok) {
            throw new Error(`Registration GET failed with ${get_response.status}`);
        }
        const { options, session_data } = await get_response.json();
```

To register, we first make a GET request to the server in order to get
the options we should pass to `navigator.credentials.create()`.

``` javascript
        const { publicKey } = options;
        publicKey.challenge = bufferDecode(publicKey.challenge);
        publicKey.user.id = bufferDecode(publicKey.user.id);
        if (publicKey.excludeCredentials) {
            for (const c of publicKey.excludeCredentials) {
                c.id = bufferDecode(c.id);
            }
        }
```

Then we decode the options that are base64 encoded.

``` javascript
        const credential = await navigator.credentials.create(options);
        const { id, rawId, type, response: cred_response } = credential;
        const { attestationObject, clientDataJSON } = cred_response;
```

Now we can call `navigator.credentials.create()`. The browser will ask
the user to interact with their authenticator to sign the challenge that
the server sent in the options.

``` javascript
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
    } catch (ex) {
        console.error(ex);
        return alert(`Failed to register ${username}`);
    }
    alert(`Successfully registered ${username}`);
}
```

To complete registration, we make a PUT request to the server with the
result from `navigator.credentials.create()`, base64 encoding as
necessary.

``` javascript
async function loginUser() { // eslint-disable-line no-unused-vars
    const username = document.getElementById('email').value;
    try {
        const get_response = await fetch(`/login/${username}`);
        if (!get_response.ok) {
            throw new Error(`Login GET failed with ${get_response.status}`);
        }
```

To login, we first make a GET request to the server in order to get the
options we should pass to `navigator.credentials.get()`.

``` javascript
        const { options, session_data } = await get_response.json();
        const { publicKey } = options;
        publicKey.challenge = bufferDecode(publicKey.challenge);
        for (const c of publicKey.allowCredentials) {
            c.id = bufferDecode(c.id);
        }
```

Then we decode the options that are base64 encoded.

``` javascript
        const assertion = await navigator.credentials.get(options);
        const { id, rawId, type, response: assertion_response } = assertion;
        const { authenticatorData, clientDataJSON, signature, userHandle } = assertion_response;
```

Now we can call `navigator.credentials.get()`. The browser will ask the
user to interact with their authenticator to sign the challenge that the
server sent in the options.

``` javascript
        const post_response = await fetch(`/login/${username}`, {
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
        });
        if (!post_response.ok) {
            throw new Error(`Login POST failed with ${post_response.status}`);
        }
    } catch (ex) {
        console.error(ex);
        return alert(`Failed to log in ${username}`);
    }
    alert(`Successfully logged in ${username}`);
}
```

To complete login, we make a POST request to the server with the result
from `navigator.credentials.get()`, base 64 encoding as necessary.

# Typescript

Typescript definitions can be found in [index.d.ts](index.d.ts) and
[typescript/webauthn.d.ts](typescript/webauthn.d.ts). The latter is
automatically generated from the Go WebAuthn library using
[json-schema-to-zod](https://github.com/StefanTerdell/json-schema-to-zod)
and [zod-to-ts](https://github.com/sachinraja/zod-to-ts).

A Typescript version of the [example](#example) can be found in
[typescript/example.ts](typescript/example.ts).

# Installation

``` bash
npm install webauthn4js
```

# Licence

The licence for WebAuthn4JS is [here](LICENCE).

The licence for the Go WebAuthn library is [here](LICENCE_webauthn).

I’ve also modified
[`wasm_exec.js`](https://github.com/golang/go/blob/go1.21.1/misc/wasm/wasm_exec.js)
from Go’s distribution. I’ve included the original
[here](wasm_exec.js.orig) and Go’s licence [here](LICENSE_wasm_exec).
The modified version is [here](wasm_exec.js).

# Test

``` bash
grunt test
```

# Coverage

``` bash
grunt coverage
```

[c8](https://github.com/bcoe/c8) results are available
[here](http://rawgit.davedoesdev.com/davedoesdev/webauthn4js/master/coverage/lcov-report/index.html).

Coveralls page is
[here](https://coveralls.io/r/davedoesdev/webauthn4js).

# Lint

``` bash
grunt lint
```

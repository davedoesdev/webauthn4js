/*eslint-env browser */

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

async function registerUser() { // eslint-disable-line no-unused-vars
    const username = document.getElementById('email').value;
    try {
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
    } catch (ex) {
        console.error(ex);
        return alert(`Failed to register ${username}`);
    }
    alert(`Successfully registered ${username}`);
}

async function loginUser() { // eslint-disable-line no-unused-vars
    const username = document.getElementById('email').value;
    try {
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

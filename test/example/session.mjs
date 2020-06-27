/*eslint-env node */

import sodium_plus from 'sodium-plus';
const { SodiumPlus } = sodium_plus;

const challenge_timeout = 60000;

const sodium = await SodiumPlus.auto();
const session_data_key = await sodium.crypto_secretbox_keygen();

export async function make_secret_session_data(username, type, session_data) {
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

export async function verify_secret_session_data(
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
        if ((timestamp + challenge_timeout) <= Date.now('dummy' /* for testing */)) {
            throw new Error('session timed out');
        }
        return session_data;
    } catch (ex) {
        ex.statusCode = 400;
        throw ex;
    }
}

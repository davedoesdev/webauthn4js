/*eslint-env node */

import makeWebAuthn from '../../index.js';

const $defs = makeWebAuthn.schemas.$defs;

const session_data = {
    type: 'object',
    required: [
        'ciphertext',
        'nonce'
    ],
    additionalProperties: false,
    properties: {
        ciphertext: { type: 'string' },
        nonce: { type: 'string' }
    }
};

export const register = {
    get: {
        response: {
            200: {
                type: 'object',
                required: [
                    'options',
                    'session_data'
                ],
                additionalProperties: false,
                properties: {
                    options: $defs.CredentialCreation,
                    session_data
                },
                $defs
            }
        }
    },
    put: {
        body: {
            type: 'object',
            required: [
                'ccr',
                'session_data'
            ],
            properties: {
                ccr: $defs.CredentialCreationResponse,
                session_data
            },
            $defs
        }
    }
};

export const login = {
    get: {
        response: {
            200: {
                type: 'object',
                required: [
                    'options',
                    'session_data'
                ],
                additionalProperties: false,
                properties: {
                    options: $defs.CredentialAssertion,
                    session_data
                },
                $defs
            }
        }
    },
    post: {
        body: {
            type: 'object',
            required: [
                'car',
                'session_data'
            ],
            properties: {
                car: $defs.CredentialAssertionResponse,
                session_data
            },
            $defs
        }
    }
};

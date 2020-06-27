/*eslint-env node */

import makeWebAuthn from '../../index.js';

const definitions = makeWebAuthn.schemas.definitions;

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
                    options: definitions.CredentialCreation,
                    session_data
                },
                definitions
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
                ccr: definitions.CredentialCreationResponse,
                session_data
            },
            definitions
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
                    options: definitions.CredentialAssertion,
                    session_data
                },
                definitions
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
                car: definitions.CredentialAssertionResponse,
                session_data
            },
            definitions
        }
    }
};

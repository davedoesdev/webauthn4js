//import * from './webauthn'

export interface WebAuthn4JS extends EventEmitter {
    async beginRegistration(
        user : User,
        ...opts : PublicKeyCredentialCreationOptions[]
    ) : {
        options : CredentialCreation,
        sessionData : SessionData
    };

    async finishRegistration(
        user : User,
        sessionData : SessionData,
        response : CredentialCreationResponse
    ) : Credential;

    async beginLogin(
        user : User,
        ...opts : PublicKeyCredentialRequestOptions[]
    ) : {
        options : CredentialAssertion,
        sessionData : SessionData
    };

    async finishLogin(
        user : User,
        sessionData : SessionData,
        response : CredentialAssertionResponse
    ) : Credential;
}

declare function make(config : Config) : WebAuthnJS;

export default make;

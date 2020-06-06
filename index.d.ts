import { EventEmitter } from 'events';
import {
    Config,
    User,
    CredentialCreation,
    CredentialCreationResponse,
    CredentialAssertion,
    CredentialAssertionResponse,
    SessionData
} from './typescript/webauthn';

export interface WebAuthn4JS extends EventEmitter {
    beginRegistration(
        user : User,
        ...opts : ((PublicKeyCredentialCreationOptions) => PublicKeyCredentialCreationOptions)[]
    ) : Promise<{
        options : CredentialCreation,
        sessionData : SessionData
    }>;

    finishRegistration(
        user : User,
        sessionData : SessionData,
        response : CredentialCreationResponse
    ) : Promise<Credential>;

    beginLogin(
        user : User,
        ...opts : ((PublicKeyCredentialRequestOptions) => PublicKeyCredentialRequestOptions)[]
    ) : Promise<{
        options : CredentialAssertion,
        sessionData : SessionData
    }>;

    finishLogin(
        user : User,
        sessionData : SessionData,
        response : CredentialAssertionResponse
    ) : Promise<Credential>;
}

declare function make(config : Config) : WebAuthn4JS;

export default make;

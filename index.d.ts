import { TypedEmitter } from 'tiny-typed-emitter';
import {
    Config,
    User,
    Credential,
    CredentialCreation,
    PublicKeyCredentialCreationOptions,
    CredentialCreationResponse,
    CredentialAssertion,
    PublicKeyCredentialRequestOptions,
    CredentialAssertionResponse,
    SessionData
} from './typescript/webauthn';

interface WebAuthn4JSEvents {
    error: (err : Error) => void;
    exit: () => void;
}

export interface WebAuthn4JS extends TypedEmitter<WebAuthn4JSEvents> {
    beginRegistration(
        user : User,
        ...opts : ((cco : PublicKeyCredentialCreationOptions) => PublicKeyCredentialCreationOptions)[]
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
        ...opts : ((cro : PublicKeyCredentialRequestOptions) => PublicKeyCredentialRequestOptions)[]
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

declare type WebAuthn4JSFactory = (config : Config) => WebAuthn4JS;

interface SchemadWebAuthn4JSFactory extends WebAuthn4JSFactory {
    schemas : any;
}

declare let make : SchemadWebAuthn4JSFactory;

export default make;

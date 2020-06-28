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

/**
 * Events emitted by {@link WebAuthn4JS} instances.
 */
interface WebAuthn4JSEvents {
    /**
     * Emitted if an error occurs.
     *
     * @param err  The error that occurred.
     */
    error: (err : Error) => void;

    /**
     * Emitted if the Web Assembly library used by {@link WebAuthn4JS} exits.
     * After this event has been emitted, the {@link WebAuthn4JS} instance which
     * emitted it must no longer be used.
     */
    exit: () => void;
}

/**
 * Implements [Web Authentication](https://w3c.github.io/webauthn/) for
 * applications. Uses the [Duo Labs Go WebAuthn library](https://github.com/duo-labs/webauthn),
 * compiled to Web Assembly, to do the heavy lifting.
 * @noInheritDoc
 */
export interface WebAuthn4JS extends TypedEmitter<WebAuthn4JSEvents> {
    /**
     * Begin reg
     */
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

    exit(code: number) : void;
}

/**
 * Signature for a function which creates {@link WebAuthn4JS} instances from
 * a given configuration.
 *
 * @param config  Configuration for the instance.
 *
 * @return  A new configured instance.
 */
declare type WebAuthn4JSFactory = (config : Config) => WebAuthn4JS;

/**
 * The same as {@link WebAuthn4JSFactory} but with an additional property
 * _on the function itself_ which holds [JSON Schemas](https://json-schema.org/) for
 * the types in this library.
 */
interface SchemadWebAuthn4JSFactory extends WebAuthn4JSFactory {
    /**
     * JSON Schemas for the types in `webauthn4js`. These can be useful for validating data
     * you exchange with browsers, for example.
     */
    schemas : any;
}

declare const make : SchemadWebAuthn4JSFactory;

export default make;

/**
 * @module webauthn4js
 * @packageDocumentation
 */
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
interface WebAuthn4JS extends TypedEmitter<WebAuthn4JSEvents> {
    /**
     * Generate a new set of registration data to be sent to the browser.
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
 * @ignore
 */
type WebAuthn4JSFactoryBase = (config : Config) => WebAuthn4JS;

/**
 * Function type which creates {@link WebAuthn4JS} instances from
 * a given {@link Config}. Also has a property _on the function itself_ which
 * holds [JSON Schemas](https://json-schema.org/) for the types in this library.
 *
 * @param config  Configuration for the instance.
 *
 * @return  A new configured instance.
 */
interface WebAuthn4JSFactory extends WebAuthn4JSFactoryBase {
    /**
     * JSON Schemas for the types in `webauthn4js`. These can be useful for validating data
     * you exchange with browsers, for example.
     */
    schemas : any;
}

/**
 * `module.exports` is a function which creates {@link WebAuthn4JS} objects from a given
 * {@link Config}.
 */
declare const exports : WebAuthn4JSFactory;

export default exports;

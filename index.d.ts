/**
 * @module webauthn4js
 * @packageDocumentation
 */
import { TypedEmitter } from 'tiny-typed-emitter';
import {
    Authenticator,
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
     *
     * @param code  Status code the Web Assembly exited with.
     */
    exit: (code : number) => void;
}

/**
 * Implements [Web Authentication](https://w3c.github.io/webauthn/) for
 * applications. Uses the [Go WebAuthn library](https://github.com/go-webauthn/webauthn),
 * compiled to Web Assembly, to do the heavy lifting.
 *
 * Note that WebAuthn4JS doesn't store any data itself. Users and credentials are left for
 * the application to store, for example in a database.
 *
 * @noInheritDoc
 */
interface WebAuthn4JS extends TypedEmitter<WebAuthn4JSEvents> {
    /**
     * Generate a new set of registration data (including attestation challenge) to be sent to the
     * browser.
     *
     * @param user  User to start registering.
     * @param opts  A list of functions which can modify the options that will be sent to the
     *              browser for it to call
     *              [`navigator.credentials.create()`](https://developer.mozilla.org/en-US/docs/Web/API/CredentialsContainer/create).
     *             
     * @returns  A promise which resolves to the options which the browser should pass to
     *           `navigator.credentials.create()` and session data which the caller should store
     *           securely for the duration of the registration ceremony.
     */
    beginRegistration(
        user : User,
        ...opts : ((cco : PublicKeyCredentialCreationOptions) => PublicKeyCredentialCreationOptions)[]
    ) : Promise<{
        options : CredentialCreation,
        sessionData : SessionData
    }>;

    /**
     * Take the response from the browser and verify the credential against the registration
     * ceremony's session data.
     *
     * @param user         User to register.
     * @param sessionData  Session data that was returned by a previous call to
     *                     {@link beginRegistration}.
     * @param response     Result from calling `navigator.credentials.create()` in the browser.
     *
     * @returns  Credential that was verified (against the challenge in the session data).
     *           <p>Note that the caller is responsible for associating this credential with the
     *           user (for example in a database) and for checking the same credential isn't
     *           registered to another user.
     */
    finishRegistration(
        user : User,
        sessionData : SessionData,
        response : CredentialCreationResponse
    ) : Promise<Credential>;

    /**
     * Generate a new set of login data (including assertion challenge) to be sent to the browser.
     *
     * @param user  User to start logging in.
     * @param opts  A list of functions which can modify the options that will be sent to the
     *              browser for it to call
     *              [`navigator.credentials.get()`](https://developer.mozilla.org/en-US/docs/Web/API/CredentialsContainer/get).
     *             
     * @returns  A promise which resolves to the options which the browser should pass to
     *           `navigator.credentials.get()` and session data which the caller should store
     *           securely for the duration of the registration ceremony.
     */
    beginLogin(
        user : User,
        ...opts : ((cro : PublicKeyCredentialRequestOptions) => PublicKeyCredentialRequestOptions)[]
    ) : Promise<{
        options : CredentialAssertion,
        sessionData : SessionData
    }>;

    /**
     * Take the response from the browser and validate it against the user's credentials and the
     * login ceremony's session data.
     *
     * @param user         User to login.
     * @param sessionData  Session data that was returned by a previous call to
     *                     {@link beginLogin}.
     * @param response     Result from calling `navigator.credentials.get()` in the browser.
     *
     * @returns  Credential that was verified (against the challenge in the session data). 
     *           <p>It's also checked to belong to the user's existing credentials.
     *           <p>Note that the caller is responsible for checking the
     *           {@link Authenticator.cloneWarning} property, indicating the credential has
     *           been cloned, and treating it as an error.
     *           <p>The caller should also use the {@link Authenticator.signCount} property to
     *           update the sign count it holds on record (for example in a database) for
     *           this credential. It can use the {@link Credential.id} property to identify
     *           credentials.
     */
    finishLogin(
        user : User,
        sessionData : SessionData,
        response : CredentialAssertionResponse
    ) : Promise<Credential>;

    /**
     * Tell the Web Assembly code which is running the Go WebAuthn library for this
     * instance to stop.
     *
     * Don't call any more methods after you call this.
     *
     * @param code  Optional code to stop the Web Assembly with. 
     *              <p>A {@link WebAuthn4JSEvents.exit} event will be fired once the Web Assembly
     *              code exits.
     *              <p>If this parameter is non-zero (the default is zero), then a
     *              {@link WebAuthn4JSEvents.error} event will be fired before the
     *              {@link WebAuthn4JSEvents.exit} event.
     */
    exit(code? : number) : void;
}

declare const makeWebAuthn : {
    /**
     * [JSON Schemas](https://json-schema.org/) for the types in `webauthn4js`.
     * These can be useful for validating data you exchange with browsers, for example.
     */
    schemas : any;

    /**
     * Creates a {@link WebAuthn4JS} instance from a given {@link Config}.
     *
     * @param config  Configuration for the instance.
     *
     * @returns  A new configured instance.
     */
    (config : Config) : Promise<WebAuthn4JS>;
}
export default makeWebAuthn;

export {
    WebAuthn4JSEvents,
    WebAuthn4JS
};
export * from './typescript/webauthn';

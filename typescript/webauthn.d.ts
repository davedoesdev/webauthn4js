export type AlgES256 = -7;
export type AlgES384 = -35;
export type AlgES512 = -36;
export type AlgEdDSA = -8;
export type AlgPS256 = -37;
export type AlgPS384 = -38;
export type AlgPS512 = -39;
export type AlgRS1 = -65535;
export type AlgRS256 = -257;
export type AlgRS384 = -258;
export type AlgRS512 = -259;
export type AuthenticationExtensions = {
    [x: string]: any;
};
export type AuthenticationExtensionsClientOutputs = {
    [x: string]: any;
};
export type Authenticator = {
    /** Identifies the type (e.g. make and model) of the authenticator. */
    AAGUID: string;
    /** {@link WebAuthn4JS.finishLogin} compares the stored signature counter value with the new `signCount` value returned in the assertion’s authenticator data. If this new `signCount` value is less than or equal to the stored value, a cloned authenticator may exist, or the authenticator may be malfunctioning. */
    SignCount: number;
    /** This is a signal that the authenticator may be cloned, i.e. at least two copies of the credential private key may exist and are being used in parallel. Relying Parties (applications) should incorporate this information into their risk scoring. Whether the Relying Party updates the stored signature counter value in this case, or not, or fails the authentication ceremony or not, is Relying Party-specific. */
    CloneWarning: boolean;
    Attachment: string;
};
export type AuthenticatorAssertionResponse = {
    /** Contains a JSON serialization of the client data passed to the authenticator by the browser in its call to navigator.credentials.get(). */
    clientDataJSON: URLEncodedBase64;
    /** Serialized bindings made by the authenticator, such as ID of the Relying Party that the credential is meant for, whether the user is present and the signature count. */
    authenticatorData: URLEncodedBase64;
    /** The raw signature returned from the authenticator. */
    signature: URLEncodedBase64;
    /** Contains the Relying Party's ID for the user */
    userHandle?: URLEncodedBase64 | undefined;
};
export type AuthenticatorAttestationResponse = {
    /** Contains a JSON serialization of the client data passed to the authenticator by the browser in its call to navigator.credentials.create(). */
    clientDataJSON: URLEncodedBase64;
    /** This attribute contains an attestation object, which is opaque to, and cryptographically protected against tampering by, the browser. The attestation object contains both authenticator data and an attestation statement. The former contains the AAGUID, a unique credential ID, and the credential public key. The contents of the attestation statement are determined by the attestation statement format used by the authenticator.  It also contains any additional information that the Relying Party's server requires to validate the attestation statement, as well as to decode and validate the authenticator data along with the JSON-serialized client data. */
    attestationObject: URLEncodedBase64;
    transports?: string[] | undefined;
};
export type AuthenticatorSelection = {
    /** If this member is present, eligible authenticators are filtered to only authenticators attached by the specified mechanism. */
    authenticatorAttachment?: any | undefined;
    /** Describes the Relying Party's requirements regarding resident credentials. If present and set to `true`, the authenticator MUST create a client-side-resident public key credential source when creating a public key credential. */
    requireResidentKey?: boolean | undefined;
    residentKey?: string | undefined;
    /** Describes the Relying Party's requirements regarding user verification for the `navigator.credentials.create()` or `navigator.credentials.get()` operation. Eligible authenticators are filtered to only those capable of satisfying this requirement. */
    userVerification: any;
};
export type Config = {
    /** A valid domain that identifies the Relying Party. A credential can only by used  with the same enity (as identified by the `RPID`) it was registered with. */
    RPID: string;
    /** Friendly name for the Relying Party (application). The browser may display this to the user. */
    RPDisplayName: string;
    RPOrigins: string[];
    /** Preferred attestation conveyance during credential generation */
    AttestationPreference: any;
    /** Login requirements for authenticator attributes. */
    AuthenticatorSelection: AuthenticatorSelection;
    /** @ignore */
    Debug: boolean;
    EncodeUserIDAsString: boolean;
    Timeouts: TimeoutsConfig;
    /** URL to an icon representing the Relying Party */
    RPIcon: string;
    /** The HTTP(S) origin that the Relying Party is using to handle requests */
    RPOrigin: string;
    /** Timeout for browser `navigator.credentials.create()` and `navigator.credentials.debug()` in the browser. */
    Timeout: number;
};
export type Credential = {
    /** A probabilistically-unique byte sequence identifying a public key credential source and its authentication assertions. */
    ID: string;
    /** The public key portion of a Relying Party-specific credential key pair, generated by an authenticator and returned to a Relying Party at registration time. */
    PublicKey: string;
    /** The attestation format used (if any) by the authenticator when creating the credential. */
    AttestationType: string;
    Transport: string[];
    Flags: CredentialFlags;
    /** The Authenticator information for a given certificate. */
    Authenticator: Authenticator;
};
export type CredentialAssertion = {
    /** Options for the browser to pass to `navigator.credentials.get()`. */
    publicKey: PublicKeyCredentialRequestOptions;
};
export type CredentialAssertionResponse = {
    /** The credential's identifier. */
    id: string;
    /** Specifies the credential type represented by this object. */
    type: PublicKeyCredentialType;
    /** The credential's identifier. Since we base64-encode raw data, this is the same as `id`. */
    rawId: URLEncodedBase64;
    clientExtensionResults?: AuthenticationExtensionsClientOutputs | undefined;
    authenticatorAttachment?: string | undefined;
    /** The authenticator's response to the request to generate a login assertion. */
    response: AuthenticatorAssertionResponse;
    /** A map containing identifier -> client extension output entries produced by any extensions that may have been used during login. */
    extensions?: any | undefined;
};
export type CredentialCreation = {
    /** Options for the browser to pass to `navigator.credentials.create()`. */
    publicKey: PublicKeyCredentialCreationOptions;
};
export type CredentialCreationResponse = {
    /** The credential's identifier. */
    id: string;
    /** Specifies the credential type represented by this object. */
    type: PublicKeyCredentialType;
    /** The credential's identifier. Since we base64-encode raw data, this is the same as `id`. */
    rawId: URLEncodedBase64;
    clientExtensionResults?: AuthenticationExtensionsClientOutputs | undefined;
    authenticatorAttachment?: string | undefined;
    /** The authenticator's response to the request to generate a registration attestation. */
    response: AuthenticatorAttestationResponse;
    transports?: string[] | undefined;
    /** A map containing identifier -> client extension output entries produced by any extensions that may have been used during registration. */
    extensions?: any | undefined;
};
export type CredentialDescriptor = {
    /** Type of the credential to use. */
    type: PublicKeyCredentialType;
    /** The ID of a credential to allow/disallow. */
    id: URLEncodedBase64;
    /** Contains a hint as to how the browser might communicate with the authenticator to which the credential belongs. */
    transports?: string[] | undefined;
};
export type CredentialFlags = {
    UserPresent: boolean;
    UserVerified: boolean;
    BackupEligible: boolean;
    BackupState: boolean;
};
export type CredentialParameter = {
    /** Type of the credential to use. */
    type: PublicKeyCredentialType;
    /** Algorithm to use, see the [IANA CBOR COSE Algorithms Registry](https://www.iana.org/assignments/cose/cose.xhtml#algorithms). */
    alg: any;
};
export type CrossPlatformAttachment = "cross-platform";
export type PlatformAttachment = "platform";
export type PreferDirectAttestation = "direct";
export type PreferIndirectAttestation = "indirect";
export type PreferNoAttestation = "none";
export type PublicKeyCredentialCreationOptions = {
    /** Data about the Relying Party responsible for the request (i.e. your application) */
    rp: RelyingPartyEntity;
    /** Data about the user account for which the Relying Party is requesting attestation. */
    user: UserEntity;
    /** A challenge intended to be used for generating the newly created credential’s attestation. */
    challenge: URLEncodedBase64;
    /**  Information about the desired properties of the credential to be created. The sequence is ordered from most preferred to least preferred. The browser makes a best-effort to create the most preferred credential that it can. */
    pubKeyCredParams?: CredentialParameter[] | undefined;
    /** Specifies a time, in milliseconds, that the caller is willing to wait for the call to complete. This is treated as a hint, and may be overridden by the browser. */
    timeout?: number | undefined;
    /** This member is intended for use by Relying Parties that wish to limit the creation of multiple credentials for the same account on a single authenticator. The browser is requested to return an error if the new credential would be created on an authenticator that also contains one of the credentials enumerated in this parameter. */
    excludeCredentials?: CredentialDescriptor[] | undefined;
    /** Registration requirements for authenticator attributes. */
    authenticatorSelection?: AuthenticatorSelection | undefined;
    /** This member is intended for use by Relying Parties that wish to express their preference for attestation conveyance. */
    attestation: any;
    /** Additional parameters requesting additional processing by the browser and authenticator. For example, the caller may request that only authenticators with certain capabilities be used to create the credential, or that particular information be returned in the attestation object. Some extensions are defined in [WebAuthn Extensions](https://www.w3.org/TR/webauthn/#extensions); consult the IANA "WebAuthn Extension Identifier" registry established by [WebAuthn-Registries](https://tools.ietf.org/html/draft-hodges-webauthn-registries) for an up-to-date list of registered WebAuthn Extensions. */
    extensions?: AuthenticationExtensions | undefined;
};
export type PublicKeyCredentialRequestOptions = {
    /** A challenge that the selected authenticator signs, along with other data, when producing a login assertion. */
    challenge: URLEncodedBase64;
    /** Specifies a time, in milliseconds, that the caller is willing to wait for the call to complete. This is treated as a hint, and may be overridden by the browser. */
    timeout?: number | undefined;
    /** Specifies the Relying Party identifier claimed by the application. If omitted, its value will be the application's origin's effective domain. */
    rpId?: string | undefined;
    /** A list of public key credentials acceptable to the caller, in descending order of preference (the first item in the list is the most preferred credential, and so on down the list). */
    allowCredentials?: CredentialDescriptor[] | undefined;
    /** Describes the Relying Party's requirements regarding user verification for the `navigator.credentials.get()` operation. Eligible authenticators are filtered to only those capable of satisfying this requirement. */
    userVerification: any;
    /** Additional parameters requesting additional processing by the browser and authenticator. For example, if transaction confirmation is sought from the user, then the prompt string might be included as an extension. */
    extensions?: AuthenticationExtensions | undefined;
};
export type PublicKeyCredentialType = "public-key";
export type RelyingPartyEntity = {
    /** A human-palatable identifier for the Relying Party, intended only for display. */
    name: string;
    /** A URL which resolves to an image associated with the Relying Party, for example its logo. */
    icon?: string | undefined;
    /** A unique identifier for the Relying Party. */
    id: string;
};
export type SessionData = {
    /** Challenge that was sent to the browser. */
    challenge: string;
    /** ID of the user being registered or logged in. */
    user_id: string;
    /** Credentials allowed in this login or registration ceremony. */
    allowed_credentials?: string[] | undefined;
    expires: string;
    /** Required user verification in this login or registration ceremony. */
    userVerification: any;
    extensions?: AuthenticationExtensions | undefined;
};
export type TimeoutConfig = {
    Enforce: boolean;
    Timeout: number;
    TimeoutUVD: number;
};
export type TimeoutsConfig = {
    Login: TimeoutConfig;
    Registration: TimeoutConfig;
};
export type URLEncodedBase64 = string;
export type User = {
    /** User ID according to the Relying Party. */
    id: string;
    /** User Name according to the Relying Party. */
    name: string;
    /** Display Name of the user. */
    displayName: string;
    /** User's icon url. */
    iconURL: string;
    /** Credentials owned by the user. */
    credentials: Credential[];
};
export type UserEntity = {
    /** A human-palatable identifier for the user account, intended only for display to aid the user in determining the difference between user accounts with similar `displayName`s. */
    name: string;
    /** A URL which resolves to an image associated with the user account. */
    icon?: string | undefined;
    /** A human-palatable name for the user account, intended only for display. */
    displayName?: string | undefined;
    /** The user handle of the user account. */
    id?: any;
};
export type UserVerificationDiscouraged = "discouraged";
export type UserVerificationPreferred = "preferred";
export type UserVerificationRequired = "required";

/** ECDSA with SHA-256 */
export type AlgES256 = -7;
/** ECDSA using secp256k1 curve and SHA-256. */
export type AlgES256K = -47;
/** ECDSA with SHA-384 */
export type AlgES384 = -35;
/** ECDSA with SHA-512 */
export type AlgES512 = -36;
/** EdDSA */
export type AlgEdDSA = -8;
/** RSASSA-PSS with SHA-256 */
export type AlgPS256 = -37;
/** RSASSA-PSS with SHA-384 */
export type AlgPS384 = -38;
/** RSASSA-PSS with SHA-512 */
export type AlgPS512 = -39;
/** RSASSA-PKCS1-v1_5 with SHA-1 */
export type AlgRS1 = -65535;
/** RSASSA-PKCS1-v1_5 with SHA-256 */
export type AlgRS256 = -257;
/** RSASSA-PKCS1-v1_5 with SHA-384 */
export type AlgRS384 = -258;
/** RSASSA-PKCS1-v1_5 with SHA-512 */
export type AlgRS512 = -259;
/** Contains additional parameters requesting additional processing by the client and authenticator. */
export /*eslint-disable-next-line @typescript-eslint/no-explicit-any*/type AuthenticationExtensions = {
    [x: string]: any;
};
/** Contains the results of processing client extensions requested by the Relying Party. */
export /*eslint-disable-next-line @typescript-eslint/no-explicit-any*/type AuthenticationExtensionsClientOutputs = {
    [x: string]: any;
};
/** Represents the user's authenticator device. */
export type Authenticator = {
    /** (**base64**) Identifies the type (e.g. make and model) of the authenticator. */
    AAGUID: string;
    /** {@link WebAuthn4JS.finishLogin} compares the stored signature counter value with the new `signCount` value returned in the assertion’s authenticator data. If this new `signCount` value is less than or equal to the stored value, a cloned authenticator may exist, or the authenticator may be malfunctioning. */
    signCount: number;
    /** This is a signal that the authenticator may be cloned, i.e. at least two copies of the credential private key may exist and are being used in parallel. Relying Parties (applications) should incorporate this information into their risk scoring. Whether the Relying Party updates the stored signature counter value in this case, or not, or fails the authentication ceremony or not, is Relying Party-specific. */
    cloneWarning: boolean;
    /** The {@link AuthenticatorSelection.authenticatorAttachment} value returned by the request. */
    attachment: AuthenticatorAttachment;
};
/** Contains the raw authenticator assertion data, used to verify the authenticity of the login ceremony and the used credential. */
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
export type AuthenticatorAttachment = PlatformAttachment | CrossPlatformAttachment;
/** Contains the raw authenticator attestation data, used to verify the authenticy of the registration ceremony and the new credential. */
export type AuthenticatorAttestationResponse = {
    /** Contains a JSON serialization of the client data passed to the authenticator by the browser in its call to navigator.credentials.create(). */
    clientDataJSON: URLEncodedBase64;
    /** This attribute contains an attestation object, which is opaque to, and cryptographically protected against tampering by, the browser. The attestation object contains both authenticator data and an attestation statement. The former contains the AAGUID, a unique credential ID, and the credential public key. The contents of the attestation statement are determined by the attestation statement format used by the authenticator.  It also contains any additional information that the Relying Party's server requires to validate the attestation statement, as well as to decode and validate the authenticator data along with the JSON-serialized client data. */
    attestationObject: URLEncodedBase64;
    /** These values are the transports that the authenticator is believed to support, or an empty sequence if the information is unavailable. */
    transports?: string[] | undefined;
};
/** Use this class to specify requirements regarding authenticator attributes. */
export type AuthenticatorSelection = {
    /** If this member is present, eligible authenticators are filtered to only authenticators attached by the specified mechanism. */
    authenticatorAttachment?: AuthenticatorAttachment | undefined;
    /** Describes the Relying Party's requirements regarding resident credentials. If present and set to `true`, the authenticator MUST create a client-side-resident public key credential source when creating a public key credential. @defaultValue false */
    requireResidentKey?: boolean;
    /** Specifies the extent to which the Relying Party desires to create a client-side discoverable credential. For historical reasons the naming retains the deprecated “resident” terminology. */
    residentKey?: string | undefined;
    /** Describes the Relying Party's requirements regarding user verification for the `navigator.credentials.create()` or `navigator.credentials.get()` operation. Eligible authenticators are filtered to only those capable of satisfying this requirement. */
    userVerification?: UserVerificationRequirement | undefined;
};
export type AuthenticatorTransport = TransportUSB | TransportNFC | TransportBLE | TransportHybrid | TransportInternal;
export type COSEAlgorithmIdentifier = AlgES256 | AlgES384 | AlgES512 | AlgRS1 | AlgRS256 | AlgRS384 | AlgRS512 | AlgPS256 | AlgPS384 | AlgPS512 | AlgEdDSA | AlgES256K;
/** Configuration and default values for the {@link WebAuthn4JS} instance. */
export type Config = {
    /** A valid domain that identifies the Relying Party. A credential can only by used  with the same enity (as identified by the `RPID`) it was registered with. */
    RPID: string;
    /** Friendly name for the Relying Party (application). The browser may display this to the user. */
    RPDisplayName: string;
    /** Configures the list of Relying Party Server Origins that are permitted. These should be fully qualified origins. */
    RPOrigins: string[];
    /** Preferred attestation conveyance during credential generation */
    AttestationPreference?: ConveyancePreference | undefined;
    /** Login requirements for authenticator attributes. */
    AuthenticatorSelection?: AuthenticatorSelection | undefined;
    /** Enables various debug options. */
    Debug?: boolean | undefined;
    /** Ensures the user.id value during registrations is encoded as a raw UTF8 string. This is useful when you only use printable ASCII characters for the random user.id but the browser library does not decode the URL Safe Base64 data. */
    EncodeUserIDAsString?: boolean | undefined;
    /** Configures various timeouts. */
    Timeouts?: TimeoutsConfig | undefined;
    /** @deprecated This option has been removed from newer specifications due to security considerations. */
    RPIcon?: string | undefined;
    /** @deprecated Use RPOrigins instead. */
    RPOrigin?: string | undefined;
    /** @deprecated Use Timeouts instead. */
    Timeout?: number | undefined;
};
/** @defaultValue {@link PreferNoAttestation} */
export type ConveyancePreference = PreferNoAttestation | PreferIndirectAttestation | PreferDirectAttestation | PreferEnterpriseAttestation;
/** Contains all needed information about a WebAuthn credential for storage. */
export type Credential = {
    /** (**base64**) A probabilistically-unique byte sequence identifying a public key credential source and its authentication assertions. */
    id: string;
    /** (**base64**) The public key portion of a Relying Party-specific credential key pair, generated by an authenticator and returned to a Relying Party at registration time. */
    publicKey: string;
    /** The attestation format used (if any) by the authenticator when creating the credential. */
    attestationType: string;
    /** The transport types the authenticator supports. */
    transport: AuthenticatorTransport[];
    /** The commonly stored flags. */
    flags: CredentialFlags;
    /** The Authenticator information for a given certificate. */
    authenticator: Authenticator;
};
/** The payload that should be sent to the browser for beginning the login process. */
export type CredentialAssertion = {
    /** Options for the browser to pass to `navigator.credentials.get()`. */
    publicKey: PublicKeyCredentialRequestOptions;
};
/** The raw response returned to us from an authenticator when we request a credential for login. */
export type CredentialAssertionResponse = {
    /** The credential's identifier. */
    id: string;
    /** Specifies the credential type represented by this object. */
    type: PublicKeyCredentialType;
    /** The credential's identifier. Since we base64-encode raw data, this is the same as `id`. */
    rawId: URLEncodedBase64;
    /** A map containing identifier -> client extension output entries produced by any extensions that may have been used during login. */
    clientExtensionResults?: AuthenticationExtensionsClientOutputs | undefined;
    /** If this member is present, eligible authenticators are filtered to only authenticators attached by the specified mechanism. */
    authenticatorAttachment?: AuthenticatorAttachment | undefined;
    /** The authenticator's response to the request to generate a login assertion. */
    response: AuthenticatorAssertionResponse;
};
/** The payload that should be sent to the browser for beginning the registration process. */
export type CredentialCreation = {
    /** Options for the browser to pass to `navigator.credentials.create()`. */
    publicKey: PublicKeyCredentialCreationOptions;
};
/** The raw response returned to us from an authenticator when we request a credential for registration. */
export type CredentialCreationResponse = {
    /** The credential's identifier. */
    id: string;
    /** Specifies the credential type represented by this object. */
    type: PublicKeyCredentialType;
    /** The credential's identifier. Since we base64-encode raw data, this is the same as `id`. */
    rawId: URLEncodedBase64;
    /** A map containing identifier -> client extension output entries produced by any extensions that may have been used during registration. */
    clientExtensionResults?: AuthenticationExtensionsClientOutputs | undefined;
    /** If this member is present, eligible authenticators are filtered to only authenticators attached by the specified mechanism. */
    authenticatorAttachment?: AuthenticatorAttachment | undefined;
    /** The authenticator's response to the request to generate a registration attestation. */
    response: AuthenticatorAttestationResponse;
    /** @deprecated Deprecated due to upstream changes to the API. Use {@link AuthenticatorAttestationResponse.transports} instead. */
    transports?: string[] | undefined;
};
/** Specifies a credential for use by the browser when it calls `navigator.credentials.create()` or `navigator.credentials.get()`. */
export type CredentialDescriptor = {
    /** Type of the credential to use. */
    type: CredentialType;
    /** The ID of a credential to allow/disallow. */
    id: URLEncodedBase64;
    /** The authenticator transports that can be used. */
    transports?: AuthenticatorTransport[] | undefined;
};
/** Flags associated with a credential */
export type CredentialFlags = {
    /** Indicates the users presence. */
    userPresent: boolean;
    /** Indicates the user performed verification. */
    userVerified: boolean;
    /** Indicates the credential is able to be backed up and/or sync'd between devices. This should NEVER change. */
    backupEligible: boolean;
    /** Indicates the credential has been backed up and/or sync'd. This value can change but it's recommended that RP's keep track of this value. */
    backupState: boolean;
};
/** The credential type and algorithm that the Relying Party wants the authenticator to create. */
export type CredentialParameter = {
    /** Type of the credential to use. */
    type: CredentialType;
    /** Algorithm to use, see the [IANA CBOR COSE Algorithms Registry](https://www.iana.org/assignments/cose/cose.xhtml#algorithms). */
    alg: COSEAlgorithmIdentifier;
};
export type CredentialType = PublicKeyCredentialType;
/** A roaming authenticator is attached using cross-platform transports, called cross-platform attachment. Authenticators of this class are removable from, and can "roam" among, client devices. A public key credential bound to a roaming authenticator is called a roaming credential. */
export type CrossPlatformAttachment = "cross-platform";
/** A platform authenticator is attached using a client device-specific transport, called platform attachment, and is usually not removable from the client device. A public key credential bound to a platform authenticator is called a platform credential. */
export type PlatformAttachment = "platform";
/** Indicates that the Relying Party wants to receive the attestation statement as generated by the authenticator. */
export type PreferDirectAttestation = "direct";
/** Indicates that the Relying Party wants to receive an attestation statement that may include uniquely identifying information. This is intended for controlled deployments within an enterprise where the organization wishes to tie registrations to specific authenticators. User agents MUST NOT provide such an attestation unless the user agent or authenticator configuration permits it for the requested RP ID. If permitted, the user agent SHOULD signal to the authenticator (at invocation time) that enterprise attestation is requested, and convey the resulting AAGUID and attestation statement, unaltered, to the Relying Party. */
export type PreferEnterpriseAttestation = "enterprise";
/** Indicates that the Relying Party prefers an attestation conveyance yielding verifiable attestation statements, but allows the client to decide how to obtain such attestation statements. The client MAY replace the authenticator-generated attestation statements with attestation statements generated by an Anonymization CA, in order to protect the user’s privacy, or to assist Relying Parties with attestation verification in a heterogeneous ecosystem. */
export type PreferIndirectAttestation = "indirect";
/** Indicates that the Relying Party is not interested in authenticator attestation. For example, in order to potentially avoid having to obtain user consent to relay identifying information to the Relying Party, or to save a roundtrip to an Attestation CA. This is the default if no attestation conveyance is specified. */
export type PreferNoAttestation = "none";
/** Parameters for `navigator.credentials.create()`. */
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
    attestation?: ConveyancePreference | undefined;
    /** Additional parameters requesting additional processing by the browser and authenticator. For example, the caller may request that only authenticators with certain capabilities be used to create the credential, or that particular information be returned in the attestation object. Some extensions are defined in [WebAuthn Extensions](https://www.w3.org/TR/webauthn/#extensions); consult the IANA "WebAuthn Extension Identifier" registry established by [WebAuthn-Registries](https://tools.ietf.org/html/draft-hodges-webauthn-registries) for an up-to-date list of registered WebAuthn Extensions. */
    extensions?: AuthenticationExtensions | undefined;
};
/** Parameters for `navigator.credentials.get()`. */
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
    userVerification?: UserVerificationRequirement | undefined;
    /** Additional parameters requesting additional processing by the browser and authenticator. For example, if transaction confirmation is sought from the user, then the prompt string might be included as an extension. */
    extensions?: AuthenticationExtensions | undefined;
};
/** Credential type for WebAuthn. */
export type PublicKeyCredentialType = "public-key";
/** Used to supply additional Relying Party attributes when creating a new credential. */
export type RelyingPartyEntity = {
    /** A human-palatable identifier for the Relying Party, intended only for display. */
    name: string;
    /** A URL which resolves to an image associated with the Relying Party, for example its logo. */
    icon?: string | undefined;
    /** A unique identifier for the Relying Party. */
    id: string;
};
/** Data that should be stored securely (anti-tamper) by the Relying Party for the duration of the registration or login ceremony. */
export type SessionData = {
    /** Challenge that was sent to the browser. */
    challenge: string;
    /** (**base64**) ID of the user being registered or logged in. */
    user_id: string;
    /** Credentials allowed in this login or registration ceremony. */
    allowed_credentials?: string[] | undefined;
    /** When this data expires */
    expires: string;
    /** Required user verification in this login or registration ceremony. */
    userVerification: UserVerificationRequirement;
    /** Contains additional parameters requesting additional processing by the client and authenticator. */
    extensions?: AuthenticationExtensions | undefined;
};
/** Represents the WebAuthn timeouts configuration for either registration or login. */
export type TimeoutConfig = {
    /** Enforce the timeouts at the Relying Party / Server. This means if enabled and the user takes too long that even if the browser does not enforce the timeout the Relying Party / Server will. */
    Enforce: boolean;
    /** The timeout in nanoseconds for logins/registrations when the UserVerificationRequirement is set to anything other than discouraged. */
    Timeout: number;
    /** The timeout in nanoseconds for logins/registrations when the UserVerificationRequirement is set to discouraged. */
    TimeoutUVD: number;
};
/** Represents the WebAuthn timeouts configuration. */
export type TimeoutsConfig = {
    /** Timeouts for login. */
    Login: TimeoutConfig;
    /** Timeouts for registration. */
    Registration: TimeoutConfig;
};
/** Indicates the respective authenticator can be contacted over Bluetooth Smart (Bluetooth Low Energy / BLE). */
export type TransportBLE = "ble";
/** Indicates the respective authenticator can be contacted using a combination of (often separate) data-transport and proximity mechanisms. This supports, for example, authentication on a desktop computer using a smartphone. */
export type TransportHybrid = "hybrid";
/** Indicates the respective authenticator is contacted using a client device-specific transport, i.e., it is a platform authenticator. These authenticators are not removable from the client device. */
export type TransportInternal = "internal";
/** Indicates the respective authenticator can be contacted over Near Field Communication (NFC). */
export type TransportNFC = "nfc";
/** Indicates the respective authenticator can be contacted over removable USB */
export type TransportUSB = "usb";
/** (**base64**) URL-encoded base64 data. */
export type URLEncodedBase64 = string;
/** Represents an application (Relying Party) user. */
export type User = {
    /** (**base64**) User ID according to the Relying Party. */
    id: string;
    /** User Name according to the Relying Party. */
    name: string;
    /** Display Name of the user. */
    displayName: string;
    /** @deprecated This has been removed from the specification recommendation. Suggest a blank string. */
    iconURL: string;
    /** Credentials owned by the user. */
    credentials: Credential[];
};
/** Supplies additional user account attributes when creating a new credential. */
export type UserEntity = {
    /** A human-palatable identifier for the user account, intended only for display to aid the user in determining the difference between user accounts with similar `displayName`s. */
    name: string;
    /** @deprecated This has been removed from the specification recommendations. */
    icon?: string | undefined;
    /** A human-palatable name for the user account, intended only for display. */
    displayName: string;
    /** The user handle of the user account. *//* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    id?: any;
};
/** The authenticator should not verify the user for the credential. */
export type UserVerificationDiscouraged = "discouraged";
/** User verification is preferred to create/use a credential. This is the default if no user verification requirement is specified. */
export type UserVerificationPreferred = "preferred";
/** User verification is required to create/use a credential. */
export type UserVerificationRequired = "required";
/** @defaultValue {@link UserVerificationPreferred} */
export type UserVerificationRequirement = UserVerificationRequired | UserVerificationPreferred | UserVerificationDiscouraged;

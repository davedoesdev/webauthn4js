import { z } from "zod";
export const AuthenticationExtensions = z.record(z.any()).describe("Contains additional parameters requesting additional processing by the client and authenticator.eslint-disable-next-line @typescript-eslint/no-explicit-any");
export const AuthenticationExtensionsClientOutputs = z.record(z.any()).describe("Contains the results of processing client extensions requested by the Relying Party.eslint-disable-next-line @typescript-eslint/no-explicit-any");
export const Authenticator = z.object({ "AAGUID": z.string().describe("(**base64**) Identifies the type (e.g. make and model) of the authenticator."), "signCount": z.number().int().describe("{@link WebAuthn4JS.finishLogin} compares the stored signature counter value with the new `signCount` value returned in the assertion’s authenticator data. If this new `signCount` value is less than or equal to the stored value, a cloned authenticator may exist, or the authenticator may be malfunctioning."), "cloneWarning": z.boolean().describe("This is a signal that the authenticator may be cloned, i.e. at least two copies of the credential private key may exist and are being used in parallel. Relying Parties (applications) should incorporate this information into their risk scoring. Whether the Relying Party updates the stored signature counter value in this case, or not, or fails the authentication ceremony or not, is Relying Party-specific."), "attachment": z.literal("#/$defs/AuthenticatorAttachment").describe("The {@link AuthenticatorSelection.authenticatorAttachment} value returned by the request.") }).strict().describe("Represents the user's authenticator device.");
export const AuthenticatorAssertionResponse = z.object({ "clientDataJSON": z.literal("#/$defs/URLEncodedBase64").describe("Contains a JSON serialization of the client data passed to the authenticator by the browser in its call to navigator.credentials.get()."), "authenticatorData": z.literal("#/$defs/URLEncodedBase64").describe("Serialized bindings made by the authenticator, such as ID of the Relying Party that the credential is meant for, whether the user is present and the signature count."), "signature": z.literal("#/$defs/URLEncodedBase64").describe("The raw signature returned from the authenticator."), "userHandle": z.literal("#/$defs/URLEncodedBase64").describe("Contains the Relying Party's ID for the user").optional() }).strict().describe("Contains the raw authenticator assertion data, used to verify the authenticity of the login ceremony and the used credential.");
export const AuthenticatorAttestationResponse = z.object({ "clientDataJSON": z.literal("#/$defs/URLEncodedBase64").describe("Contains a JSON serialization of the client data passed to the authenticator by the browser in its call to navigator.credentials.create()."), "attestationObject": z.literal("#/$defs/URLEncodedBase64").describe("This attribute contains an attestation object, which is opaque to, and cryptographically protected against tampering by, the browser. The attestation object contains both authenticator data and an attestation statement. The former contains the AAGUID, a unique credential ID, and the credential public key. The contents of the attestation statement are determined by the attestation statement format used by the authenticator.  It also contains any additional information that the Relying Party's server requires to validate the attestation statement, as well as to decode and validate the authenticator data along with the JSON-serialized client data."), "transports": z.array(z.string()).describe("These values are the transports that the authenticator is believed to support, or an empty sequence if the information is unavailable.").optional() }).strict().describe("Contains the raw authenticator attestation data, used to verify the authenticy of the registration ceremony and the new credential.");
export const AuthenticatorSelection = z.object({ "authenticatorAttachment": z.literal("#/$defs/AuthenticatorAttachment").describe("If this member is present, eligible authenticators are filtered to only authenticators attached by the specified mechanism.").optional(), "requireResidentKey": z.boolean().describe("Describes the Relying Party's requirements regarding resident credentials. If present and set to `true`, the authenticator MUST create a client-side-resident public key credential source when creating a public key credential. @defaultValue false").default(false), "residentKey": z.string().describe("Specifies the extent to which the Relying Party desires to create a client-side discoverable credential. For historical reasons the naming retains the deprecated “resident” terminology.").optional(), "userVerification": z.literal("#/$defs/UserVerificationRequirement").describe("Describes the Relying Party's requirements regarding user verification for the `navigator.credentials.create()` or `navigator.credentials.get()` operation. Eligible authenticators are filtered to only those capable of satisfying this requirement.").optional() }).strict().describe("Use this class to specify requirements regarding authenticator attributes.");
export const Config = z.object({ "RPID": z.string().describe("A valid domain that identifies the Relying Party. A credential can only by used  with the same enity (as identified by the `RPID`) it was registered with."), "RPDisplayName": z.string().describe("Friendly name for the Relying Party (application). The browser may display this to the user."), "RPOrigins": z.array(z.string()).describe("Configures the list of Relying Party Server Origins that are permitted. These should be fully qualified origins."), "AttestationPreference": z.literal("#/$defs/ConveyancePreference").describe("Preferred attestation conveyance during credential generation").optional(), "AuthenticatorSelection": z.literal("#/$defs/AuthenticatorSelection").describe("Login requirements for authenticator attributes.").optional(), "Debug": z.boolean().describe("Enables various debug options.").optional(), "EncodeUserIDAsString": z.boolean().describe("Ensures the user.id value during registrations is encoded as a raw UTF8 string. This is useful when you only use printable ASCII characters for the random user.id but the browser library does not decode the URL Safe Base64 data.").optional(), "Timeouts": z.literal("#/$defs/TimeoutsConfig").describe("Configures various timeouts.").optional(), "RPIcon": z.string().describe("@deprecated This option has been removed from newer specifications due to security considerations.").optional(), "RPOrigin": z.string().describe("@deprecated Use RPOrigins instead.").optional(), "Timeout": z.number().int().describe("@deprecated Use Timeouts instead.").optional() }).strict().describe("Configuration and default values for the {@link WebAuthn4JS} instance.");
export const Credential = z.object({ "id": z.string().describe("(**base64**) A probabilistically-unique byte sequence identifying a public key credential source and its authentication assertions."), "publicKey": z.string().describe("(**base64**) The public key portion of a Relying Party-specific credential key pair, generated by an authenticator and returned to a Relying Party at registration time."), "attestationType": z.string().describe("The attestation format used (if any) by the authenticator when creating the credential."), "transport": z.array(z.literal("#/$defs/AuthenticatorTransport")).describe("The transport types the authenticator supports."), "flags": z.literal("#/$defs/CredentialFlags").describe("The commonly stored flags."), "authenticator": z.literal("#/$defs/Authenticator").describe("The Authenticator information for a given certificate.") }).strict().describe("Contains all needed information about a WebAuthn credential for storage.");
export const CredentialAssertion = z.object({ "publicKey": z.literal("#/$defs/PublicKeyCredentialRequestOptions").describe("Options for the browser to pass to `navigator.credentials.get()`.") }).strict().describe("The payload that should be sent to the browser for beginning the login process.");
export const CredentialAssertionResponse = z.object({ "id": z.string().describe("The credential's identifier."), "type": z.literal("#/$defs/PublicKeyCredentialType").describe("Specifies the credential type represented by this object."), "rawId": z.literal("#/$defs/URLEncodedBase64").describe("The credential's identifier. Since we base64-encode raw data, this is the same as `id`."), "clientExtensionResults": z.literal("#/$defs/AuthenticationExtensionsClientOutputs").describe("A map containing identifier -> client extension output entries produced by any extensions that may have been used during login.").optional(), "authenticatorAttachment": z.literal("#/$defs/AuthenticatorAttachment").describe("If this member is present, eligible authenticators are filtered to only authenticators attached by the specified mechanism.").optional(), "response": z.literal("#/$defs/AuthenticatorAssertionResponse").describe("The authenticator's response to the request to generate a login assertion.") }).strict().describe("The raw response returned to us from an authenticator when we request a credential for login.");
export const CredentialCreation = z.object({ "publicKey": z.literal("#/$defs/PublicKeyCredentialCreationOptions").describe("Options for the browser to pass to `navigator.credentials.create()`.") }).strict().describe("The payload that should be sent to the browser for beginning the registration process.");
export const CredentialCreationResponse = z.object({ "id": z.string().describe("The credential's identifier."), "type": z.literal("#/$defs/PublicKeyCredentialType").describe("Specifies the credential type represented by this object."), "rawId": z.literal("#/$defs/URLEncodedBase64").describe("The credential's identifier. Since we base64-encode raw data, this is the same as `id`."), "clientExtensionResults": z.literal("#/$defs/AuthenticationExtensionsClientOutputs").describe("A map containing identifier -> client extension output entries produced by any extensions that may have been used during registration.").optional(), "authenticatorAttachment": z.literal("#/$defs/AuthenticatorAttachment").describe("If this member is present, eligible authenticators are filtered to only authenticators attached by the specified mechanism.").optional(), "response": z.literal("#/$defs/AuthenticatorAttestationResponse").describe("The authenticator's response to the request to generate a registration attestation."), "transports": z.array(z.string()).describe("@deprecated Deprecated due to upstream changes to the API. Use {@link AuthenticatorAttestationResponse.transports} instead.").optional() }).strict().describe("The raw response returned to us from an authenticator when we request a credential for registration.");
export const CredentialDescriptor = z.object({ "type": z.literal("#/$defs/CredentialType").describe("Type of the credential to use."), "id": z.literal("#/$defs/URLEncodedBase64").describe("The ID of a credential to allow/disallow."), "transports": z.array(z.literal("#/$defs/AuthenticatorTransport")).describe("The authenticator transports that can be used.").optional() }).strict().describe("Specifies a credential for use by the browser when it calls `navigator.credentials.create()` or `navigator.credentials.get()`.");
export const CredentialFlags = z.object({ "userPresent": z.boolean().describe("Indicates the users presence."), "userVerified": z.boolean().describe("Indicates the user performed verification."), "backupEligible": z.boolean().describe("Indicates the credential is able to be backed up and/or sync'd between devices. This should NEVER change."), "backupState": z.boolean().describe("Indicates the credential has been backed up and/or sync'd. This value can change but it's recommended that RP's keep track of this value.") }).strict().describe("Flags associated with a credential");
export const CredentialParameter = z.object({ "type": z.literal("#/$defs/CredentialType").describe("Type of the credential to use."), "alg": z.literal("#/$defs/COSEAlgorithmIdentifier").describe("Algorithm to use, see the [IANA CBOR COSE Algorithms Registry](https://www.iana.org/assignments/cose/cose.xhtml#algorithms).") }).strict().describe("The credential type and algorithm that the Relying Party wants the authenticator to create.");
export const PublicKeyCredentialCreationOptions = z.object({ "rp": z.literal("#/$defs/RelyingPartyEntity").describe("Data about the Relying Party responsible for the request (i.e. your application)"), "user": z.literal("#/$defs/UserEntity").describe("Data about the user account for which the Relying Party is requesting attestation."), "challenge": z.literal("#/$defs/URLEncodedBase64").describe("A challenge intended to be used for generating the newly created credential’s attestation."), "pubKeyCredParams": z.array(z.literal("#/$defs/CredentialParameter")).describe(" Information about the desired properties of the credential to be created. The sequence is ordered from most preferred to least preferred. The browser makes a best-effort to create the most preferred credential that it can.").optional(), "timeout": z.number().int().describe("Specifies a time, in milliseconds, that the caller is willing to wait for the call to complete. This is treated as a hint, and may be overridden by the browser.").optional(), "excludeCredentials": z.array(z.literal("#/$defs/CredentialDescriptor")).describe("This member is intended for use by Relying Parties that wish to limit the creation of multiple credentials for the same account on a single authenticator. The browser is requested to return an error if the new credential would be created on an authenticator that also contains one of the credentials enumerated in this parameter.").optional(), "authenticatorSelection": z.literal("#/$defs/AuthenticatorSelection").describe("Registration requirements for authenticator attributes.").optional(), "attestation": z.literal("#/$defs/ConveyancePreference").describe("This member is intended for use by Relying Parties that wish to express their preference for attestation conveyance.").optional(), "extensions": z.literal("#/$defs/AuthenticationExtensions").describe("Additional parameters requesting additional processing by the browser and authenticator. For example, the caller may request that only authenticators with certain capabilities be used to create the credential, or that particular information be returned in the attestation object. Some extensions are defined in [WebAuthn Extensions](https://www.w3.org/TR/webauthn/#extensions); consult the IANA \"WebAuthn Extension Identifier\" registry established by [WebAuthn-Registries](https://tools.ietf.org/html/draft-hodges-webauthn-registries) for an up-to-date list of registered WebAuthn Extensions.").optional() }).strict().describe("Parameters for `navigator.credentials.create()`.");
export const PublicKeyCredentialRequestOptions = z.object({ "challenge": z.literal("#/$defs/URLEncodedBase64").describe("A challenge that the selected authenticator signs, along with other data, when producing a login assertion."), "timeout": z.number().int().describe("Specifies a time, in milliseconds, that the caller is willing to wait for the call to complete. This is treated as a hint, and may be overridden by the browser.").optional(), "rpId": z.string().describe("Specifies the Relying Party identifier claimed by the application. If omitted, its value will be the application's origin's effective domain.").optional(), "allowCredentials": z.array(z.literal("#/$defs/CredentialDescriptor")).describe("A list of public key credentials acceptable to the caller, in descending order of preference (the first item in the list is the most preferred credential, and so on down the list).").optional(), "userVerification": z.literal("#/$defs/UserVerificationRequirement").describe("Describes the Relying Party's requirements regarding user verification for the `navigator.credentials.get()` operation. Eligible authenticators are filtered to only those capable of satisfying this requirement.").optional(), "extensions": z.literal("#/$defs/AuthenticationExtensions").describe("Additional parameters requesting additional processing by the browser and authenticator. For example, if transaction confirmation is sought from the user, then the prompt string might be included as an extension.").optional() }).strict().describe("Parameters for `navigator.credentials.get()`.");
export const RelyingPartyEntity = z.object({ "name": z.string().describe("A human-palatable identifier for the Relying Party, intended only for display."), "icon": z.string().describe("A URL which resolves to an image associated with the Relying Party, for example its logo.").optional(), "id": z.string().describe("A unique identifier for the Relying Party.") }).strict().describe("Used to supply additional Relying Party attributes when creating a new credential.");
export const SessionData = z.object({ "challenge": z.string().describe("Challenge that was sent to the browser."), "user_id": z.string().describe("(**base64**) ID of the user being registered or logged in."), "allowed_credentials": z.array(z.string().describe("(**base64**)")).describe("Credentials allowed in this login or registration ceremony.").optional(), "expires": z.string().datetime().describe("When this data expires"), "userVerification": z.literal("#/$defs/UserVerificationRequirement").describe("Required user verification in this login or registration ceremony."), "extensions": z.literal("#/$defs/AuthenticationExtensions").describe("Contains additional parameters requesting additional processing by the client and authenticator.").optional() }).strict().describe("Data that should be stored securely (anti-tamper) by the Relying Party for the duration of the registration or login ceremony.");
export const TimeoutConfig = z.object({ "Enforce": z.boolean().describe("Enforce the timeouts at the Relying Party / Server. This means if enabled and the user takes too long that even if the browser does not enforce the timeout the Relying Party / Server will."), "Timeout": z.number().int().describe("The timeout in nanoseconds for logins/registrations when the UserVerificationRequirement is set to anything other than discouraged."), "TimeoutUVD": z.number().int().describe("The timeout in nanoseconds for logins/registrations when the UserVerificationRequirement is set to discouraged.") }).strict().describe("Represents the WebAuthn timeouts configuration for either registration or login.");
export const TimeoutsConfig = z.object({ "Login": z.literal("#/$defs/TimeoutConfig").describe("Timeouts for login."), "Registration": z.literal("#/$defs/TimeoutConfig").describe("Timeouts for registration.") }).strict().describe("Represents the WebAuthn timeouts configuration.");
export const URLEncodedBase64 = z.string().describe("(**base64**) URL-encoded base64 data.");
export const User = z.object({ "id": z.string().describe("(**base64**) User ID according to the Relying Party."), "name": z.string().describe("User Name according to the Relying Party."), "displayName": z.string().describe("Display Name of the user."), "iconURL": z.string().describe("@deprecated This has been removed from the specification recommendation. Suggest a blank string."), "credentials": z.array(z.literal("#/$defs/Credential")).describe("Credentials owned by the user.") }).strict().describe("Represents an application (Relying Party) user.");
export const UserEntity = z.object({ "name": z.string().describe("A human-palatable identifier for the user account, intended only for display to aid the user in determining the difference between user accounts with similar `displayName`s."), "icon": z.string().describe("@deprecated This has been removed from the specification recommendations.").optional(), "displayName": z.string().describe("A human-palatable name for the user account, intended only for display."), "id": z.any().describe("The user handle of the user account. *//* eslint-disable-next-line @typescript-eslint/no-explicit-any") }).strict().describe("Supplies additional user account attributes when creating a new credential.");
export const AuthenticatorAttachment = z.union([z.literal("#/$defs/PlatformAttachment"), z.literal("#/$defs/CrossPlatformAttachment")]);
export const PlatformAttachment = z.literal("platform").describe("A platform authenticator is attached using a client device-specific transport, called platform attachment, and is usually not removable from the client device. A public key credential bound to a platform authenticator is called a platform credential.");
export const CrossPlatformAttachment = z.literal("cross-platform").describe("A roaming authenticator is attached using cross-platform transports, called cross-platform attachment. Authenticators of this class are removable from, and can \"roam\" among, client devices. A public key credential bound to a roaming authenticator is called a roaming credential.");
export const UserVerificationRequirement = z.union([z.literal("#/$defs/UserVerificationRequired"), z.literal("#/$defs/UserVerificationPreferred"), z.literal("#/$defs/UserVerificationDiscouraged")]).describe("@defaultValue {@link UserVerificationPreferred}");
export const UserVerificationRequired = z.literal("required").describe("User verification is required to create/use a credential.");
export const UserVerificationPreferred = z.literal("preferred").describe("User verification is preferred to create/use a credential. This is the default if no user verification requirement is specified.");
export const UserVerificationDiscouraged = z.literal("discouraged").describe("The authenticator should not verify the user for the credential.");
export const ConveyancePreference = z.union([z.literal("#/$defs/PreferNoAttestation"), z.literal("#/$defs/PreferIndirectAttestation"), z.literal("#/$defs/PreferDirectAttestation"), z.literal("#/$defs/PreferEnterpriseAttestation")]).describe("@defaultValue {@link PreferNoAttestation}");
export const PreferNoAttestation = z.literal("none").describe("Indicates that the Relying Party is not interested in authenticator attestation. For example, in order to potentially avoid having to obtain user consent to relay identifying information to the Relying Party, or to save a roundtrip to an Attestation CA. This is the default if no attestation conveyance is specified.");
export const PreferIndirectAttestation = z.literal("indirect").describe("Indicates that the Relying Party prefers an attestation conveyance yielding verifiable attestation statements, but allows the client to decide how to obtain such attestation statements. The client MAY replace the authenticator-generated attestation statements with attestation statements generated by an Anonymization CA, in order to protect the user’s privacy, or to assist Relying Parties with attestation verification in a heterogeneous ecosystem.");
export const PreferDirectAttestation = z.literal("direct").describe("Indicates that the Relying Party wants to receive the attestation statement as generated by the authenticator.");
export const PreferEnterpriseAttestation = z.literal("enterprise").describe("Indicates that the Relying Party wants to receive an attestation statement that may include uniquely identifying information. This is intended for controlled deployments within an enterprise where the organization wishes to tie registrations to specific authenticators. User agents MUST NOT provide such an attestation unless the user agent or authenticator configuration permits it for the requested RP ID. If permitted, the user agent SHOULD signal to the authenticator (at invocation time) that enterprise attestation is requested, and convey the resulting AAGUID and attestation statement, unaltered, to the Relying Party.");
export const CredentialType = z.literal("#/$defs/PublicKeyCredentialType");
export const PublicKeyCredentialType = z.literal("public-key").describe("Credential type for WebAuthn.");
export const COSEAlgorithmIdentifier = z.union([z.literal("#/$defs/AlgES256"), z.literal("#/$defs/AlgES384"), z.literal("#/$defs/AlgES512"), z.literal("#/$defs/AlgRS1"), z.literal("#/$defs/AlgRS256"), z.literal("#/$defs/AlgRS384"), z.literal("#/$defs/AlgRS512"), z.literal("#/$defs/AlgPS256"), z.literal("#/$defs/AlgPS384"), z.literal("#/$defs/AlgPS512"), z.literal("#/$defs/AlgEdDSA"), z.literal("#/$defs/AlgES256K")]);
export const AlgES256 = z.literal(-7).describe("ECDSA with SHA-256");
export const AlgES384 = z.literal(-35).describe("ECDSA with SHA-384");
export const AlgES512 = z.literal(-36).describe("ECDSA with SHA-512");
export const AlgRS1 = z.literal(-65535).describe("RSASSA-PKCS1-v1_5 with SHA-1");
export const AlgRS256 = z.literal(-257).describe("RSASSA-PKCS1-v1_5 with SHA-256");
export const AlgRS384 = z.literal(-258).describe("RSASSA-PKCS1-v1_5 with SHA-384");
export const AlgRS512 = z.literal(-259).describe("RSASSA-PKCS1-v1_5 with SHA-512");
export const AlgPS256 = z.literal(-37).describe("RSASSA-PSS with SHA-256");
export const AlgPS384 = z.literal(-38).describe("RSASSA-PSS with SHA-384");
export const AlgPS512 = z.literal(-39).describe("RSASSA-PSS with SHA-512");
export const AlgEdDSA = z.literal(-8).describe("EdDSA");
export const AlgES256K = z.literal(-47).describe("ECDSA using secp256k1 curve and SHA-256.");
export const AuthenticatorTransport = z.union([z.literal("#/$defs/TransportUSB"), z.literal("#/$defs/TransportNFC"), z.literal("#/$defs/TransportBLE"), z.literal("#/$defs/TransportHybrid"), z.literal("#/$defs/TransportInternal")]);
export const TransportUSB = z.literal("usb").describe("Indicates the respective authenticator can be contacted over removable USB");
export const TransportNFC = z.literal("nfc").describe("Indicates the respective authenticator can be contacted over Near Field Communication (NFC).");
export const TransportBLE = z.literal("ble").describe("Indicates the respective authenticator can be contacted over Bluetooth Smart (Bluetooth Low Energy / BLE).");
export const TransportHybrid = z.literal("hybrid").describe("Indicates the respective authenticator can be contacted using a combination of (often separate) data-transport and proximity mechanisms. This supports, for example, authentication on a desktop computer using a smartphone.");
export const TransportInternal = z.literal("internal").describe("Indicates the respective authenticator is contacted using a client device-specific transport, i.e., it is a platform authenticator. These authenticators are not removable from the client device.");

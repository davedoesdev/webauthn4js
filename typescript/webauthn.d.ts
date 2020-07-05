/* tslint:disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * Indicates that the Relying Party is not interested in authenticator attestation. For example, in order to potentially avoid having to obtain user consent to relay identifying information to the Relying Party, or to save a roundtrip to an Attestation CA. This is the default if no attestation conveyance is specified.
 */
export type PreferNoAttestation = "none";
/**
 * Indicates that the Relying Party prefers an attestation conveyance yielding verifiable attestation statements, but allows the client to decide how to obtain such attestation statements. The client MAY replace the authenticator-generated attestation statements with attestation statements generated by an Anonymization CA, in order to protect the user’s privacy, or to assist Relying Parties with attestation verification in a heterogeneous ecosystem.
 */
export type PreferIndirectAttestation = "indirect";
/**
 * Indicates that the Relying Party wants to receive the attestation statement as generated by the authenticator.
 */
export type PreferDirectAttestation = "direct";
/**
 * A platform authenticator is attached using a client device-specific transport, called platform attachment, and is usually not removable from the client device. A public key credential bound to a platform authenticator is called a platform credential.
 */
export type PlatformAttachment = "platform";
/**
 * A roaming authenticator is attached using cross-platform transports, called cross-platform attachment. Authenticators of this class are removable from, and can "roam" among, client devices. A public key credential bound to a roaming authenticator is called a roaming credential.
 */
export type CrossPlatformAttachment = "cross-platform";
/**
 * User verification is required to create/use a credential.
 */
export type UserVerificationRequired = "required";
/**
 * User verification is preferred to create/use a credential. This is the default if no user verification requirement is specified.
 */
export type UserVerificationPreferred = "preferred";
/**
 * The authenticator should not verify the user for the credential.
 */
export type UserVerificationDiscouraged = "discouraged";
/**
 * Credential type for WebAuthn.
 */
export type PublicKeyCredentialType = "public-key";
/**
 * ECDSA with SHA-256
 */
export type AlgES256 = -7;
/**
 * ECDSA with SHA-384
 */
export type AlgES384 = -35;
/**
 * ECDSA with SHA-512
 */
export type AlgES512 = -36;
/**
 * RSASSA-PKCS1-v1_5 with SHA-1
 */
export type AlgRS1 = -65535;
/**
 * RSASSA-PKCS1-v1_5 with SHA-256
 */
export type AlgRS256 = -257;
/**
 * RSASSA-PKCS1-v1_5 with SHA-384
 */
export type AlgRS384 = -258;
/**
 * RSASSA-PKCS1-v1_5 with SHA-512
 */
export type AlgRS512 = -259;
/**
 * RSASSA-PSS with SHA-256
 */
export type AlgPS256 = -37;
/**
 * RSASSA-PSS with SHA-384
 */
export type AlgPS384 = -38;
/**
 * RSASSA-PSS with SHA-512
 */
export type AlgPS512 = -39;
/**
 * EdDSA
 */
export type AlgEdDSA = -8;

/**
 * Configuration and default values for the {@link WebAuthn4JS} instance.
 */
export interface Config {
  /**
   * Friendly name for the Relying Party (application). The browser may display this to the user.
   */
  RPDisplayName: string;
  /**
   * A valid domain that identifies the Relying Party. A credential can only by used  with the same enity (as identified by the `RPID`) it was registered with.
   */
  RPID: string;
  /**
   * The HTTP(S) origin that the Relying Party is using to handle requests
   */
  RPOrigin?: string;
  /**
   * URL to an icon representing the Relying Party
   */
  RPIcon?: string;
  /**
   * Preferred attestation conveyance during credential generation
   */
  AttestationPreference?: PreferNoAttestation | PreferIndirectAttestation | PreferDirectAttestation;
  /**
   * Login requirements for authenticator attributes.
   */
  AuthenticatorSelection?: AuthenticatorSelection;
  /**
   * Timeout for browser `navigator.credentials.create()` and `navigator.credentials.debug()` in the browser.
   */
  Timeout?: number;
  /**
   * @ignore
   */
  Debug?: boolean;
}
/**
 * Use this class to specify requirements regarding authenticator attributes.
 */
export interface AuthenticatorSelection {
  /**
   * If this member is present, eligible authenticators are filtered to only authenticators attached by the specified mechanism.
   */
  authenticatorAttachment?: PlatformAttachment | CrossPlatformAttachment;
  /**
   * Describes the Relying Party's requirements regarding resident credentials. If present and set to `true`, the authenticator MUST create a client-side-resident public key credential source when creating a public key credential.
   */
  requireResidentKey?: boolean;
  /**
   * Describes the Relying Party's requirements regarding user verification for the `navigator.credentials.create()` or `navigator.credentials.get()` operation. Eligible authenticators are filtered to only those capable of satisfying this requirement.
   */
  userVerification?: UserVerificationRequired | UserVerificationPreferred | UserVerificationDiscouraged;
}
export interface User {
  id: string;
  name: string;
  displayName: string;
  iconURL: string;
  credentials: Credential[];
}
/**
 * Contains all needed information about a WebAuthn credential for storage.
 */
export interface Credential {
  /**
   * A probabilistically-unique byte sequence identifying a public key credential source and its authentication assertions.
   */
  ID: string;
  /**
   * The public key portion of a Relying Party-specific credential key pair, generated by an authenticator and returned to a Relying Party at registration time.
   */
  PublicKey: string;
  /**
   * The attestation format used (if any) by the authenticator when creating the credential.
   */
  AttestationType: string;
  /**
   * The Authenticator information for a given certificate.
   */
  Authenticator: Authenticator;
}
/**
 * Represents the user's authenticator device.
 */
export interface Authenticator {
  /**
   * Identifies the type (e.g. make and model) of the authenticator.
   */
  AAGUID: string;
  /**
   * {@link finishLogin} compares the stored signature counter value with the new `signCount` value returned in the assertion’s authenticator data. If this new `signCount` value is less than or equal to the stored value, a cloned authenticator may exist, or the authenticator may be malfunctioning.
   */
  SignCount: number;
  /**
   * This is a signal that the authenticator may be cloned, i.e. at least two copies of the credential private key may exist and are being used in parallel. Relying Parties (applications) should incorporate this information into their risk scoring. Whether the Relying Party updates the stored signature counter value in this case, or not, or fails the authentication ceremony or not, is Relying Party-specific.
   */
  CloneWarning: boolean;
}
/**
 * The payload that should be sent to the browser for beginning the registration process.
 */
export interface CredentialCreation {
  /**
   * Options for the browser to pass to `navigator.credentials.create()`.
   */
  publicKey: PublicKeyCredentialCreationOptions;
}
/**
 * Parameters for `navigator.credentials.create()`.
 */
export interface PublicKeyCredentialCreationOptions {
  challenge: string;
  rp: RelyingPartyEntity;
  user: UserEntity;
  pubKeyCredParams?: CredentialParameter[];
  /**
   * Registration requirements for authenticator attributes.
   */
  authenticatorSelection?: AuthenticatorSelection;
  timeout?: number;
  excludeCredentials?: CredentialDescriptor[];
  extensions?: {
    /**
     * This interface was referenced by `undefined`'s JSON-Schema definition
     * via the `patternProperty` ".*".
     */
    [k: string]: {
      [k: string]: unknown;
    };
  };
  attestation?: string;
}
export interface RelyingPartyEntity {
  name: string;
  icon?: string;
  id: string;
}
export interface UserEntity {
  name: string;
  icon?: string;
  displayName?: string;
  id: string;
}
/**
 * The credential type and algorithm that the relying party wants the authenticator to create.
 */
export interface CredentialParameter {
  /**
   * Type of the credential to use.
   */
  type: PublicKeyCredentialType;
  /**
   * Algorithm to use, see the [IANA CBOR COSE Algorithms Registry](https://www.iana.org/assignments/cose/cose.xhtml#algorithms)
   */
  alg:
    | AlgES256
    | AlgES384
    | AlgES512
    | AlgRS1
    | AlgRS256
    | AlgRS384
    | AlgRS512
    | AlgPS256
    | AlgPS384
    | AlgPS512
    | AlgEdDSA;
}
/**
 * Specifies a credential for use by the browser when it calls `navigator.credentials.create()` or `navigator.credentials.get()`.
 */
export interface CredentialDescriptor {
  /**
   * Type of the credential to use.
   */
  type: PublicKeyCredentialType;
  /**
   * The ID of a credential to allow/disallow.
   */
  id: string;
  /**
   * Contains a hint as to how the browser might communicate with the authenticator to which the credential belongs.
   */
  transports?: string[];
}
/**
 * The raw response returned to us from an authenticator when we request a credential for registration.
 */
export interface CredentialCreationResponse {
  /**
   * The credential's identifier.
   */
  id: string;
  /**
   * Specifies the credential type represented by this object.
   */
  type: PublicKeyCredentialType;
  /**
   * The credential's identifier. Since we base64-encode raw data, this is the same as `id`.
   */
  rawId: string;
  /**
   * A map containing identifier -> client extension output entries produced by any extensions that may have been used during registration.
   */
  extensions?: {
    /**
     * This interface was referenced by `undefined`'s JSON-Schema definition
     * via the `patternProperty` ".*".
     */
    [k: string]: {
      [k: string]: unknown;
    };
  };
  /**
   * The authenticator's response to the request to generate a registration attestation.
   */
  response: AuthenticatorAttestationResponse;
}
/**
 * Contains the raw authenticator attestation data, used to verify the authenticy of the registration ceremony and the new credential.
 */
export interface AuthenticatorAttestationResponse {
  /**
   * Contains a JSON serialization of the client data passed to the authenticator by the browser in its call to navigator.credentials.create().
   */
  clientDataJSON: string;
  /**
   * This attribute contains an attestation object, which is opaque to, and cryptographically protected against tampering by, the browser. The attestation object contains both authenticator data and an attestation statement. The former contains the AAGUID, a unique credential ID, and the credential public key. The contents of the attestation statement are determined by the attestation statement format used by the authenticator.  It also contains any additional information that the Relying Party's server requires to validate the attestation statement, as well as to decode and validate the authenticator data along with the JSON-serialized client data.
   */
  attestationObject: string;
}
/**
 * The payload that should be sent to the browser for beginning the login process.
 */
export interface CredentialAssertion {
  /**
   * Options for the browser to pass to `navigator.credentials.get()`.
   */
  publicKey: PublicKeyCredentialRequestOptions;
}
/**
 * FOOBAR
 */
export interface PublicKeyCredentialRequestOptions {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: CredentialDescriptor[];
  userVerification?: string;
  extensions?: {
    /**
     * This interface was referenced by `undefined`'s JSON-Schema definition
     * via the `patternProperty` ".*".
     */
    [k: string]: {
      [k: string]: unknown;
    };
  };
}
/**
 * The raw response returned to us from an authenticator when we request a credential for login.
 */
export interface CredentialAssertionResponse {
  /**
   * The credential's identifier.
   */
  id: string;
  /**
   * Specifies the credential type represented by this object.
   */
  type: PublicKeyCredentialType;
  /**
   * The credential's identifier. Since we base64-encode raw data, this is the same as `id`.
   */
  rawId: string;
  /**
   * A map containing identifier -> client extension output entries produced by any extensions that may have been used during login.
   */
  extensions?: {
    /**
     * This interface was referenced by `undefined`'s JSON-Schema definition
     * via the `patternProperty` ".*".
     */
    [k: string]: {
      [k: string]: unknown;
    };
  };
  /**
   * The authenticator's response to the request to generate a login assertion.
   */
  response: AuthenticatorAssertionResponse;
}
/**
 * Contains the raw authenticator assertion data, used to verify the authenticity of the login ceremony and the used credential.
 */
export interface AuthenticatorAssertionResponse {
  /**
   * Contains a JSON serialization of the client data passed to the authenticator by the browser in its call to navigator.credentials.get().
   */
  clientDataJSON: string;
  /**
   * Serialized bindings made by the authenticator, such as ID of the Relying Party that the credential is meant for, whether the user is present and the signature count.
   */
  authenticatorData: string;
  /**
   * The raw signature returned from the authenticator.
   */
  signature: string;
  /**
   * Contains the Relying Party's ID for the user
   */
  userHandle?: string;
}
export interface SessionData {
  challenge: string;
  user_id: string;
  allowed_credentials?: string[];
  userVerification: string;
}

import { SessionData } from '../../typescript/webauthn';

export interface ISecretSessionData {
    ciphertext : string,
    nonce : string
}

export function make_secret_session_data(
    username : string,
    type : string,
    session_data : SessionData) : Promise<ISecretSessionData>;

export function verify_secret_session_data(
    expected_username : string,
    expected_type : string,
    secret_session_data : ISecretSessionData) : Promise<SessionData> 

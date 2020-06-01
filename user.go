package main

import "github.com/duo-labs/webauthn/webauthn"

type User struct {
    ID          []byte                `json:"id"`
    Name        string                `json:"name"`
    DisplayName string                `json:"displayName"`
    IconURL     string                `json:"iconURL"`
    Credentials []webauthn.Credential `json:"credentials"`
}

package main

import "github.com/go-webauthn/webauthn/webauthn"

type User struct {
    ID          []byte                `json:"id"`
    Name        string                `json:"name"`
    DisplayName string                `json:"displayName"`
    IconURL     string                `json:"iconURL"`
    Credentials []webauthn.Credential `json:"credentials"`
}

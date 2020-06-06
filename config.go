package main

import "github.com/duo-labs/webauthn/protocol"

type Config struct {
    RPDisplayName string
    RPID          string
	// RPOrigin defaults to RPID if empty
    RPOrigin      string									`json:",omitempty"`
    RPIcon        string									`json:",omitempty"`

    AttestationPreference  protocol.ConveyancePreference	`json:",omitempty"`
    AuthenticatorSelection protocol.AuthenticatorSelection	`json:",omitempty"`

    Timeout int												`json:",omitempty"`
    Debug   bool											`json:",omitempty"`
}

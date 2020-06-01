package main

import (
	"reflect"
	"fmt"
	"os"

	"github.com/duo-labs/webauthn/webauthn"
	"github.com/duo-labs/webauthn/protocol"
	"github.com/alecthomas/jsonschema"
)

type WebAuthn4JS struct  {
	Config webauthn.Config
	User User
	CCO protocol.PublicKeyCredentialCreationOptions
	CC protocol.CredentialCreation
	SessionData webauthn.SessionData
	Credential webauthn.Credential
	CRO protocol.PublicKeyCredentialRequestOptions
	CA protocol.CredentialAssertion
}

func main() {
	typ := reflect.TypeOf((*WebAuthn4JS)(nil)).Elem()
	schema := jsonschema.ReflectFromType(typ)
	json, err := schema.MarshalJSON()
	if  err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Println(string(json))
}

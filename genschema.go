package main

import (
	"reflect"
	"fmt"
	"os"
	"bytes"
	"encoding/json"

	"github.com/duo-labs/webauthn/webauthn"
	"github.com/duo-labs/webauthn/protocol"
	"github.com/invopop/jsonschema"
)

type WebAuthn4JS struct {
	Config Config
	User User
	CredentialCreation protocol.CredentialCreation
	CredentialCreationResponse protocol.CredentialCreationResponse
	CredentialAssertion protocol.CredentialAssertion
	CredentialAssertionResponse protocol.CredentialAssertionResponse
	SessionData webauthn.SessionData
}

func main() {
	//jsonschema.Version = "" // json-schema-to-typescript doesn't like $schema and $ref together
	typ := reflect.TypeOf((*WebAuthn4JS)(nil)).Elem()
	reflector := jsonschema.Reflector{
		DoNotReference: false,
		ExpandedStruct: true,
		/*TypeMapper: func(typ reflect.Type) *jsonschema.Type {
			if typ == reflect.TypeOf((*protocol.Challenge)(nil)).Elem() {
				return &jsonschema.Type{
					Type: "string",
				}
			}
			return nil
		},*/
	}
	schema := reflector.ReflectFromType(typ)
	b, err := schema.MarshalJSON()
	if  err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	var out bytes.Buffer
	json.Indent(&out, b, "", "  ")
	out.WriteTo(os.Stdout)
}

package main

import (
	"syscall/js"
	"os"
	"encoding/json"
	"errors"
	"bytes"
	"fmt"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/go-webauthn/webauthn/protocol"
)

func (user User) WebAuthnID() []byte {
	return user.ID
}

func (user User) WebAuthnName() string {
	return user.Name
}

func (user User) WebAuthnDisplayName() string {
	return user.DisplayName
}

func (user User) WebAuthnIcon() string {
	return user.IconURL
}

func (user User) WebAuthnCredentials() []webauthn.Credential {
	return user.Credentials
}

var webAuthn *webauthn.WebAuthn
var c chan int

func init() {
	c = make(chan int)
}

func main() {
	js.Global().Get(os.Args[1]).Invoke(map[string]interface{}{
		"exit": js.FuncOf(exit),
		"init": js.FuncOf(initialize),
		"beginRegistration": js.FuncOf(beginRegistration),
		"finishRegistration": js.FuncOf(finishRegistration),
		"beginLogin": js.FuncOf(beginLogin),
		"finishLogin": js.FuncOf(finishLogin),
	})

	os.Exit(<-c)
}

func exit(this js.Value, arguments []js.Value) interface{} {
	c <- arguments[0].Int()
	return js.Null()
}

func cberr(cb js.Value, err error) interface{} {
	cb.Invoke(err.Error())
	return js.Null()
}

func cbok(cb js.Value, args ...interface{}) interface{} {
	cb.Invoke(append([]interface{}{js.Null()}, args...)...)
	return js.Null()
}

func recovery(cb js.Value) {
	if r:= recover(); r != nil {
		cberr(cb, errors.New(fmt.Sprintf("panic: %v", r)));
	}
}

func initialize(this js.Value, arguments []js.Value) interface{} {
	cb := arguments[1]
	var config webauthn.Config
	err := json.Unmarshal([]byte(arguments[0].String()), &config)
	if err != nil {
		return cberr(cb, err)
	}
	webAuthn, err = webauthn.New(&config)
	if err != nil {
		return cberr(cb, err)
	}
	return cbok(cb)
}

func beginRegistration(this js.Value, arguments []js.Value) interface{} {
	cb := arguments[len(arguments) - 1]
	defer recovery(cb)

	if webAuthn == nil {
		return cberr(cb, errors.New("WebAuthn not initialiazed"))
	}

	var user User
	err := json.Unmarshal([]byte(arguments[0].String()), &user)
	if err != nil {
		return cberr(cb, err)
	}

	var regOpts []webauthn.RegistrationOption
	var ccoErr error

	for _, f := range arguments[1:len(arguments) - 1] {
		fCopy := f
		regOpts = append(regOpts, func(cco *protocol.PublicKeyCredentialCreationOptions) {
			ccoJSON, err :=  json.Marshal(cco)
			if err != nil {
				ccoErr = err
				return
			}

			var newCCO protocol.PublicKeyCredentialCreationOptions
			err = json.Unmarshal([]byte(fCopy.Invoke(string(ccoJSON)).String()), &newCCO)
			if err != nil {
				ccoErr = err
				return
			}

			*cco = newCCO
		})
	}

	options, sessionData, err := webAuthn.BeginRegistration(user, regOpts...)
	if err != nil {
		return cberr(cb, err)
	}

	if ccoErr != nil {
		return cberr(cb, ccoErr)
	}

	optionsJSON, err := json.Marshal(options)
	if err != nil {
		return cberr(cb, err)
	}

	sessionDataJSON, err := json.Marshal(sessionData)
	if err != nil {
		return cberr(cb, err)
	}

	return cbok(cb, string(optionsJSON), string(sessionDataJSON))
}

func finishRegistration(this js.Value, arguments []js.Value) interface{} {
	cb := arguments[3]
	defer recovery(cb)

	if webAuthn == nil {
		return cberr(cb, errors.New("WebAuthn not initialiazed"))
	}

	var user User
	err := json.Unmarshal([]byte(arguments[0].String()), &user)
	if err != nil {
		return cberr(cb, err)
	}

	var sessionData webauthn.SessionData
	err = json.Unmarshal([]byte(arguments[1].String()), &sessionData)
	if err != nil {
		return cberr(cb, err)
	}

	response, err := protocol.ParseCredentialCreationResponseBody(
		bytes.NewReader([]byte(arguments[2].String())))
	if err != nil {
		return cberr(cb, err)
	}

	credential, err := webAuthn.CreateCredential(user, sessionData, response)
	if err != nil {
		return cberr(cb, err)
	}

	credentialJSON, err := json.Marshal(credential)
	if err != nil {
		return cberr(cb, err)
	}

	return cbok(cb, string(credentialJSON))
}

func beginLogin(this js.Value, arguments []js.Value) interface{} {
	cb := arguments[len(arguments) - 1]
	defer recovery(cb)

	if webAuthn == nil {
		return cberr(cb, errors.New("WebAuthn not initialiazed"))
	}

	var user User
	err := json.Unmarshal([]byte(arguments[0].String()), &user)
	if err != nil {
		return cberr(cb, err)
	}

	var loginOpts []webauthn.LoginOption
	var croErr error

	for _, f := range arguments[1:len(arguments) - 1] {
		loginOpts = append(loginOpts, func(cro *protocol.PublicKeyCredentialRequestOptions) {
			croJSON, err :=  json.Marshal(cro)
			if err != nil {
				croErr = err
				return
			}

			var newCRO protocol.PublicKeyCredentialRequestOptions
			err = json.Unmarshal([]byte(f.Invoke(string(croJSON)).String()), &newCRO)
			if err != nil {
				croErr = err
				return
			}

			*cro = newCRO
		})
	}

	if croErr != nil {
		return cberr(cb, croErr)
	}

	options, sessionData, err := webAuthn.BeginLogin(user, loginOpts...)
	if err != nil {
		return cberr(cb, err)
	}

	optionsJSON, err := json.Marshal(options)
	if err != nil {
		return cberr(cb, err)
	}

	sessionDataJSON, err := json.Marshal(sessionData)
	if err != nil {
		return cberr(cb, err)
	}

	return cbok(cb, string(optionsJSON), string(sessionDataJSON))
}

func finishLogin(this js.Value, arguments []js.Value) interface{} {
	cb := arguments[3]
	defer recovery(cb)

	if webAuthn == nil {
		return cberr(cb, errors.New("WebAuthn not initialiazed"))
	}

	var user User
	err := json.Unmarshal([]byte(arguments[0].String()), &user)
	if err != nil {
		return cberr(cb, err)
	}

	var sessionData webauthn.SessionData
	err = json.Unmarshal([]byte(arguments[1].String()), &sessionData)
	if err != nil {
		return cberr(cb, err)
	}

	response, err := protocol.ParseCredentialRequestResponseBody(
		bytes.NewReader([]byte(arguments[2].String())))
	if err != nil {
		return cberr(cb, err)
	}

	credential, err := webAuthn.ValidateLogin(user, sessionData, response)
	if err != nil {
		return cberr(cb, err)
	}

	credentialJSON, err := json.Marshal(credential)
	if err != nil {
		return cberr(cb, err)
	}

	return cbok(cb, string(credentialJSON))
}



package main

import (
	"syscall/js"
	"os"
	"encoding/json"
	"errors"

	"github.com/duo-labs/webauthn/webauthn"
	"github.com/duo-labs/webauthn/protocol"
)

/*type User struct {
	ID          []byte                `json:"id"`
	Name        string                `json:"name"`
	DisplayName string                `json:"displayName"`
	Credentials []webauthn.Credential `json:"credentials"`
}*/

var webAuthn *webauthn.WebAuthn
var c chan bool

func init() {
	c = make(chan bool)
}

func main() {
	js.Global().Get(os.Args[1]).Invoke(map[string]interface{}{
		"exit": js.FuncOf(exit),
		"init": js.FuncOf(initialize),
		"beginRegistration": js.FuncOf(beginRegistration),
	})

	<-c
}

func exit(this js.Value, arguments []js.Value) interface{} {
	c <- true
	return js.Null()
}

func cberr(cb js.Value, err error) interface{} {
	cb.Invoke(err.Error())
	return js.Null()
}

func cbok(cb js.Value, args ...interface{}) interface{} {
	cb.Invoke(append([]interface{}{js.Null()}, args)...)
	return js.Null()
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

	if webAuthn == nil {
		return cberr(cb, errors.New("WebAuthn not initialiazed"))
	}

	var user webauthn.User
	err := json.Unmarshal([]byte(arguments[0].String()), &user)
	if err != nil {
		return cberr(cb, err)
	}

	var regOpts []webauthn.RegistrationOption
	var ccoErr error

	for _, f := range arguments[1:len(arguments) - 1] {
		regOpts = append(regOpts, func(cco *protocol.PublicKeyCredentialCreationOptions) {
			ccoJSON, err :=  json.Marshal(cco)
			if err != nil {
				ccoErr = err
				return
			}

			var newCCO protocol.PublicKeyCredentialCreationOptions
			err = json.Unmarshal([]byte(f.Invoke(ccoJSON).String()), &newCCO)
			if err != nil {
				ccoErr = err
				return
			}

			*cco = newCCO
		})
	}

	if ccoErr != nil {
		return cberr(cb, ccoErr)
	}

	options, sessionData, err := webAuthn.BeginRegistration(user, regOpts...)
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

	return cbok(cb, optionsJSON, sessionDataJSON)
}

package main

import (
	"syscall/js"
	"os"
	"encoding/json"

	"github.com/duo-labs/webauthn/webauthn"
)

var webAuthn *webauthn.WebAuthn
var c chan bool

func init() {
	c = make(chan bool)
}

func main() {
	js.Global().Get(os.Args[1]).Invoke(map[string]interface{}{
		"exit": js.FuncOf(exit),
		"init": js.FuncOf(initialize),
	})

	<-c
}

func exit(this js.Value, arguments []js.Value) interface{} {
	c <- true
	return js.Null()
}

func initialize(this js.Value, arguments []js.Value) interface{} {
	cb := arguments[1]
	var config webauthn.Config
	err := json.Unmarshal([]byte(arguments[0].String()), &config)
	if err != nil {
		cb.Invoke(err.Error())
		return js.Null()
	}
	webAuthn, err = webauthn.New(&config)
	if err != nil {
		cb.Invoke(err.Error())
		return js.Null()
	}
	cb.Invoke(js.Null())
	return js.Null()
}

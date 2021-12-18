#!/bin/bash
rm -f go.mod go.sum
go mod init github.com/davedoesdev/webauthn4js

# https://github.com/etcd-io/etcd/issues/11749
#cat >> go.mod <<EOF
#replace github.com/coreos/bbolt => go.etcd.io/bbolt v1.3.5
#EOF

go get -u -d

#!/bin/bash
cd "$(dirname "$0")"

cn="webauthn-perk test CA"

for arg in "$@"
do
  case "$arg" in
    --cn=*) cn="${arg#*=}";;
  esac
done

openssl req -new -x509 -nodes -newkey rsa:2048 -keyout ca.key -out ca.crt -days 3650 -subj "/CN=$cn/"


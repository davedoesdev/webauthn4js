#!/bin/bash
cd "$(dirname "$0")"

host=localhost

for arg in "$@"
do
  case "$arg" in
    --host=*) host="${arg#*=}";;
  esac
done

openssl req -new -nodes -newkey rsa:2048 -keyout server.key -subj "/CN=$host/" | openssl x509 -req -extfile extensions -days 1095 -CA ca.crt -CAkey ca.key -out server.crt

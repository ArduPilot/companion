#!/bin/bash

USERNAME=$1
PASSWORD=$2

echo 'Removing old key'
rm -f ~/.ssh/id_rsa ~/.ssh/id_rsa.pub

echo 'Generating new ssh key'
ssh-keygen -f ~/.ssh/id_rsa -q -N ""

echo 'Registering new key with ssh-agent'
ssh-add ~/.ssh/id_rsa

# spit out the public key and form JSON request
PUBKEY=$(cat ~/.ssh/id_rsa.pub)
PAYLOAD='{"title":"companion-access","key":"'$PUBKEY'"}'

#echo 'Authenticating github with new key'
RESPONSE=$(curl -u "$USERNAME:$PASSWORD" --data "$PAYLOAD" https://api.github.com/user/keys)

exit $(echo $RESPONSE | grep -q '"verified": true')

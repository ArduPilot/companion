#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

. config.env

tput setaf 3
echo "Setting up access point using wifi-ap snap"
tput sgr0

# time snap install network-manager
time snap install wifi-ap
sleep 5
wifi-ap.config set wifi.ssid=ArduPilot
wifi-ap.config set wifi.security-passphrase=ardupilot
wifi-ap.config set wifi.address=10.0.1.128
wifi-ap.config set dhcp.range-start=10.0.1.129
wifi-ap.config set dhcp.range-stop=10.0.1.138


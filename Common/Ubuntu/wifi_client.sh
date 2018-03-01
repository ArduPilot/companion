#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

#set -e
set -x

CLIENTNAME="WiFiClient"  # name of new connection to create
CLIENTSSID="my-home-network"   # SSID of AP to connect to
KEY="swordfish"   # key of SSID to connect to

nmcli connection add con-name $CLIENTNAME type wifi ifname wlan0 ssid $CLIENTSSID
nmcli connection modify $CLIENTNAME connection.autoconnect no
nmcli connection modify $CLIENTNAME 802-11-wireless.mode infrastructure
nmcli connection modify $CLIENTNAME wifi-sec.key-mgmt wpa-psk
nmcli connection modify $CLIENTNAME 802-11-wireless-security.auth-alg open
nmcli connection modify $CLIENTNAME wifi-sec.psk "$KEY"

#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

# this script sets up the wifi access point

# NOTE: if something goes wrong with this setup, and you are unable to connect to the TX1, connect a keyboard and mouse and type "sudo dhclient eth0"
apt-get -y install dnsmasq haveged
apt-get -y install wpasupplicant

# stop dnsmasq from running outside of where we want it to:
sudo systemctl disable dnsmasq

# Create Access Point
SSID="ArduPilot"
KEY="ardupilot"
# IFNAME=wlan0
IFNAME=wlxe0b94d193b9e

# add IP address range to /etc/dnsmasq.conf
dd of=/etc/dnsmasq.d/$APNAME.conf <<EOF
interface=$IFNAME
dhcp-range=10.0.1.129,10.0.1.138,12h
EOF

sudo systemctl disable dnsmasq

nmcli dev wifi hotspot ifname $IFNAME ssid $SSID password $KEY
nmcli connection modify Hotspot connection.autoconnect yes
nmcli connection modify Hotspot 802-11-wireless.mode ap
nmcli connection modify Hotspot 802-11-wireless.band bg
nmcli connection modify Hotspot ipv4.method shared
nmcli connection modify Hotspot wifi-sec.key-mgmt wpa-psk
nmcli connection modify Hotspot ipv4.addresses 10.0.1.128/24

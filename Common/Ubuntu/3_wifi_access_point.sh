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

# stop dnsmasq from running outside of where we want it to:
sudo systemctl disable dnsmasq

# Create Access Point
APNAME="WiFiAP"
SSID="ardupilot"
KEY="ardupilot"

# add IP address range to /etc/dnsmasq.conf
dd of=/etc/dnsmasq.d/$APNAME.conf <<EOF
interface=wlan0
dhcp-range=10.0.1.129,10.0.1.138,12h
EOF

sudo systemctl disable dnsmasq

IFNAME=wlan0
nmcli connection add type wifi ifname $IFNAME con-name $APNAME ssid $SSID
nmcli connection modify $APNAME connection.autoconnect yes
nmcli connection modify $APNAME 802-11-wireless.mode ap
nmcli connection modify $APNAME 802-11-wireless.band bg
nmcli connection modify $APNAME ipv4.method shared
nmcli connection modify $APNAME wifi-sec.key-mgmt wpa-psk
nmcli connection modify $APNAME ipv4.addresses 10.0.1.128/24
nmcli connection modify $APNAME wifi-sec.psk "$KEY"
nmcli connection modify $APNAME 802-11-wireless-security.group ccmp
nmcli connection modify $APNAME 802-11-wireless-security.pairwise ccmp
nmcli connection up $APNAME

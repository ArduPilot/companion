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

# Create Access Point
APNAME="WiFiAP"
SSID="enroute-TX1"
KEY="enRouteArduPilot"

nmcli connection add type wifi ifname wlan0 con-name $APNAME autoconnect yes ssid $SSID
nmcli connection modify $APNAME 802-11-wireless.mode ap 802-11-wireless.band bg ipv4.method shared
nmcli connection modify $APNAME wifi-sec.key-mgmt wpa-psk
nmcli connection modify $APNAME wifi-sec.psk "$KEY"
nmcli connection modify $APNAME ipv4.addresses 10.0.1.128/28
nmcli connection modify $APNAME IPV4.ADDRESS 10.0.1.1/24
nmcli connection up $APNAME

# the hardware must be told to go into AP mode:
echo "options bcmdhd op_mode=2" | tee -a /etc/modprobe.d/bcmdhd.conf

# add IP address range to /etc/dnsmasq.conf
dd of=/etc/dnsmasq.d/$APNAME.conf <<EOF
interface=wlan0
dhcp-range=,10.0.1.254,12h
EOF

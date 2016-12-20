#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

. config.env

mv /etc/wpa_supplicant/wpa_supplicant.conf{,-unused}
systemctl stop wpa_supplicant
systemctl disable wpa_supplicant
killall /sbin/wpa_supplicant

# most of this is common:
../../Common/Ubuntu/3_wifi_access_point.sh

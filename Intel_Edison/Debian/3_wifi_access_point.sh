#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

. config.env

# the hardware must be told to go into AP mode:
echo 2 | sudo dd of=/sys/module/bcm4334x/parameters/op_mode
perl -pe 's/op_mode=4/op_mode=2/' -i /etc/modprobe.d/bcm4334x.conf

test -e /etc/wpa_supplicant/wpa_supplicant.conf &&
    mv -f /etc/wpa_supplicant/wpa_supplicant.conf{,-unused}
systemctl stop wpa_supplicant
systemctl disable wpa_supplicant
killall -9 /sbin/wpa_supplicant || true

# most of this is common:
../../Common/Ubuntu/3_wifi_access_point.sh

test -e /etc/wpa_supplicant/wpa_supplicant.conf &&
    mv -f /etc/wpa_supplicant/wpa_supplicant.conf{,-unused}
systemctl stop wpa_supplicant
systemctl disable wpa_supplicant
killall -9 /sbin/wpa_supplicant || true

echo "Success"
exit 0

# client mode:
echo 4 | sudo dd of=/sys/module/bcm4334x/parameters/op_mode  #

# AP mode:
echo 2 | sudo dd of=/sys/module/bcm4334x/parameters/op_mode  #

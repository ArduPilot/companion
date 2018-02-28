#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

. config.env

# the hardware must be told to go into AP mode:
install -o root -g root -m 755 set_bcmdhd_op_mode-up /etc/NetworkManager/dispatcher.d/pre-up.d/
install -o root -g root -m 755 set_bcmdhd_op_mode-down /etc/NetworkManager/dispatcher.d/pre-down.d/

# most of this is common:
pushd ../../Common/Ubuntu
./3_wifi_access_point.sh
popd

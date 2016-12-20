#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

. config.env

# the hardware must be told to go into AP mode:
echo "options bcmdhd op_mode=2" | tee -a /etc/modprobe.d/bcmdhd.conf
echo 2 >/sys/module/bcmdhd/parameters/op_mode

# most of this is common:
pushd ../../Common/Ubuntu
./3_wifi_access_point.sh
popd

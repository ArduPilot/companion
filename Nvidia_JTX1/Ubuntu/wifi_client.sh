#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

. config.env

# the hardware must be told to go into client mode, but it defaults to
# that.  We rely on 3_wifi_access_point.sh to manipulate the hardware.

# most of this is common:
pushd ../../Common/Ubuntu
./wifi_client.sh
popd

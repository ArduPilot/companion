#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

sudo -u $NORMAL_USER -H bash <<EOF
 set -e
 set -x

. config.env

pushd ../../Common/Ubuntu/librealsense
 ./install_vision_to_mavros.sh
popd

EOF
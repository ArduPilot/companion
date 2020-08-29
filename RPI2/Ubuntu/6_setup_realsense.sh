#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

. config.env

pushd /home/$NORMAL_USER/GitHub/companion/Common/Ubuntu/librealsense
time ./install_librealsense.sh
time ./install_vision_to_mavros.sh
popd

tput setaf 2
echo "Finished installing Intel Realsense Drivers and Pose Scripts"
tput sgr0

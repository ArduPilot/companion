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
if [ $SETUP_DEPTH_CAMERA -eq 1 ]; then
   echo 'Success! Finished part 7: installing Intel Realsense Drivers, Pose and Depth Scripts'
else
   echo 'Success! Finished part 7: installing Intel Realsense Drivers and Pose Script'
fi
tput sgr0

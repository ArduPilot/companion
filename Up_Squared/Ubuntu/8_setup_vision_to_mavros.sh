#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

. config.env

pushd /home/$NORMAL_USER/GitHub/companion/Common/Ubuntu/vision_to_mavros
time ./install_vision_to_mavros.sh
popd

tput setaf 2
if [ $SETUP_DEPTH_CAMERA -eq 1 ]; then
   echo 'Success! Finished part 8: installing vision_to_mavros Pose and Depth Scripts'
else
   echo 'Success! Finished part 8: installing vision_to_mavros Pose Script'
fi
tput sgr0

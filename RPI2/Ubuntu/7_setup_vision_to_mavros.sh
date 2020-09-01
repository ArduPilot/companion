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
echo "Finished installing vision_to_mavros Pose Scripts"
tput sgr0

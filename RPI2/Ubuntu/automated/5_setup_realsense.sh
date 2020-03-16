#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

. config.env

pushd /home/$NORMAL_USER/GitHub/companion/RPI2/Ubuntu
time ./install_realsense.sh 

tput setaf 2
echo "Finished installing Intel Realsense Drivers and Pose Scripts"
tput sgr0
popd


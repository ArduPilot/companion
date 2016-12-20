#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

. config.env

# install packages common to all
pushd ../../Common/Ubuntu
 ./install_packages.sh
popd
 
# live video related packages
# as of 201701121657, this fails to install gstreamer1.0-vaapi; remove || true when fixed.
apt-get -y install gstreamer1.0 gstreamer1.0-libav || true

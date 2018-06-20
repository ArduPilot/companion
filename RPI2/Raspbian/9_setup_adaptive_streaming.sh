#!/bin/bash

# RPi2 setup script for use as companion computer

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

#GStreamer deps
apt install libgstreamer-plugins-base1.0* libgstreamer1.0-dev libgstrtspserver-1.0-dev

#For building
pip3 install meson
apt install ninja-build

cd
git submodule foreach --recursive git pull
cd Common/Ubuntu/adaptive-streaming/
meson build
cd build
ninja install

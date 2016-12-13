#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

# remove modemmanager
apt-get purge -y modemmanager

# update package info
apt-get update

# upgrade packages
apt-get dist-upgrade -y
apt-get upgrade -y

# install python, numpy, pip
apt-get -y install python-dev python-numpy python3-numpy python-pip python-opencv

# install dronekit
pip install dronekit dronekit-sitl # also installs pymavlink

# install mavproxy
pip install mavproxy
apt-get -y install screen

# live video related packages
# as of 201701121657, this fails to install gstreamer1.0-vaapi; remove || true when fixed.
apt-get -y install gstreamer1.0 gstreamer1.0-libav || true

# install git
apt-get -y install git

# remove unused packages
apt autoremove -y

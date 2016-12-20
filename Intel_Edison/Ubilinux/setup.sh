#!/bin/bash

# Intel Edison setup script for use as companion computer

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

# update to latest versions
apt-get update
apt-get dist-upgrade -y

# install python
apt-get install -y python-pip python-dev

# install dronekit
pip install dronekit dronekit-sitl # also installs pymavlink
#sudo apt-get install screen python-wxgtk2.8 python-matplotlib python-opencv python-pip python-numpy python-dev libxml2-dev libxslt-dev
pip install mavproxy

# live video related packages  (1.0 is broken 201612161146)
apt-get install -y gstreamer0.9

# access point packages
apt-get install -y hostapd isc-dhcp-server

apt-get install -y screen git

# dataflash logging
export NORMAL_USER=edison
pushd ../../Common/Ubuntu/dflogger/
 ./install_dflogger
popd

# clean up
apt-get autoremove -y

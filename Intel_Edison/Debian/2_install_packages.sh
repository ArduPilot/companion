#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

. config.env

# install packages common to all
../../Common/Ubuntu/install_packages.sh

sudo apt-get install -y psmisc

# short on space, so remove random packages
sudo dpkg --purge bluez freepats geoip-database hicolor-icon-theme libpangocairo libpixman
sudo dpkg --purge tasksel tasksel-data nfacct nano
sudo dpkg --purge libwildmidi-co  libwildmidi1 xauth
sudo dpkg --purge libfcgi-perl libcgi-fast-perl
sudo dpkg --purge libgl1-mesa-dri libegl1-mesa-drivers python3-numpy
sudo dpkg --purge dh-python libmpdec2 libopenvg1-mesa libpython3-stdlib libpython3.4-minimal libpython3.4-stdlib libtxc-dxtn-s2tc0 libxmuu1 python3 python3-minimal python3.4 python3.4-minimal
  
echo "Success"





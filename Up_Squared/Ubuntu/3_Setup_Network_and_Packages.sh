#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

. config.env

tput setaf 3
echo "Part 3 of apsync installation"
tput sgr0

pushd /home/$NORMAL_USER/GitHub/companion/RPI2/Ubuntu

tput setaf 3
echo "removing modem manager"
tput sgr0
apt remove modemmanager

tput setaf 3
echo "installing avahi-daemon"
tput sgr0
apt install avahi-daemon -y

# install packages common to all
pushd /home/$NORMAL_USER/GitHub/companion/Common/Ubuntu
time ./install_packages.sh
popd

pushd /home/$NORMAL_USER/GitHub/companion/Common/Ubuntu
time ./install_niceties
popd

# setup wifi access point
time sudo -E ./install_wifi_access_point.sh # 20s

tput setaf 2
echo "Success! Finished part 3"
tput sgr0


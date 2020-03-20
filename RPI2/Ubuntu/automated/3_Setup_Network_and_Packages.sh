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
time sudo -E ./2_install_packages.sh # 20m
time sudo -E ./install_niceties || echo "Failed" # 20s
time sudo -E ./3_wifi_access_point.sh # 20s

tput setaf 2
echo "Success! Finished part 3"
tput sgr0


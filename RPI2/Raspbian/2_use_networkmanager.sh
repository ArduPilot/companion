#!/bin/bash

# RPi2 setup script for use as companion computer

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

sudo rm /etc/network/interfaces
sudo touch /etc/network/interfaces
sudo apt-get install -y network-manager
sudo systemctl disable networking
sudo systemctl enable NetworkManager
sudo apt-get remove -y modemmanager

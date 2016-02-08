#!/bin/bash

# RPi2 setup script for use as companion computer

sudo apt-get update
sudo apt-get install python-dev
sudo easy_install python-pip
sudo pip install dronekit dronekit-sitl # also installs pymavlink
#sudo apt-get install screen python-wxgtk2.8 python-matplotlib python-opencv python-pip python-numpy python-dev libxml2-dev libxslt-dev
sudo pip install mavproxy

# live video related packages
sudo apt-get install gstreamer1.0

# access point packages
sudo apt-get install hostapd isc-dhcp-server
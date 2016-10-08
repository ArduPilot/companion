#!/bin/bash

# RPi2 setup script for use as companion computer. This script is simplified for use with 
# the ArduSub code.

# Update package lists and current packages
sudo apt-get update
sudo apt-get upgrade

# Update Raspberry Pi
sudo apt-get install -y rpi-update
sudo rpi-update

# install python and pip
sudo apt-get install -y python-dev python-pip

# install dronekit
sudo pip install dronekit dronekit-sitl # also installs pymavlink
sudo pip install mavproxy

# install screen
sudo apt-get install -y screen

# live video related packages
sudo apt-get install -y gstreamer1.0

# Disable camera LED
sudo sed -i '$a disable_camera_led=1' /boot/config.txt

# Add these lines to /etc/rc.local
#screen -dm -S mavproxy /home/pi/companion/RPI2/Raspbian/start_mavproxy_telem_splitter.sh
#screen -dm -S video /home/pi/companion/RPI2/Raspbian/start_video.sh

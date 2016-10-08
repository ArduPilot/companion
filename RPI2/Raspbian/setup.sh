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

# add startup commands to /etc/rc.local
S1='screen -dm -S mavproxy /home/pi/companion/RPI2/Raspbian/start_mavproxy_telem_splitter.sh'
S2='screen -dm -S video /home/pi/companion/RPI2/Raspbian/start_video.sh'

# this will produce desired result if this script has been run already,
# and commands are already in place
sudo sed -i -e "\%$S1%d" \ # delete S1 if it already exists
-e "\%$S2%d" \ # delete S2 if it already exists
-e "0,/^[^#]*exit 0/s%%$S1\n$S2\n&%" \ # insert S1 and S2 above the first uncommented exit 0 line in the file
/etc/rc.local

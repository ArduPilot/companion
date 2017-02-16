#!/bin/bash

# RPi2 setup script for use as companion computer. This script is simplified for use with
# the ArduSub code.

# Update package lists and current packages
sudo apt-get update
sudo apt-get upgrade -y

# Update Raspberry Pi
sudo apt-get install -y rpi-update
sudo rpi-update

# install python and pip
sudo apt-get install -y python-dev python-pip

sudo pip install future

# install MAVLink tools
sudo pip install mavproxy dronekit dronekit-sitl # also installs pymavlink

# install screen
sudo apt-get install -y screen

# install git, and clone bluerobotics companion repository
sudo apt-get install -y git
git clone https://github.com/bluerobotics/companion.git /home/pi/companion

# Disable camera LED
sudo sed -i '\%disable_camera_led=1%d' /boot/config.txt
sudo sed -i '$a disable_camera_led=1' /boot/config.txt

# add startup commands to /etc/rc.local
S1='screen -dm -S mavproxy /home/pi/companion/RPI2/Raspbian/start_mavproxy_telem_splitter.sh'
S2='/home/pi/companion/RPI2/Raspbian/start_video.sh'

# this will produce desired result if this script has been run already,
# and commands are already in place
# delete S1 if it already exists
# delete S2 if it already exists
# insert S1 and S2 above the first uncommented exit 0 line in the file
sudo sed -i -e "\%$S1%d" \
-e "\%$S2%d" \
-e "0,/^[^#]*exit 0/s%%$S1\n$S2\n&%" \
/etc/rc.local

# compile and install gstreamer 1.8 from source
/home/pi/companion/RPI2/Raspbian/setup_gst.sh

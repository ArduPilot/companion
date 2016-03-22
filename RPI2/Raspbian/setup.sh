#!/bin/bash

# RPi2 setup script for use as companion computer. This script is simplified for use with 
# the ArduSub code.

# update RPI to latest versions
sudo apt-get update
sudo apt-get upgrade
sudo rpi-update

# install python and pip
sudo apt-get install python-pip

# install dronekit
sudo pip install dronekit dronekit-sitl # also installs pymavlink
sudo pip install mavproxy

# live video related packages
sudo apt-get install gstreamer1.0
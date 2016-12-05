#!/bin/bash

# remove modemmanager
sudo apt-get purge modemmanager

# update package info
sudo apt-get update

# install python, numpy, pip
sudo apt-get install python-dev python-numpy python3-numpy python-pip python-opencv

# install dronekit
sudo pip install dronekit dronekit-sitl # also installs pymavlink

# install mavproxy
sudo pip install mavproxy

# live video related packages
sudo apt-get install gstreamer1.0

# install git
sudo apt-get install git

# setup wifi access point.
# NOTE: if something goes wrong with this setup, and you are unable to connect to the TX1, connect a keyboard and mouse and type "sudo dhclient eth0"
sudo apt-get install hostapd dnsmasq haveged

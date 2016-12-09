#!/bin/bash

# remove modemmanager
sudo apt-get purge -y modemmanager

# update package info
sudo apt-get update

# upgrade packages
sudo apt-get dist-upgrade -y
sudo apt-get upgrade -y

# install python, numpy, pip
sudo apt-get -y install python-dev python-numpy python3-numpy python-pip python-opencv

# install dronekit
sudo pip install dronekit dronekit-sitl # also installs pymavlink

# install mavproxy
sudo pip install mavproxy
sudo apt-get -y install screen

# live video related packages
sudo apt-get -y install gstreamer1.0

# install git
sudo apt-get -y install git

# setup wifi access point.
# NOTE: if something goes wrong with this setup, and you are unable to connect to the TX1, connect a keyboard and mouse and type "sudo dhclient eth0"
sudo apt-get -y install hostapd dnsmasq haveged

# remove unused packages
sudo apt autoremove -y
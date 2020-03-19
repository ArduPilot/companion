#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

# remove modemmanager
apt-get purge -y modemmanager

# update package info
apt-get update

# upgrade packages
apt-get dist-upgrade -y

# install python, numpy, pip
apt-get -y install python-dev python-numpy python3-numpy python-pip python-opencv

# pymavlink deps:
apt-get install -y libxml2-dev libxslt1.1 libxslt1-dev libz-dev python-lxml
time pip install future

# install dronekit
pip install dronekit dronekit-sitl # also installs pymavlink

# install mavproxy
pip install mavproxy
apt-get -y install screen

# install git
apt-get -y install git

# install autoconf and libtool
apt-get -y install autoconf libtool

# remove unused packages
apt-get autoremove -y

# clear cache
apt-get clean

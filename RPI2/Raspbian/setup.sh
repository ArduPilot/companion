#!/bin/bash

# RPi2 setup script for use as companion computer

# update RPI to latest versions
sudo apt-get update
sudo apt-get upgrade
sudo rpi-update

# install python
sudo apt-get install python-dev
sudo easy_install python-pip

# install dronekit
sudo pip install dronekit dronekit-sitl # also installs pymavlink
#sudo apt-get install screen python-wxgtk2.8 python-matplotlib python-opencv python-pip python-numpy python-dev libxml2-dev libxslt-dev
sudo pip install mavproxy

# live video related packages
sudo apt-get install gstreamer1.0

# access point packages
sudo apt-get install hostapd isc-dhcp-server

# opencv - see http://www.pyimagesearch.com/2015/10/26/how-to-install-opencv-3-on-raspbian-jessie/
sudo apt-get install build-essential git cmake pkg-config
sudo apt-get install libjpeg-dev libtiff5-dev libjasper-dev libpng12-dev
sudo apt-get install libavcodec-dev libavformat-dev libswscale-dev libv4l-dev
sudo apt-get install libxvidcore-dev libx264-dev
sudo apt-get install libgtk2.0-dev
sudo apt-get install libatlas-base-dev gfortran
sudo apt-get install python2.7-dev python3-dev
cd ~
wget -O opencv.zip https://github.com/Itseez/opencv/archive/3.0.0.zip
unzip opencv.zip
wget -O opencv_contrib.zip https://github.com/Itseez/opencv_contrib/archive/3.0.0.zip
unzip opencv_contrib.zip
sudo pip install numpy
mkdir ~/opencv-3.0.0/build
cd ~/opencv-3.0.0/build
cmake -D CMAKE_BUILD_TYPE=RELEASE \
	-D CMAKE_INSTALL_PREFIX=/usr/local \
	-D INSTALL_C_EXAMPLES=ON \
	-D INSTALL_PYTHON_EXAMPLES=ON \
	-D OPENCV_EXTRA_MODULES_PATH=~/opencv_contrib-3.0.0/modules \
	-D BUILD_EXAMPLES=ON ..
make -j4
sudo make install
sudo ldconfig

# picamera (likely already included from opencv)
sudo pip install "picamera[array]"

# cherrypy web server (used by red balloon finder)
sudo pip install cherrypy

# install red balloon finder
sudo apt-get install screen
sudo apt-get install git
mkdir ~/GitHub
cd ~/GitHub
git clone https://github.com/diydrones/companion.git
git clone https://github.com/rmackay9/ardupilot-balloon-finder
#!/bin/bash

# RPi2 setup script for use as companion computer

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

# update RPI to latest versions
apt-get update
apt-get dist-upgrade -y
# rpi-update   # not present on lite image

# install python
apt-get install -y python-pip python-dev

# install dronekit
pip install dronekit dronekit-sitl # also installs pymavlink
#sudo apt-get install screen python-wxgtk2.8 python-matplotlib python-opencv python-pip python-numpy python-dev libxml2-dev libxslt-dev
pip install mavproxy

# live video related packages
apt-get install -y gstreamer1.0

# access point packages
apt-get install -y hostapd isc-dhcp-server

# opencv - see http://www.pyimagesearch.com/2015/10/26/how-to-install-opencv-3-on-raspbian-jessie/
apt-get install -y build-essential git cmake pkg-config
apt-get install -y libjpeg-dev libtiff5-dev libjasper-dev libpng12-dev
apt-get install -y libavcodec-dev libavformat-dev libswscale-dev libv4l-dev
apt-get install -y libxvidcore-dev libx264-dev
apt-get install -y libgtk2.0-dev
apt-get install -y libatlas-base-dev gfortran
apt-get install -y python2.7-dev python3-dev

# install OpenCV:
pip install numpy
false && sudo -u pi -H bash <<'EOF'
set -e
set -x

pushd $HOME
mkdir opencv
pushd opencv
# wget -O opencv.zip https://github.com/Itseez/opencv/archive/3.0.0.zip
 unzip opencv.zip
# wget -O opencv_contrib.zip https://github.com/Itseez/opencv_contrib/archive/3.0.0.zip
 unzip -o opencv_contrib.zip
 pushd opencv-3.0.0
  mkdir build
  pushd build
   time cmake -D CMAKE_BUILD_TYPE=RELEASE \
 	-D CMAKE_INSTALL_PREFIX=/usr/local \
 	-D INSTALL_C_EXAMPLES=ON \
 	-D INSTALL_PYTHON_EXAMPLES=ON \
 	-D OPENCV_EXTRA_MODULES_PATH=~/opencv_contrib-3.0.0/modules \
 	-D BUILD_EXAMPLES=ON ..
   make -j4
  popd
 popd
popd

EOF

# pushd ~pi/opencv/opencv-3.0.0/build
#  make install
#  ldconfig
# popd

apt-get install -y screen git

# picamera (likely already included from opencv)
pip install "picamera[array]"

# cherrypy web server (used by red balloon finder)
pip install cherrypy

# install red balloon finder

sudo -u pi -H bash <<'EOF'
set -e
set -x

if [ ! -d ~/GitHub ]; then
  mkdir ~/GitHub
fi
cd ~/GitHub
git clone https://github.com/rmackay9/ardupilot-balloon-finder
EOF


# clean up
apt-get autoremove -y

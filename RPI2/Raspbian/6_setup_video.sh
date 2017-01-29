#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

# live video related packages
apt-get install -y gstreamer1.0

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

# picamera (likely already included from opencv)
pip install "picamera[array]"


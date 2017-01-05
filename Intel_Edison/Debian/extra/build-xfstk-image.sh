#!/bin/bash

# sometimes Edison gets very confused and becomes unflashable.
# somtimes Intel's xfstk can be used to recover.

# I have used something like this script to create a Virtual Machine
# which I successfully used to recover (actually, initially flash!) an
# Edison.

set -e
set -x

sudo apt-get install -y g++ qtcreator build-essential devscripts libxml2-dev alien doxygen graphviz libusb-dev libboost-all-dev libqt4-dev qt4-qmake libusb-1.0-0-dev cmake dfu-util

VER=1.7.2
TARBALL=xfstk-dldr-linux-source-$VER.tar.gz
wget https://sourceforge.net/projects/xfstk/files/$TARBALL/download -O $TARBALL
tar xfz $TARBALL
 
cd linux-source-package

mdkir build
cd build
export DISTRIBUTION_NAME=ubuntu14.04
export BUILD_VERSION=0.0.0
cmake .. 
make package
sudo dpkg --install xfstk-downloader-0.0.0.ubuntu14.04-i386.deb

# at this point you need to have a "toFlash" directory handy; get a
# copy of one onto the Virtual machine.

# You should be able to:
# cd toFlash
# sudo ./flashall.sh --recovery

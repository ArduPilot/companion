#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

. config.env

df -H

installation_folder="/usr/local/zed"
rm -rf "$installation_folder"
mkdir -p "$installation_folder"
chown "$NORMAL_USER" "$installation_folder"

sudo -u $NORMAL_USER -H bash <<EOF
set -e
set -x

TMP_PATH=/tmp/tmp-path
mkdir -p \$TMP_PATH
ln -sf  /bin/cat \$TMP_PATH/less
export PATH=\$TMP_PATH:\$PATH
ZED_SDK_RUNFILE=ZED_SDK_Linux_JTX1_v2.3.2.run
if grep t186ref /etc/nv_tegra_release; then
   # TX2 / JetPack 3.1
   ZED_SDK_RUNFILE=ZED_SDK_Linux_JTX2_JP3.2_v2.4.0.run
fi
ZED_SDK_URL="https://cdn.stereolabs.com/developers/downloads/\$ZED_SDK_RUNFILE"

BASE_SRC_DIR=~/GitHub/OpenKAI
rm -rf \$BASE_SRC_DIR
mkdir -p "\$BASE_SRC_DIR"
pushd \$BASE_SRC_DIR

# Swiped from http://docs.openkai.xyz/tx1build.html

# Prerequisites
sudo apt-get update
sudo apt-get -y install git cmake build-essential cmake-curses-gui libatlas-base-dev libprotobuf-dev libleveldb-dev libsnappy-dev libboost-all-dev libhdf5-serial-dev libgflags-dev libgoogle-glog-dev liblmdb-dev protobuf-compiler libgtk2.0-dev pkg-config libdc1394-22 libdc1394-22-dev libjpeg-dev libpng12-dev libjasper-dev libavcodec-dev libavformat-dev libswscale-dev libv4l-dev libtbb-dev libfaac-dev libmp3lame-dev libopencore-amrnb-dev libopencore-amrwb-dev libtheora-dev libvorbis-dev libxvidcore-dev x264 v4l-utils unzip python-protobuf libeigen3-dev

# Update Eigen
wget --no-check-certificate http://bitbucket.org/eigen/eigen/get/3.3.4.tar.gz
tar xzvf 3.3.4.tar.gz
pushd eigen-eigen-*
 mkdir build
 pushd build
  cmake ../
  sudo make install
 popd
popd
  
# (Optional) Install ZED driver

##For Jetson TX1:
wget --no-check-certificate \$ZED_SDK_URL
chmod u+x \$ZED_SDK_RUNFILE
./\$ZED_SDK_RUNFILE -- silent


# Pangolin (Needed by ORB_SLAM2)
#git clone https://github.com/yankailab/Pangolin.git
#pushd Pangolin
#  mkdir build
#  pushd build
#   cmake ..
#   cmake --build .
#   sudo make install
# popd
#popd
   

# ORB_SLAM2

##GPU version:
# NON FUNCTIONAL
#git clone https://github.com/yankailab/orb_slam2_gpu.git
#pushd orb_slam2_gpu
#  chmod +x build.sh
#  ./build.sh
#popd

## CPU version:

#git clone https://github.com/yankailab/orb_slam2.git
#pushd orb_slam2
#  chmod +x build.sh
#  ./build.sh
#popd
  
## Jetson-inference

git clone https://github.com/dusty-nv/jetson-inference.git
pushd jetson-inference/
  mkdir build
  pushd build
    cmake ../
    make
  popd
popd  

## Build OpenKAI

git clone https://github.com/yankailab/OpenKAI.git
pushd OpenKAI
  git checkout 90db9cf2c68e09395ba70d20f00c72c3bbe1db2d
  perl -pe 's/ sl_depthcore sl_tracking//' -i CMakeLists.txt # bodgy SDK compat
  mkdir build
  pushd build
    cmake .. -DUSE_ORB_SLAM2=0 -DCUDA_include=/home/apsync/GitHub/OpenKAI/jetson-inference/build/aarch64/include -DTensorRT_build=/home/apsync/GitHub/OpenKAI/jetson-inference/build/aarch64 -DUSE_ZED=1
    make all -j4
  popd
popd
    
##Run samples

##cd OpenKAI/build
##sudo ./OpenKAI ~/GitHub/OpenKAI/OpenKAI/kiss/apCopter.kiss

popd # leave $BASE_SRC_DIR

START_OPENKAI_BASE="\$HOME/start_openkai"
mkdir -p "\$START_OPENKAI_BASE"

OPENKAI_BINARY=$HOME/GitHub/OpenKAI/OpenKAI/build/OpenKAI
cp \$OPENKAI_BINARY \$START_OPENKAI_BASE

OPENKAI_KISS="\$START_OPENKAI_BASE/kiss"
mkdir -p "\$OPENKAI_KISS"
cp apsync.kiss "\$OPENKAI_KISS/"

OPENKAI_VIDEO="\$START_OPENKAI_BASE/video"
mkdir -p "\$OPENKAI_VIDEO"

cp start_openkai.sh \$START_OPENKAI_BASE
cp autostart_openkai.sh \$START_OPENKAI_BASE

EOF

df -H

# add line below to bottom of /etc/rc.local to call start script
LINE="sudo -H -u $NORMAL_USER /bin/bash -c '~$NORMAL_USER/start_openkai/autostart_openkai.sh'"
perl -pe "s%^exit 0%$LINE\\n\\nexit 0%" -i /etc/rc.local

#!/bin/bash

set -e
set -x

tput setaf 3
echo "Build latest version of librealsense"
tput sgr0

time ./buildLibrealsense.sh

pushd /home/$NORMAL_USER/GitHub
sudo apt install python3-lxml
sudo -H pip3 install cython
sudo -H pip3 install numpy --upgrade
sudo -H pip3 install transformations
sudo -H pip3 install apscheduler
sudo -H pip3 install dronekit

git clone https://github.com/thien94/vision_to_mavros.git

mkdir /home/$NORMAL_USER/start_t265_to_mavlink
pushd vision_to_mavros/scripts
cp t265_to_mavlink.py /home/$NORMAL_USER/start_t265_to_mavlink
popd
popd
cp start_t265.sh /home/$NORMAL_USER/start_t265_to_mavlink
sudo cp t265.service /etc/systemd/system

tput setaf 2
echo "Finished installing vision_to_mavros"
tput sgr0


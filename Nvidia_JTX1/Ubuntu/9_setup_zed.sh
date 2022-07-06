#!/bin/bash

# this script sets up the ZED camera
# this should be run as the "apsync" user

# store current directory
pushd .

# download install scripts from stereolabs
mkdir -p ~/Downloads
cd ~/Downloads
# wget --no-check-certificate https://www.stereolabs.com/download_327af3/ZED_SDK_Linux_JTX1_v1.2.0_64b_JetPack23.run
wget --no-check-certificate https://dl.dropboxusercontent.com/u/3852647/ZED/ZED_SDK_Linux_JTX1_v1.2.0_64b_JetPack23.run

# install (user will need to press "Q"
echo "Installing ZED camera SDK, you must manually accept the license agreement (press Y), enter root password and press enter to accept the default install directory"
chmod +x ./ZED_SDK_Linux_JTX1_v1.2.0_64b_JetPack23.run
./ZED_SDK_Linux_JTX1_v1.2.0_64b_JetPack23.run

# startup zed camera's Depth Viewer to force download of calibration file for this particular camera
# this may require permissioning apsync to use the screen, "sudo xhost +SI:localuser:apsync"
# Note: we should change this to a user runnable script to download the config for each user's camera
/usr/local/zed/tools/ZED \ Depth\ Viewer

# return to stored directory
popd

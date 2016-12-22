#!/bin/bash

# this script sets up the ZED camera

# store current directory
pushd .

# download install scripts from stereolabs
cd ~/Downloads
wget --no-check-certificate https://www.stereolabs.com/download_327af3/ZED_SDK_Linux_JTX1_v1.2.0_64b_JetPack23.run

# install (user will need to press "Q"
echo "Installing ZED camera SDK, you must manually accept the license agreement (press Y), enter root password and press enter to accept the default install directory"
chmod +x ./ZED_SDK_Linux_JTX1_v1.2.0_64b_JetPack23.run
./ZED_SDK_Linux_JTX1_v1.2.0_64b_JetPack23.run

# return to stored directory
popd

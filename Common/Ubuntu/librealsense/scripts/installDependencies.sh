#!/bin/bash
# installDependencies.sh
# Install dependencies for  the Intel Realsense library librealsense2 on a Jetson Nano Developer Kit
# Copyright (c) 2016-19 Jetsonhacks 
# MIT License
red=`tput setaf 1`
green=`tput setaf 2`
reset=`tput sgr0`
# e.g. echo "${red}red text ${green}green text${reset}"
echo "${green}Adding Universe repository and updating${reset}"
apt-add-repository universe
apt update
echo "${green}Adding dependencies, graphics libraries and tools${reset}"
apt install libssl-dev libusb-1.0-0-dev pkg-config -y
# This is for ccmake
apt install build-essential cmake cmake-curses-gui -y

# Graphics libraries - for SDK's OpenGL-enabled examples
apt install libgtk-3-dev libglfw3-dev libgl1-mesa-dev libglu1-mesa-dev -y

# QtCreator for development; not required for librealsense core library
apt install qtcreator -y

# Add Python 3 support
apt install -y python3 python3-dev


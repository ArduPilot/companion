#!/bin/bash
# Install Robot Operating System (ROS) on NVIDIA Jetson AGX Xavier
# Maintainer of ARM builds for ROS is http://answers.ros.org/users/1034/ahendrix/
# Information from:
# http://wiki.ros.org/melodic/Installation/UbuntuARM

# Red is 1
# Green is 2
# Reset is sgr0

function usage
{
    echo "Usage: ./installROS.sh [[-p package] | [-h]]"
    echo "Install ROS Melodic"
    echo "Installs ros-melodic-ros-base as default base package; Use -p to override"
    echo "-p | --package <packagename>  ROS package to install"
    echo "                              Multiple usage allowed"
    echo "                              Must include one of the following:"
    echo "                               ros-melodic-ros-base"
    echo "                               ros-melodic-desktop"
    echo "                               ros-melodic-desktop-full"
    echo "-h | --help  This message"
}

function shouldInstallPackages
{
    tput setaf 1
    echo "Your package list did not include a recommended base package"
    tput sgr0 
    echo "Please include one of the following:"
    echo "   ros-melodic-ros-base"
    echo "   ros-melodic-desktop"
    echo "   ros-melodic-desktop-full"
    echo ""
    echo "ROS not installed"
}

# Iterate through command line inputs
packages=()
while [ "$1" != "" ]; do
    case $1 in
        -p | --package )        shift
                                packages+=("$1")
                                ;;
        -h | --help )           usage
                                exit
                                ;;
        * )                     usage
                                exit 1
    esac
    shift
done
# Check to see if other packages were specified
# If not, set the default base package
if [ ${#packages[@]}  -eq 0 ] ; then
 packages+="ros-melodic-desktop-full"
fi
echo "Packages to install: "${packages[@]}
# Check to see if we have a ROS base kinda thingie
hasBasePackage=false
for package in "${packages[@]}"; do
  if [[ $package == "ros-melodic-ros-base" ]]; then
     hasBasePackage=true
     break
  elif [[ $package == "ros-melodic-desktop" ]]; then
     hasBasePackage=true
     break
  elif [[ $package == "ros-melodic-desktop-full" ]]; then
     hasBasePackage=true
     break
  fi
done
if [ $hasBasePackage == false ] ; then
   shouldInstallPackages
   exit 1
fi

# Let's start installing!

tput setaf 2
echo "Adding repository and source list"
tput sgr0
sudo apt-add-repository universe
sudo apt-add-repository multiverse
sudo apt-add-repository restricted

# Setup sources.lst
sudo sh -c 'echo "deb http://packages.ros.org/ros/ubuntu $(lsb_release -sc) main" > /etc/apt/sources.list.d/ros-latest.list'
# Setup keys
sudo apt-key adv --keyserver 'hkp://keyserver.ubuntu.com:80' --recv-key C1CF6E31E6BADE8868B172B4F42ED6FBAB17C654
# If you experience issues connecting to the keyserver, you can try substituting hkp://pgp.mit.edu:80 or hkp://keyserver.ubuntu.com:80 in the previous command.
# Installation
tput setaf 2
echo "Updating apt"
tput sgr0
sudo apt update
tput setaf 2
echo "Installing ROS"
tput sgr0

# Here we loop through any packages passed on the command line
# Install packages ...
for package in "${packages[@]}"; do
  sudo apt install $package -y
done

# This is where you might start to modify the packages being installed, i.e.
# sudo apt install ros-melodic-desktop
sudo apt install -y setpriv
sudo apt install -y ros-melodic-robot-upstart
sudo apt install -y ros-melodic-navigation
sudo apt install -y ros-melodic-xacro
sudo apt install -y ros-melodic-robot-state-publisher
sudo apt install -y ros-melodic-joint-state-controller
sudo apt install -y ros-melodic-diff-drive-controller
sudo apt install -y ros-melodic-robot-localization
sudo apt install -y ros-melodic-twist-mux
sudo apt install -y ros-melodic-interactive-marker-twist-server
sudo apt install -y ros-melodic-opencv-apps
sudo apt install -y ros-melodic-gazebo-ros
sudo apt install -y ros-melodic-gmapping
sudo apt install -y ros-melodic-joy
sudo apt install -y ros-melodic-diagnostic-aggregator
sudo apt install -y ros-melodic-teleop-twist-keyboard
sudo apt install -y ros-melodic-teleop-twist-joy
sudo apt install -y ros-melodic-image-transport
sudo apt install -y ros-melodic-joint-trajectory-controller
sudo apt install -y ros-melodic-joint-limits-interface
sudo apt install -y ros-melodic-controller-manager
sudo apt install -y ros-melodic-razor-imu-9dof
sudo apt install -y ros-melodic-imu-transformer
sudo apt install -y ros-melodic-serial
sudo apt install -y ros-melodic-rviz-imu-plugin
sudo apt install -y ros-melodic-rqt
sudo apt install -y ros-melodic-rqt-common-plugins
sudo apt install -y ros-melodic-rqt-robot-plugins
sudo apt install -y ros-melodic-frontier-exploration
sudo apt install -y ros-melodic-tf
sudo apt install -y ros-melodic-tf-conversions
sudo apt install -y ros-melodic-tf2-geometry-msgs
sudo apt install -y ros-melodic-laser-geometry
sudo apt install -y ros-melodic-cv-bridge
sudo apt install -y ros-melodic-image-transport 
sudo apt install -y libpcl1
sudo apt install -y ros-melodic-pcl-ros
sudo apt install -y ros-melodic-vision-msgs
sudo apt install -y ros-melodic-hector-imu-attitude-to-tf
sudo apt install -y ros-melodic-camera-info-manager-py
sudo apt install -y ros-melodic-hector-gazebo-plugins
sudo apt install -y ros-melodic-fiducial-msgs

# Add Individual Packages here
# You can install a specific ROS package (replace underscores with dashes of the package name):
# sudo apt install ros-melodic-PACKAGE
# e.g.
# sudo apt install ros-melodic-navigation

# install other needed packages
sudo apt install build-essential cmake libglfw3-dev libglew-dev libeigen3-dev libjsoncpp-dev libtclap-dev -y

#
# To find available packages:
# apt-cache search ros-melodic
# 
# Initialize rosdep
tput setaf 2
echo "Installing rosdep"
tput sgr0
sudo apt install python-rosdep -y
# Certificates are messed up on earlier version Jetson for some reason
# Do not know if it is an issue with the Xavier, test by commenting out
# sudo c_rehash /etc/ssl/certs
# Initialize rosdep
tput setaf 2
echo "Initializaing rosdep"
tput sgr0

sudo rm /etc/ros/rosdep/sources.list.d/20-default.list && echo "OK" || echo "No 20-default.list file"

sudo rosdep init
# To find available packages, use:
rosdep update
# Use this to install dependencies of packages in a workspace
# rosdep install --from-paths src --ignore-src --rosdistro=${ROS_DISTRO} -y
# Environment Setup - Don't add /opt/ros/melodic/setup.bash if it's already in bashrc
grep -q -F 'source /opt/ros/melodic/setup.bash' ~/.bashrc || echo "source /opt/ros/melodic/setup.bash" >> ~/.bashrc
source ~/.bashrc

echo "Setup opencv symlink"
sudo ln -s /usr/include/opencv4 /usr/include/opencv
# Install rosinstall
tput setaf 2
echo "Installing rosinstall tools"
tput sgr0
sudo apt install python-rosinstall python-rosinstall-generator python-wstool build-essential python-catkin-tools -y
tput setaf 2
echo "Installation complete!"
tput sgr0

#!/bin/bash

# this script should be run as the apsync user
# these instructions come from Dan Pollock, posting can be found here: https://www.facebook.com/groups/pixhawk2/permalink/1192680427481244/

set -e
set -x

pushd .

# setup reference to ros packages
sudo sh -c 'echo "deb http://packages.ros.org/ros/ubuntu $(lsb_release -sc) main" > /etc/apt/sources.list.d/ros-latest.list'
sudo apt-key adv --keyserver hkp://ha.pool.sks-keyservers.net:80 --recv-key 421C365BD9FF1F717815A3895523BAEEB01FA116
sudo apt-get update

# install ros
sudo apt-get install -y ros-kinetic-ros-base python-rosinstall ros-kinetic-mavros ros-kinetic-rtabmap-ros ros-kinetic-robot-state-publisher
sudo c_rehash /etc/ssl/certs
sudo rosdep init
rosdep update

# add environment to .bashrc
echo "source /opt/ros/kinetic/setup.bash" >> ~/.bashrc
source ~/.bashrc

# install the ZED SDK using 7_setup_zed.sh

# install zed-ros-wrapper
mkdir -p ~/catkin_zed/src
cd ~/catkin_zed/src
git clone https://github.com/stereolabs/zed-ros-wrapper.git

# create workspace
# Note: this seems to fail because some ROS variables are not being set
cd ~/catkin_zed/src
/opt/ros/kinetic/bin/catkin_init_workspace
cd ~/catkin_zed
/opt/ros/kinetic/bin/catkin_make

# kill src directory and build again
rm -rf ~/catkin_zed/src
mkdir -p ~/catkin_zed/src
cd ~/catkin_zed/src
git clone https://github.com/stereolabs/zed-ros-wrapper.git
cd ~/catkin_zed
/opt/ros/kinetic/bin/catkin_make

popd

# cp zed_rtabmap_launch file to /opt/ros/kinetic/share/rtabmap_ros/launch
sudo cp ./zed_rtabmap.launch /opt/ros/kinetic/share/rtabmap_ros/launch
# old instructions for above:
#     cd to /opt/ros/kinetic/share/rtabmap_ros/launch
#     sudo cp /opt/ros/kinetic/share/rtabmap_ros/launch/rtabmap.launch /opt/ros/kinetic/share/rtabmap_ros/launch/zed_rtabmap.launch
#     sudo vi /opt/ros/kinetic/share/rtabmap_ros/launch/zed_rtabmap.launch
#     replace "/camera/rgb" with "/camera/zed/rgb"

# put startup scripts in place
mkdir ~/start_ros
cp start_1_roscore.sh ~/start_ros
cp start_2_zed_wrapper.sh ~/start_ros
cp start_3_rosrun.sh ~/start_ros
cp start_4_rtabmap.sh ~/start_ros

# test rosrun zed_wrapper
# first terminal
#     roscore
# second terminal:
#     export ROS_NAMESPACE=camera
#     source ~/catkin_zed/devel/setup.bash
#     roslaunch zed_wrapper zed.launch
# third terminal window:
#     export ROS_NAMESPACE=camera
#     source ~/catkin_zed/devel/setup.bash
#     rosrun tf static_transform_publisher 0 0 0 -1.5707963267948966 0 -1.5707963267948966 camera_link zed_initial_frame 100 &
# test viewer on client
#     roslaunch rtabmap_ros zed_rtabmap.launch rtabmap_args:="--delete_db_on_start" depth_topic:=/camera/zed/depth/depth_registered

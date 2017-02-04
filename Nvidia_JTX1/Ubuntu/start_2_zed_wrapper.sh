#!/bin/bash

# start rosrun
export ROS_NAMESPACE=camera
source ~/catkin_zed/devel/setup.bash
roslaunch zed_wrapper zed.launch

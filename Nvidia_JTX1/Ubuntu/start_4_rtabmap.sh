#!/bin/bash

# override home in case this is being run from different user
export HOME=/home/apsync

# start rosrun
export ROS_NAMESPACE=camera
source ~/catkin_zed/devel/setup.bash
roslaunch rtabmap_ros zed_rtabmap.launch rtabmap_args:="--delete_db_on_start" depth_topic:=/camera/zed/depth/depth_registered

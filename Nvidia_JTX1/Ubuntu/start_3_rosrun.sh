#!/bin/bash

# start rosrun
export ROS_NAMESPACE=camera
source ~/catkin_zed/devel/setup.bash
rosrun tf static_transform_publisher 0 0 0 -1.5707963267948966 0 -1.5707963267948966 camera_link zed_initial_frame 100 &

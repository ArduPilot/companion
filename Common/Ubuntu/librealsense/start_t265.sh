#!/bin/bash 
# This is /usr/bin/your_config-start.sh 
# # do all your commands here... script terminates when all is done. 

# Change the path to t265_to_mavlink.py
/home/apsync/start_t265_to_mavlink/t265_to_mavlink.py --connect udp:127.0.0.1:14560

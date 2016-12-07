#!/bin/sh
# start mavproxy with:
#    - main connection to flight controller using Serial 0 at 921k
#    - udp connection on port 9000 for use by other processes
#    - udp broadcast connection to allow multiple GCSs to connect to the flight controller via mavproxy
mavproxy.py --master /dev/ttyS0 --baud 921600 --out udpin:localhost:9000 --out udpbcast:10.0.1.255:14550
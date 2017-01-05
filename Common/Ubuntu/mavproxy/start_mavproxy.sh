#!/bin/bash

set -e
set -x

# start mavproxy with:
#    - main connection to cmavnode via UDP
#    - udp connection on port 9000 for use by other processes
#    - udp broadcast connection to allow multiple GCSs to connect to the flight controller via mavproxy
mavproxy.py \
    --master localhost:14655 \
    --out udpin:localhost:9000 \
    --out udpbcast:10.0.1.255:14550 \
    --mav10

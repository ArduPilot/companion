#!/bin/bash

set -e
set -x

# start mavproxy with:
#    - main connection to cmavnode via UDP
#    - udp connection on port 9000 for use by other processes
#    - udp broadcast connection to allow multiple GCSs to connect to the flight controller via mavproxy
mavproxy.py \
    --source-system 217 \
    --master localhost:14655 \
    --mav20 \
    --logfile /home/apsync/start_mavproxy/mav.tlog

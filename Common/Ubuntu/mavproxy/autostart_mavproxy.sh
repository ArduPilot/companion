#!/bin/bash

set -e
set -x

TITLE=MAVProxy
MAVPROXY_HOME=$HOME/start_mavproxy
SCRIPT=$MAVPROXY_HOME/start_mavproxy.sh
LOG=$MAVPROXY_HOME/autostart_mavproxy.log

# autostart for mavproxy
(
set -e
set -x
    
date
set

cd $MAVPROXY_HOME
screen -L -d -m -S "$TITLE" -s /bin/bash $SCRIPT
) >$LOG 2>&1
exit 0

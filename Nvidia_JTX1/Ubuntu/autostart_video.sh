#!/bin/bash
# autostart for video streaming

set -e
set -x

TITLE=HttpVideo
SCRIPT_HOME=$HOME/start_video
SCRIPT=$SCRIPT_HOME/start_video.sh
LOG=$SCRIPT_HOME/autostart_video.log

# autostart for mavproxy
(
set -e
set -x
    
date
set

cd $SCRIPT_HOME
screen -L -d -m -S "$TITLE" -s /bin/bash $SCRIPT
) >$LOG 2>&1
exit 0

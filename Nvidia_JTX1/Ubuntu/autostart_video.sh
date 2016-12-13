#!/bin/bash
# autostart for video streaming
(
date
export PATH=$PATH:/bin:/sbin:/usr/bin:/usr/local/bin
export HOME=/home/ubuntu
cd $HOME/start_video
screen -L -d -m -S HttpVideo -s /bin/bash $HOME/start_video/start_video.sh
) > $HOME/start_video/start_video.log 2>&1
exit 0

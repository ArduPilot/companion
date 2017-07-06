#!/bin/bash
export COMPANION_DIR=/home/pi/companion

cd $COMPANION_DIR/br-webui/

# limit logfile size to 10k lines
tail -n 10000 /home/pi/.webui.log > /tmp/.webui.log
cp /tmp/.webui.log /home/pi/.webui.log
rm -f /tmp/.webui.log

# start ssh-agent for git/ssh authentication
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_rsa

# start webserver
node index.js 2>&1 | tee -a /home/pi/.webui.log

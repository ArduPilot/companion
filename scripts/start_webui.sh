#!/bin/bash

cd $HOME/companion/br-webui/

# limit logfile size
tail -n 10000 /home/pi/.webui.log > /tmp/.webui.log
cp /tmp/.webui.log /home/pi/.webui.log
rm -f /tmp/.webui.log

node index.js 2>&1 | tee -a /home/pi/.webui.log

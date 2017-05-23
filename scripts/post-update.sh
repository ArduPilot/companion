#!/bin/bash

echo 'run npm install'
cd /home/pi/companion/br-webui && npm install

echo 'Update Complete, refresh your browser'

sleep 1

echo 'quit webui' >> /home/pi/.update_log
screen -X -S webui quit

echo 'restart webui' >> /home/pi/.update_log
sudo -H -u pi screen -dm -S webui /home/pi/companion/scripts/start_webui.sh

echo 'removing lock' >> /home/pi/.update_log
rm -f /home/pi/.updating

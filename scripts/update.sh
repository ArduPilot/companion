#!/bin/bash

echo 'adding lock' >> /home/pi/.update_log
touch /home/pi/.updating

cd /home/pi/companion

echo 'deleting previous revert point' $(git rev-parse revert-point) >> /home/pi/.update_log
git tag -d revert-point

echo 'tagging revert-point as' $(git rev-parse HEAD) >> /home/pi/.update_log
git tag revert-point

echo 'fetching' >> /home/pi/.update_log
git fetch

echo 'moving to' $1 >> /home/pi/.update_log
git reset --hard $1

echo 'running post-update' >> /home/pi/.update_log
/home/pi/companion/scripts/post-update.sh

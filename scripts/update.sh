#!/bin/bash

echo 'adding lock' >> /home/pi/.update_log
touch /home/pi/.updating

cd /home/pi/companion
echo 'removing tags' >> /home/pi/.update_log
git tag | xargs git tag -d

echo 'tagging revert-point as' $(git rev-parse HEAD) >> /home/pi/.update_log
git tag revert-point

echo 'fetching' >> /home/pi/.update_log
git fetch

echo 'moving to' $(git rev-parse stable) >> /home/pi/.update_log
echo 'moving to' $(git rev-parse stable)
git reset --hard stable

echo 'running post-update' >> /home/pi/.update_log
/home/pi/companion/scripts/post-update.sh

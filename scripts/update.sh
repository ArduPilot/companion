#!/bin/bash

echo 'adding lock'
touch /home/pi/.updating

echo 'removing old stash'
rm -rf /home/pi/.companion

echo 'stashing current repo'
cp /home/pi/companion /home/pi/.companion

cd /home/pi/companion
echo 'removing tags'
git tag | xargs git tag -d

echo 'tagging revert-point as' $(git rev-parse HEAD)
git tag revert-point

echo 'fetching'
git fetch

echo 'moving to' $(git rev-parse stable)
git reset --hard stable

echo 'running post-update'
/home/pi/companion/scripts/post-update.sh

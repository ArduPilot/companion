#!/bin/bash

REMOTE=$1
REF=$2

echo 'The update process will begin momentarily.'
echo 'This update may take more than 15 minutes.'
echo 'Please be patient and DO NOT REMOVE POWER FROM THE ROV!'

sleep 10

echo 'adding lock'
touch /home/pi/.updating


if [ -z "$4" ]; then
    echo 'skipping backup...'
else
    echo 'removing old backup'
    rm -rf /home/pi/.companion

    echo 'backup current repo'
    cp -r /home/pi/companion /home/pi/.companion
fi

cd /home/pi/companion

echo 'stashing local changes'
git -c user.name="companion-update" -c user.email="companion-update" stash

echo 'tagging revert-point as' $(git rev-parse HEAD)
git tag revert-point -f

if [ -z "$3" ]; then
    echo 'using branch reference'
    git fetch $REMOTE
    echo 'moving to' $(git rev-parse $REMOTE/$REF)
    git reset --hard $REMOTE/$REF
else
    echo 'using tag reference'
    TAG=$3
    echo 'fetching'
    git fetch $REMOTE --tags

    echo 'moving to' $(git rev-parse $TAG)
    git reset --hard $TAG
fi

echo 'running post-update'
/home/pi/companion/scripts/post-update.sh

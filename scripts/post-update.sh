#!/bin/bash

# Bugfix for revert on first update. 0.0.7 had a bug in update.sh where the companion directory was not copied correctly (no -r option)
# Do it the right way here so we can revert if
cd /home/pi/companion
WAS_0_0_7=$(git rev-list --count revert-point...0.0.7)
if [ $WAS_0_0_7 == 0 ]; then
    echo '0.0.7 update, repairing fall-back...'
    cp -r /home/pi/companion /home/pi/.companion
    cd /home/pi/.companion
    git reset --hard 0.0.7
fi

cd /home/pi/companion/br-webui

if ! npm list nodegit 2>&1 | grep -q nodegit@0.18.3; then
    echo 'Fetching nodegit packages for raspberry pi...'
    wget --timeout=15 --tries=2 https://s3.amazonaws.com/downloads.bluerobotics.com/Pi/dependencies/nodegit/nodegit_required_modules.zip -O /tmp/nodegit_required_modules.zip
    if [ $? -ne 0 ] # If "wget" failed:
    then
        echo 'Failed to retrieve nodegit packages; Aborting update'
        echo 'Rebooting to repair installation, this will take a few minutes'
        echo 'Please DO NOT REMOVE POWER FROM THE ROV! (until QGC makes a connection again)'
        sleep 0.1
        sudo reboot
    fi

    echo 'Extracting prebuilt packages...'
    unzip -q /tmp/nodegit_required_modules.zip -d ~/companion/br-webui/node_modules/
fi

# TODO prune unused npm modules here

echo 'run npm install'
npm install
if [ $? -ne 0 ] # If "npm install" failed:
then
    echo 'Failed to install required npm modules; Aborting update'
        echo 'Rebooting to repair installation, this will take a few minutes'
        echo 'Please DO NOT REMOVE POWER FROM THE ROV! (until QGC makes a connection again)'
    sleep 0.1
    sudo reboot
fi

cd /home/pi/companion

echo 'Updating submodules...'
git submodule init && git submodule sync
if [ $? -ne 0 ] # If either "git submodule" failed:
then
    echo 'Failed to update submodules; Aborting update'
        echo 'Rebooting to repair installation, this will take a few minutes'
        echo 'Please DO NOT REMOVE POWER FROM THE ROV! (until QGC makes a connection again)'
    sleep 0.1
    sudo reboot
fi

# https://git-scm.com/docs/git-submodule#git-submodule-status--cached--recursive--ltpathgt82308203

echo 'Checking mavlink status...'
MAVLINK_STATUS=$(git submodule status | grep mavlink | head -c 1)
if [[ ! -z $MAVLINK_STATUS && ($MAVLINK_STATUS == '+' || $MAVLINK_STATUS == '-') ]]; then
    # Remove old mavlink directory if it exists
    [ -d ~/mavlink ] && sudo rm -rf ~/mavlink
    echo 'mavlink needs update.'
    git submodule update --recursive --init -f submodules/mavlink
    if [ $? -ne 0 ] # If mavlink submodule update failed:
    then
        echo 'Failed to update mavlink submodule; Aborting update'
        echo 'Rebooting to repair installation, this will take a few minutes'
        echo 'Please DO NOT REMOVE POWER FROM THE ROV! (until QGC makes a connection again)'
        sleep 0.1
        sudo reboot
    fi

    echo 'Installing mavlink...'
    cd /home/pi/companion/submodules/mavlink/pymavlink
    sudo python setup.py build install
    if [ $? -ne 0 ] # If mavlink installation update failed:
    then
        echo 'Failed to install mavlink; Aborting update'
        echo 'Rebooting to repair installation, this will take a few minutes'
        echo 'Please DO NOT REMOVE POWER FROM THE ROV! (until QGC makes a connection again)'
        sleep 0.1
        sudo reboot
    fi
else
    echo 'mavlink is up to date.'
fi

cd /home/pi/companion

echo 'Checking MAVProxy status...'
MAVPROXY_STATUS=$(git submodule status | grep MAVProxy | head -c 1)
if [[ ! -z $MAVPROXY_STATUS && ($MAVPROXY_STATUS == '+' || $MAVPROXY_STATUS == '-') ]]; then
    echo 'MAVProxy needs update.'
    git submodule update --recursive -f submodules/MAVProxy
    if [ $? -ne 0 ] # If MAVProxy submodule update failed:
    then
        echo 'Failed to update MAVProxy submodule; Aborting update'
        echo 'Rebooting to repair installation, this will take a few minutes'
        echo 'Please DO NOT REMOVE POWER FROM THE ROV! (until QGC makes a connection again)'
        sleep 0.1
        sudo reboot
    fi

    echo 'Installing MAVProxy...'
    cd /home/pi/companion/submodules/MAVProxy
    sudo python setup.py build install
    if [ $? -ne 0 ] # If MAVProxy installation update failed:
    then
        echo 'Failed to install MAVProxy; Aborting update'
        echo 'Rebooting to repair installation, this will take a few minutes'
        echo 'Please DO NOT REMOVE POWER FROM THE ROV! (until QGC makes a connection again)'
        sleep 0.1
        sudo reboot
    fi
else
    echo 'MAVProxy is up to date.'
fi

echo 'checking for github in known_hosts'

# Check for github key in known_hosts
if ! ssh-keygen -H -F github.com; then
    mkdir ~/.ssh

    # Get gihub public key
    ssh-keyscan -t rsa -H github.com > /tmp/githost

    # Verify fingerprint
    if ssh-keygen -lf /tmp/githost | grep -q 16:27:ac:a5:76:28:2d:36:63:1b:56:4d:eb:df:a6:48; then
        # Add to known_hosts
        cat /tmp/githost >> ~/.ssh/known_hosts
    fi
fi

# install pynmea2 if neccessary
if pip list | grep pynmea2; then
    echo 'pynmea2 already installed'
else
    echo 'installing pynmea2...'
    sudo pip install pynmea2
    if [ $? -ne 0 ] # If "pip install pynmea2" failed:
    then
        echo 'Failed to install pynmea2; Aborting update'
        echo 'Rebooting to repair installation, this will take a few minutes'
        echo 'Please DO NOT REMOVE POWER FROM THE ROV! (until QGC makes a connection again)'
        sleep 0.1
        sudo reboot
    fi
fi

# install grequests if neccessary
if pip list | grep grequests; then
    echo 'grequests already installed'
else
    echo 'Fetching grequests packages for raspberry pi...'
    wget --timeout=15 --tries=2 https://s3.amazonaws.com/downloads.bluerobotics.com/Pi/dependencies/grequests/grequests.zip -O /tmp/grequests.zip
    if [ $? -ne 0 ] # If "wget" failed:
    then
        echo 'Failed to retrieve grequests packages; Aborting update'
        echo 'Rebooting to repair installation, this will take a few minutes'
        echo 'Please DO NOT REMOVE POWER FROM THE ROV! (until QGC makes a connection again)'
        sleep 0.1
        sudo reboot
    fi
    echo 'Extracting prebuilt packages...'
    sudo unzip -q -o /tmp/grequests.zip -d /
    echo 'installing grequests...'
    sudo pip install grequests
    if [ $? -ne 0 ] # If "pip install grequests" failed:
    then
        echo 'Failed to install grequests; Aborting update'
        echo 'Rebooting to repair installation, this will take a few minutes'
        echo 'Please DO NOT REMOVE POWER FROM THE ROV! (until QGC makes a connection again)'
        sleep 0.1
        sudo reboot
    fi
fi

# copy default parameters if neccessary
cd /home/pi/companion/params

for default_param_file in *; do
    if [[ $default_param_file == *".param.default" ]]; then
        param_file="/home/pi/"$(echo $default_param_file | sed "s/.default//")
        if [ ! -e "$param_file" ]; then
            cp $default_param_file $param_file
        fi
    fi
done

# change the pi user password to 'bluerobotics' instead of the default 'raspberry'
PRE_0_0_8=$(( git rev-list --count --left-right 0.0.8...revert-point || echo 0 ) | cut -f1)
if (( $PRE_0_0_8 > 0 )); then
    echo "changing default password to 'companion'..."
    echo "pi:companion" | sudo chpasswd
fi

# We need to load bcm v4l2 driver in case Raspberry Pi camera is in use
PRE_0_0_11=$(( git rev-list --count --left-right 0.0.11...revert-point || echo 0 ) | cut -f1)
if (( $PRE_0_0_11 > 0 )); then
    echo "restarting video stream"
    ~/companion/scripts/start_video.sh $(cat ~/companion/params/vidformat.param.default)
fi

# add local repo as a remote so it will show up in webui
cd ~/companion
if ! git remote | grep -q local; then
    echo 'Adding local reference'
    git remote add local ~/companion
fi

echo 'Update Complete, refresh your browser'

sleep 0.1

echo 'quit webui' >> /home/pi/.update_log
screen -X -S webui quit

echo 'restart webui' >> /home/pi/.update_log
sudo -H -u pi screen -dm -S webui /home/pi/companion/scripts/start_webui.sh

echo 'removing lock' >> /home/pi/.update_log
rm -f /home/pi/.updating

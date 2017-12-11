#!/bin/bash

cd /home/pi/companion

# https://git-scm.com/docs/git-submodule#git-submodule-status--cached--recursive--ltpathgt82308203


# Remove old mavlink directory if it exists
[ -d ~/mavlink ] && sudo rm -rf ~/mavlink
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


cd /home/pi/companion


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
    sudo pip install --no-index --find-links /home/pi/update-dependencies/pynmea2-pip pynmea2
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
    echo 'grequests needs install'
    echo 'Extracting prebuilt packages...'
    sudo unzip -q -o /home/pi/update-dependencies/grequests.zip -d /
    echo 'installing grequests...'
    sudo pip install --no-index --find-links /home/pi/update-dependencies/grequests-pip grequests
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


echo "changing default password to 'companion'..."
echo "pi:companion" | sudo chpasswd

# We need to load bcm v4l2 driver in case Raspberry Pi camera is in use
echo "restarting video stream"
~/companion/scripts/start_video.sh $(cat ~/companion/params/vidformat.param.default)

# add local repo as a remote so it will show up in webui
cd ~/companion
if ! git remote | grep -q local; then
    echo 'Adding local reference'
    git remote add local ~/companion
fi

rm -rf /home/pi/update-dependencies

echo 'Update Complete, refresh your browser'

sleep 0.1

echo 'quit webui' >> /home/pi/.update_log
screen -X -S webui quit

echo 'restart webui' >> /home/pi/.update_log
sudo -H -u pi screen -dm -S webui /home/pi/companion/scripts/start_webui.sh

echo 'removing lock' >> /home/pi/.update_log
rm -f /home/pi/.updating

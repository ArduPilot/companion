#!/bin/bash

cd /home/pi/companion/br-webui

if ! npm list nodegit | grep -q nodegit@0.18.3; then
    echo 'Fetching nodegit packages for raspberry pi...'
    wget https://s3.amazonaws.com/downloads.bluerobotics.com/Pi/dependencies/nodegit/nodegit_required_modules.zip -O /tmp/nodegit_required_modules.zip
    echo 'Extracting prebuilt packages...'
    unzip -q /tmp/nodegit_required_modules.zip -d ~/companion/br-webui/node_modules/
fi

echo 'run npm install'
npm install

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

echo 'Update Complete, refresh your browser'

sleep 1

echo 'quit webui' >> /home/pi/.update_log
screen -X -S webui quit

echo 'restart webui' >> /home/pi/.update_log
sudo -H -u pi screen -dm -S webui /home/pi/companion/scripts/start_webui.sh

echo 'removing lock' >> /home/pi/.update_log
rm -f /home/pi/.updating

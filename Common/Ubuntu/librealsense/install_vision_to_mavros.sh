#!/bin/bash

set -e
set -x

tput setaf 3
echo "Installing vision_to_mavros"
tput sgr0

sudo apt -y install python3-lxml
sudo -H pip3 install cython
sudo -H pip3 install numpy --upgrade
sudo -H pip3 install transformations
sudo -H pip3 install apscheduler
sudo -H pip3 install dronekit

pushd /home/$NORMAL_USER/GitHub
rm -rf vision_to_mavros
git clone https://github.com/thien94/vision_to_mavros.git

rm -rf /home/$NORMAL_USER/start_t265_to_mavlink
mkdir /home/$NORMAL_USER/start_t265_to_mavlink
pushd vision_to_mavros/scripts
cp t265_to_mavlink.py /home/$NORMAL_USER/start_t265_to_mavlink
popd
popd
cp autostart_t265.sh /home/$NORMAL_USER/start_t265_to_mavlink
cp start_t265.sh /home/$NORMAL_USER/start_t265_to_mavlink
cp stop_t265.sh /home/$NORMAL_USER/start_t265_to_mavlink
cp view_log_t265.sh /home/$NORMAL_USER/start_t265_to_mavlink
sudo cp t265.service /etc/systemd/system

# add line to /etc/rc.local to start t265 service
LINE="/bin/bash -c '~$NORMAL_USER/start_t265_to_mavlink/autostart_t265.sh'"
sudo perl -pe "s%^exit 0%$LINE\\n\\nexit 0%" -i /etc/rc.local

tput setaf 2
echo "Finished installing vision_to_mavros"
tput sgr0


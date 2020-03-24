#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

. config.env

pushd /home/$NORMAL_USER/GitHub/companion/RPI2/Ubuntu
time ./setup_master_mavlink-router.sh

time ./7_dflogger.sh # ~210s

time apt-get install -y libxml2-dev libxslt1.1 libxslt1-dev

time ./install_pymavlink # new version required for apweb #1m
#Fix pymavlink for apweb install
sudo -u $NORMAL_USER -H bash <<EOF
 set -e
 set -x

 pushd /home/$NORMAL_USER/GitHub/pymavlink
 git config --global user.email "devel@ardupilot.org"
 git config --global user.name "ArduPilotCompanion"

 git stash
 git revert e1532c3fc306d83d03adf82fb559f1bb50860c03
 export MDEF=~/GitHub/mavlink/message_definitions
 python setup.py build install --user --force
 popd
EOF

time ./install_apweb # 2m

tput setaf 2
echo "Finished installing APSync Components"

tput sgr0
popd

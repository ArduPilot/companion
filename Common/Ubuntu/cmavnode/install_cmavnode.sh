#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

if [ -z "$TELEM_SERIAL_PORT" ]; then
    echo 'TELEM_SERIAL_PORT must be set (e.g. "/dev/ttyS1" or "/dev/ttyMFD1")'
    exit 1
fi

if [ -z "$TELEM_SERIAL_BAUD" ]; then
    echo 'TELEM_SERIAL_BAUD must be set (e.g. "921600" or "2000000")'
    exit 1
fi

set -e
set -x

apt-get install -y cmake libboost-dev libboost-thread-dev libboost-program-options-dev libconfig++-dev libreadline-dev

adduser $NORMAL_USER dialout

# install cmavnode to provide a fast mavlink proxy for the serial port
sudo -u $NORMAL_USER -H bash <<EOF
set -e
set -x

# auto start cmavnode
CMAVNODE_HOME=~/start_cmavnode
rm -rf \$CMAVNODE_HOME
if [ ! -d \$CMAVNODE_HOME ]; then
    mkdir \$CMAVNODE_HOME
fi
cp start_cmavnode.sh \$CMAVNODE_HOME/
cp autostart_cmavnode.sh \$CMAVNODE_HOME/
cp cmavnode.conf \$CMAVNODE_HOME/
cp log.conf \$CMAVNODE_HOME
perl -pe 's%/dev/ttyUSB0%$TELEM_SERIAL_PORT%' -i \$CMAVNODE_HOME/cmavnode.conf
perl -pe 's%921600%$TELEM_SERIAL_BAUD%' -i \$CMAVNODE_HOME/cmavnode.conf

pushd ~/GitHub
 rm -rf cmavnode
 git clone --recurse-submodules https://github.com/peterbarker/cmavnode
 pushd cmavnode
  git checkout apsync-new
  git submodule update --init
  cmake CMakeLists.txt
  time (make | cat)
  cp cmavnode \$CMAVNODE_HOME
 popd
popd

EOF


# add line below to bottom of /etc/rc.local to call start script
LINE="# sudo -H -u $NORMAL_USER /bin/bash -c '~$NORMAL_USER/start_cmavnode/autostart_cmavnode.sh'"
perl -pe "s%^exit 0%$LINE\\n\\nexit 0%" -i /etc/rc.local

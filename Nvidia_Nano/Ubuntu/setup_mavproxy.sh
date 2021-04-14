#!/bin/bash

# this script sets up mavproxy

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

sudo -u $NORMAL_USER -H bash <<'EOF'
set -e
set -x

. ./config.env

pushd ~/$NORMA_USER/GitHub/
sudo rm -rf mavproxy
git clone https://github.com/ardupilot/mavproxy
pushd mavproxy
sudo python setup.py build install
popd
popd

# auto start mavproxy
MAVPROXY_HOME=~/start_mavproxy
if [ ! -d $MAVPROXY_HOME ]; then
    mkdir $MAVPROXY_HOME
fi
cp start_mavproxy.sh $MAVPROXY_HOME/
cp autostart_mavproxy.sh $MAVPROXY_HOME/

cat >>$HOME/.mavinit.scr <<EOF2
set moddebug 3
EOF2

EOF
# add line below to bottom of /etc/rc.local to call start script note
# that the line is commented out by default, as cmavnode should
# probably be used where convenient, as MAVProxy can use an inordinate
# amount of CPU.
LINE="# sudo -H -u $NORMAL_USER /bin/bash -c '~$NORMAL_USER/start_mavproxy/autostart_mavproxy.sh'"
perl -pe "s%^exit 0%$LINE\\n\\nexit 0%" -i /etc/rc.local

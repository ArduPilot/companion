#!/bin/bash

# this script sets up mavproxy

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

sudo -u ubuntu -H bash <<'EOF'
set -e
set -x

# auto start mavproxy
MAVPROXY_HOME=~/start_mavproxy
if [ ! -d $MAVPROXY_HOME ]; then
    mkdir $MAVPROXY_HOME
fi
cp start_mavproxy.sh $MAVPROXY_HOME/
cp autostart_mavproxy.sh $MAVPROXY_HOME/
EOF

# add line below to bottom of /etc/rc.local to call start script
LINE="sudo -H -u ubuntu /bin/bash -c '~ubuntu/start_mavproxy/autostart_mavproxy.sh'"
perl -pe "s%^exit 0%$LINE\\n\\nexit 0%" -i /etc/rc.local

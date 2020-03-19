#!/bin/bash

# this script sets up uhubctl so that it can be used to power cycle the USB hub for use with the Intel RealSense T265 camera

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

if [ -z "$NORMAL_USER" ]; then
    echo 'NORMAL_USER must be set (e.g. "pi" or "ubuntu")'
    exit 1
fi

set -e
set -x

apt-get install -y libusb-1.0-0-dev

sudo -u $NORMAL_USER -H bash <<EOF
set -e
set -x

UHUBCTL_HOME="\$HOME/start_uhubctl"
if [ ! -d "\$UHUBCTL_HOME" ]; then
    mkdir \$UHUBCTL_HOME
fi

pushd ~/GitHub
 rm -rf uhubctl
 git clone https://github.com/mvp/uhubctl
 pushd uhubctl
  time make
  cp uhubctl \$UHUBCTL_HOME/
 popd
popd

cp start_uhubctl.sh \$UHUBCTL_HOME/
cp autostart_uhubctl.sh \$UHUBCTL_HOME/

EOF

# add line below to bottom of /etc/rc.local to run uhubctl
LINE="/bin/bash -c '~$NORMAL_USER/start_uhubctl/autostart_uhubctl.sh'"
perl -pe "s%^exit 0%$LINE\\n\\nexit 0%" -i /etc/rc.local

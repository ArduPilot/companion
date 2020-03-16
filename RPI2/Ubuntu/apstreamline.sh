#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

tput setaf 3
echo "Installing AP Streamline"
tput sgr0

apt install python3 python3-pip meson ninja-build libgstreamer-plugins-base1.0* libgstreamer1.0-dev libgstrtspserver-1.0-dev gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly -y

sudo -u $NORMAL_USER -H bash <<EOF
set -e
set -x

. config.env

pip3 install meson --user

sudo modprobe bcm2835-v4l2
echo "bcm2835-v4l2" | sudo tee -a /etc/modules >/dev/null

pushd /home/$NORMAL_USER/GitHub
rm -rf APStreamline

[ -d apstreamline ] || {
    git clone https://github.com/shortstheory/adaptive-streaming.git APStreamline
}

pushd /home/$NORMAL_USER/GitHub/APStreamline
 git checkout master
 meson build
 pushd build
  meson configure -Dprefix=$HOME/start_apstreamline/
  ninja install
  sudo cp $HOME/start_apstreamline/bin/stream_server /bin/stream_server
 popd
popd
EOF

tput setaf 2
echo "Succesful install of AP Streamline"
tput sgr0

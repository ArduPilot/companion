#!/bin/bash

# this script sets up the live video streaming

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

. config.env

set -e
set -x

# setup live video via http (complements of Krita from NII)
# install and build http-launch
sudo apt-get install -y git build-essential dpkg-dev flex bison autoconf autotools-dev automake liborc-dev autopoint libtool gtk-doc-tools libgstreamer1.0-dev

sudo -u $NORMAL_USER -H bash <<'EOF'
set -e
set -x

GITHUB_DIR=~/GitHub
if [ ! -d "$GITHUB_DIR" ]; then
    mkdir "$GITHUB_DIR"
fi

pushd $GITHUB_DIR
 git clone https://github.com/sdroege/http-launch
 pushd http-launch
  export PKG_CONFIG_PATH="$GITHUB_DIR/http-launch/out/lib/pkgconfig"
  ./autogen.sh
  ./configure --prefix="$GITHUB_DIR/http-launch/out"
  make
  make install
 popd
popd

# copy startup scripts
VIDEO_HOME=~/start_video
if [ ! -d "$VIDEO_HOME" ]; then
  mkdir "$VIDEO_HOME"
fi
cp start_video.sh "$VIDEO_HOME/"
cp autostart_video.sh "$VIDEO_HOME/"
EOF

# add line below to bottom of /etc/rc.local to start video support
echo "" | sudo tee -a /etc/rc.local
LINE="# sudo -H -u $NORMAL_USER /bin/bash -c '~$NORMAL_USER/start_video/autostart_video.sh'"
perl -pe "s%^exit 0%$LINE\\n\\nexit 0%" -i /etc/rc.local

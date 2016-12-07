#!/bin/bash

# this script sets up the live video streaming

# setup live video via http (complements of Krita from NII)
# install and build http-launch
sudo apt-get install -y git build-essential dpkg-dev flex bison autoconf autotools-dev automake liborc-dev autopoint libtool gtk-doc-tools libgstreamer1.0-dev

# store current directory
pushd .

mkdir ~/GitHub
cd ~/GitHub
git clone https://github.com/sdroege/http-launch
cd http-launch
export PKG_CONFIG_PATH=/home/ubuntu/GitHub/http-launch/out/lib/pkgconfig
./autogen.sh
./configure --prefix=/home/ubuntu/GitHub/http-launch/out
make
make install

# return to stored directory
popd

# copy startup scripts
mkdir ~/start_video
cp start_video.sh ~/start_video
cp autostart_video.sh ~/start_video

# add line below to bottom of /etc/rc.local to call $HOME/start_mavproxy/autostart_mavproxy.sh
echo "sudo -H -u ubuntu /bin/bash -c '/home/ubuntu/start_video/autostart_video.sh'" | sudo tee -a /etc/rc.local

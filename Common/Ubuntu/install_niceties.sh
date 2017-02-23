#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

apt-get install -y \
	strace \
	ltrace \
	tcpdump \
	lsof \
	mlocate \
	v4l-utils \
	usbutils


Working video to qgc et al
raspivid -t 0 -h 720 -w 1024 -fps 25 -hf -b 2000000 -o - | gst-launch-1.0 -v fdsrc ! h264parse !  rtph264pay config-interval=1 pt=96 ! udpsink host=10.0.1.102 port=9000

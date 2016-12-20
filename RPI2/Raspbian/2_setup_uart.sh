#!/bin/bash

# RPi2 setup script for use as companion computer

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

# enable uart (for RPi3, should do nothing on RPi and RPi1?)
echo "enable_uart=1" >>/boot/config.txt

# stop systemd starting a getty on ttyS0:
systemctl disable serial-getty@ttyS0.service
perl -pe 's/ console=serial0,115200//' -i /boot/cmdline.txt

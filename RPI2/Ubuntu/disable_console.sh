#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

. config.env

tput setaf 3
echo "Disabling Serial Console to ttyS0"
tput sgr0

systemctl mask serial-getty@ttyS0.service

#copy uboot.env configuration to disable uboot wait for key
cp uboot.env /boot/firmware

perl -pe 's/console=ttyAMA0,115200//' -i /boot/config-5.3.0-1017-raspi2
perl -pe 's/console=ttyAMA0,115200//' -i /boot/config-5.3.0-1018-raspi2

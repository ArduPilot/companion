#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

. config.env

perl -pe 's/ console=ttyS0,115200//' -i /boot/extlinux/extlinux.conf

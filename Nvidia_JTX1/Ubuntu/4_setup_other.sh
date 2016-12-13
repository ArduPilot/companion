#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

# enable log compression
sed -i s/'rotate 4'/'rotate 1'/g /etc/logrotate.conf   # keep 1 week of backups
sed -i s/#compress/compress/g /etc/logrotate.conf   # cpmpress backups

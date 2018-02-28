#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

. config.env

CONF=/boot/extlinux/extlinux.conf
TIMESTAMP=`date '+%Y%m%d%H%M%S'`
cp $CONF{,-$TIMESTAMP}
# this is probably better done before flashing the image.
FOO=`cat /proc/cmdline | perl -pe 's/ console=ttyS0[^\s]*//'`
perl -pe "s%\\$\\{cbootargs\\}%$FOO%" -i $CONF

#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

killall -9 cmavnode mavproxy.py dataflash_logger || true

rm -f $HOME/.bash_history
rm -f /home/$NORMAL_USER/.bash_history
rm -f /home/$NORMAL_USER/mav{.parm,.tlog{,.raw}}
rm -f /home/$NORMAL_USER/.ssh/authorized_keys
rm -f /home/$NORMAL_USER/dflogger/dataflash/*
rm -f /home/$NORMAL_USER/start*/screenlog.0
rm -f /home/$NORMAL_USER/start*/start_*.log
rm -f /var/log/*
history -c
apt-get autoremove -y
apt-get clean

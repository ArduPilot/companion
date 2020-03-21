#!/bin/bash

# Stop t265 service

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

sudo systemctl stop t265

#!/bin/bash

# Tail log of d4xx service

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

journalctl -u d4xx.service -f

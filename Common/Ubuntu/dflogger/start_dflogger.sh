#!/bin/bash

set -e
set -x

pushd "$HOME/dflogger"

# dflogger.conf specifies dataflash_logger for the logs themselves:
if [ ! -d dataflash ]; then
  mkdir dataflash
fi

./dataflash_logger -d -c dflogger.conf

exit 0

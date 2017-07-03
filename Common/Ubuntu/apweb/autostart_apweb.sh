#!/bin/bash

# WARNING: this script is run as root!
set -e
set -x

pushd ~apsync/start_apweb
screen -L -d -m -S apweb -s /bin/bash ./start_apweb.sh >start_apweb.log 2>&1

exit 0

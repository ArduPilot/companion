#!/bin/bash

set -e
set -x

pushd $HOME/start_mavlink-router
screen -L -d -m -S mavlink-router -s /bin/bash ./start_mavlink-router.sh >start_mavlink-router.log 2>&1

exit 0

#!/bin/bash

set -e
set -x

pushd $HOME/start_openkai
screen -L -d -m -S OpenKAI -s /bin/bash ./start_openkai.sh >start_openkai.log 2>&1

exit 0

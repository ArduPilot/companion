#!/bin/bash

set -e
set -x

pushd $HOME/start_cmavnode
screen -L -d -m -S cmavnode -s /bin/bash ./start_cmavnode.sh >start_cmavnode.log 2>&1

exit 0

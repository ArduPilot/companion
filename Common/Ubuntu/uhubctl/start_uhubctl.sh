#!/bin/bash

set -e
set -x

pushd ~apsync/start_uhubctl

./uhubctl -a cycle -l 1 -p 1-4
./uhubctl -a cycle -l 2 -p 1-4

exit 0

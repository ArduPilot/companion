#!/bin/bash

set -e
set -x

export LD_LIBRARY_PATH=/usr/local/zed
./OpenKAI $PWD/kiss/apsync.kiss

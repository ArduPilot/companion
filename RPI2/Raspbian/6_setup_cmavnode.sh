#!/bin/bash

set -e
set -x

. config.env

pushd ../../Common/Ubuntu/cmavnode
./install_cmavnode.sh
popd

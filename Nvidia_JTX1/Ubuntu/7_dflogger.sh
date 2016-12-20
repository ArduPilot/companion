#!/bin/bash

set -e
set -x

. config.env

pushd ../../Common/Ubuntu/dflogger/
 ./install_dflogger
popd

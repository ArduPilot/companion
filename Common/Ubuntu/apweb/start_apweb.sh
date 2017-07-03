#!/bin/bash

# WARNING: this script is run as root!
# we need to bind port 80, and we don't do password-less sudo

set -e
set -x

./web_server -p 80 -f 14755

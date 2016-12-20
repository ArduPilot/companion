#!/bin/bash

# RPi2 setup script for use as companion computer

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

# cherrypy web server (used by red balloon finder)
pip install cherrypy

# install red balloon finder

sudo -u pi -H bash <<'EOF'
set -e
set -x

if [ ! -d ~/GitHub ]; then
  mkdir ~/GitHub
fi
cd ~/GitHub
git clone https://github.com/rmackay9/ardupilot-balloon-finder
EOF


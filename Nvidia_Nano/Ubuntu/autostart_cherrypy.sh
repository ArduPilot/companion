#!/bin/bash

set -e
set -x

pushd $HOME/start_cherrypy
screen -L -d -m -S cherrypy -s /bin/bash ./start_cherrypy.sh >start_cherrypy.log 2>&1

exit 0

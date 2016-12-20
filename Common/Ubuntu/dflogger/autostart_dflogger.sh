#!/bin/bash

set -e
set -x

TITLE=DataFlashLogger
DFLOGGER_HOME=$HOME/dflogger
SCRIPT=$DFLOGGER_HOME/start_dflogger.sh
LOG=$DFLOGGER_HOME/autostart_dflogger.log

# autostart for dataflash logger
(
set -e
set -x
    
date
set

cd $DFLOGGER_HOME
screen -L -d -m -S "$TITLE" -s /bin/bash $SCRIPT
) >$LOG 2>&1
exit 0

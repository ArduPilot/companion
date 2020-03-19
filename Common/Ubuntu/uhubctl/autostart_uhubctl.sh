#!/bin/bash

set -e
set -x

TITLE=uhubctl
UHUBCTL_HOME=~apsync/start_uhubctl
SCRIPT=$UHUBCTL_HOME/start_uhubctl.sh
LOG=$UHUBCTL_HOME/autostart_uhubctl.log

# autostart for uhubctl logger
(
set -e
set -x
    
date
set

cd $UHUBCTL_HOME
/bin/bash $SCRIPT
) >$LOG 2>&1
exit 0

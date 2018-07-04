#!/bin/bash

set -e
set -x

# on JetPack-3.1 and JetPack-3.2:
LIGHTDM_CONF=/usr/share/lightdm/lightdm.conf.d/50-ubuntu.conf
if [ -f "$LIGHTDM_CONF" ]; then
    ls $LIGHTDM_CONF
    perl -pe 's/nvidia/apsync/' -i $LIGHTDM_CONF
fi

# on JetPack-3.0:
LIGHTDM_CONF=/etc/lightdm/lightdm.conf.d/50-nvidia.conf
if [ -f "$LIGHTDM_CONF" ]; then
    ls $LIGHTDM_CONF
    sudo perl -pe 's/ubuntu/apsync/' -i $LIGHTDM_CONF
fi

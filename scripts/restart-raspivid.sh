#!/bin/bash

screen -X -S video quit
echo one
echo $1
echo two
echo $2
sudo -H -u pi screen -dm -S video $HOME/companion/scripts/start_raspivid.sh "$1" "$2"

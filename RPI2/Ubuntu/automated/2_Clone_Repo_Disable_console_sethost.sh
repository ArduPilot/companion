#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

. config.env

tput setaf 3
echo "Cloning Companion Repo"
tput sgr0

pushd /home/$NORMAL_USER

pushd /home/$NORMAL_USER/GitHub/companion/RPI2/Ubuntu

tput setaf 3
echo "Running Scripts"
tput sgr0

tput setaf 3
echo "Setting Hostname to apsync"
tput sgr0
./set-hostname   # reset the machine's hostname

tput setaf 3
echo "Removing unused packages"
tput sgr0
apt autoremove -y # avoid repeated no-longer-required annoyance
./remove-unattended-upgrades

tput setaf 3
echo "Setting up rc.local"
tput sgr0
./ensure_rc_local.sh

tput setaf 3
echo "Disabling TTY console on serial port"
tput sgr0
./disable_console.sh

tput setaf 2
echo "Rebooting in 5 sec to Finish changes"
tput sgr0

sleep 5
reboot # ensure hostname correct / console disabling OK / autologin working

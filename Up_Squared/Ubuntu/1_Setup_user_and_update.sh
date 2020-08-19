#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

. config.env

#Update and upgrade all packages to the latest versions
apt update
apt upgrade -y

apt install nano rsync
#    create an apsync user:
useradd -s /bin/bash -m -U -G sudo,netdev,users,dialout,video $NORMAL_USER

tput setaf 3
echo "Setting password for AP user"
tput sgr0

echo "$NORMAL_USER:$NORMAL_USER" | chpasswd

pushd /home/$STD_USER
rsync -aPH --delete /home/$STD_USER/ /home/$NORMAL_USER
chown -R $NORMAL_USER.$NORMAL_USER /home/$NORMAL_USER
rm -rf *

tput setaf 2
echo >&2 "Finished part 1 of APSync install, please logout and then log back in using apsync user, password apsync"
tput sgr0

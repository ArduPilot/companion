#!/bin/bash

# this script sets up the serial port and various other things

# remove this file which stores old LAN MAC addresses
sudo rm /etc/udev/rules.d/70-persistent-net.rules
# create a new fules file that doesn't store the MAC addresses (see http://askubuntu.com/questions/240632/how-to-disable-udev-net-rule-generation)
echo "SUBSYSTEM==\"net\", DRIVERS==\"?*\", NAME=\"%k\"" | sudo tee -a /etc/udev/rules.d/75-persistent-net.rules

# remove ttyS0 startup file so that it does not interfere with ttyS0 serial comms to pixhawk
sudo rm /etc/init/ttyS0.conf

# remove ttyS0 from /boot/extlinux/extlinux.conf
sudo sed -i s/' console=ttyS0'//g /boot/extlinux/extlinux.conf

# enable log compression
sudo sed -i s/'rotate 4'/'rotate 1'/g /etc/logrotate.conf   # keep 1 week of backups
sudo sed -i s/#compress/compress/g /etc/logrotate.conf   # keep 1 week of backups

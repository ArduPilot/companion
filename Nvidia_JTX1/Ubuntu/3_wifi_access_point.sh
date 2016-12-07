#!/bin/bash

# this script sets up the wifi access point

# NOTE: if something goes wrong with this setup, and you are unable to connect to the TX1, connect a keyboard and mouse and type "sudo dhclient eth0"
sudo apt-get -y install hostapd dnsmasq haveged

# disable network manager
echo "manual" | sudo tee /etc/init/network-manager.override
sudo mv /etc/init/network-manager.conf /etc/init/network-manager.conf.bak

echo "options bcmdhd op_mode=2" | sudo tee -a /etc/modprobe.d/bcmdhd.conf

# modify /etc/default/hostapd to use our config file
sudo sed -i s/#DAEMON_CONF=\"\"/DAEMON_CONF='\"\/etc\/hostapd\/hostapd.conf\"/g' /etc/default/hostapd

# copy our hostapd config file into place
sudo cp hostapd.conf /etc/hostapd

# add IP address range to /etc/dnsmasq.conf
echo "interface=wlan0" | sudo tee -a /etc/dnsmasq.conf
echo "dhcp-range=10.0.1.128,10.0.1.254,12h" | sudo tee -a /etc/dnsmasq.conf

# disable NetworkManager so it does not interfere
echo "manual" | sudo tee -a /etc/init/network-manager.override

# create /etc/rc.local file to automatically start hostapd on each reboot
sudo cp rc.local /etc
# make sure /etc/rc.local is executable
sudo chmod a+x /etc/rc.local

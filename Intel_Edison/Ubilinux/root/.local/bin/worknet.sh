#!/bin/bash
# Change Network to Home Network
echo "Changing /etc/network/interfaces file"
cp /etc/network/interfaces.work /etc/network/interfaces
echo "Disable wlan0"
ifdown wlan0
echo "Re-enable wlan0"
ifup wlan0

#!/bin/sh

# Copy default cmdline to temp
cp /home/pi/companion/tools/cmdline.txt /tmp/
# Add ip in the end of cmdline
echo "ip=${1}" >> /tmp/cmdline.txt
# Cat everything to make sure
cat /tmp/cmdline.txt
# Change owner
sudo chown -R root:root /tmp/cmdline.txt
# Move it to /boot
sudo mv /tmp/cmdline.txt /boot/cmdline.txt
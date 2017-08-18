#!/bin/bash
if lsusb | grep 05a3:9422; then
  echo "USB Cam"
  screen -dm -S video $HOME/companion/scripts/start_usbvid.sh
else
  echo "Raspi Cam"
  DIR=$(dirname "$0")
  camOptions=$(cat /home/pi/rpicamera.param)
  gstOptions=$(cat /home/pi/gstreamer.param)
  screen -dm -S video $HOME/companion/scripts/start_raspivid.sh "$camOptions" "$gstOptions"
fi

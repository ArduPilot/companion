cd /home/pi/
if lsusb | grep 05a3:9422; then
  echo "USB Cam"
  screen -dm -S video /home/pi/companion/RPI2/Raspbian/start_usbvid.sh
else
  echo "Raspi Cam"
  screen -dm -S video /home/pi/companion/RPI2/Raspbian/start_raspivid.sh
fi

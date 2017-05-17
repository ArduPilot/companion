cd $HOME
if lsusb | grep 05a3:9422; then
  echo "USB Cam"
  screen -dm -S video $HOME/companion/scripts/start_usbvid.sh
else
  echo "Raspi Cam"
  screen -dm -S video $HOME/companion/scripts/start_raspivid.sh
fi

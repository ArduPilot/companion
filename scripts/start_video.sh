cd $HOME
if lsusb | grep 05a3:9422; then
  echo "USB Cam"
  screen -dm -S video $HOME/companion/scripts/start_usbvid.sh
else
  echo "Raspi Cam"
  screen -dm -S video $HOME/companion/scripts/start_raspivid.sh '--nopreview --mode 5 --bitrate 15000000 --intra 1 --awb auto --brightness 55 --saturation 10 --sharpness 50 --contrast 15  -fl --timeout 0' '! h264parse ! rtph264pay config-interval=10 pt=96 ! udpsink host=192.168.2.1 port=5600'
fi

read -n 1 -p "Connect TX with USB cable and put into bootloader mode (Hold Force-Recovery, Press Reset, release Force-Recovery).  Then press any key to begin downloading to $1."
sudo ./tegraflash.py --bl cboot.bin --applet nvtboot_recovery.bin --chip 0x21 --cmd "read APP $1"

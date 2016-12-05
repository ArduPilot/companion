cd ~/JetPack-2.3.1/64_TX1/Linux_for_Tegra_64_tx1/bootloader
read -n 1 -p "Connect TX with USB cable and put into bootloader mode (Hold Force-Recovery, Press Reset, release Force-Recovery).  Then press any key to begin UPLOAD of $1."
sudo ./tegraflash.py --bl t210ref/cboot.bin --applet nvtboot_recovery.bin --chip 0x21 --cmd "write APP $1"

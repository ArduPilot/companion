# RPi Ubuntu setup script for use as companion computer.

These instructions create an APSync image for the RPI4 based on the official Ubuntu 18.04 LTS images.

Download Ubuntu LTS image from https://ubuntu.com/download/raspberry-pi.  18.04 is the recommended image, for RPi3 and RPi4 use the 64bit image because even though there are only marginal difference between using 32bit vs 64bit, using the 64bit image provides common ground between our images.

Flash image onto SD card using Balena Etcher which can be downloaded from https://www.balena.io/etcher/.   This steps takes about 10min.

Note: these instructions require at least an 8GB card.  If building an image for general use an 8GB card so that the final image is kept as small as possible.

Note: ensure a flight controller is not connected to the RPI or it may interrupt the boot process.  The IntelRealSense T265 camera should also be disconnected.

Boot Raspberry Pi and login using the username/password ubuntu/ubuntu.
You will be asked to change the ubuntu password, we recommend changing it to "ardupilot"

Setup is easier if you can ssh into the vehicle from an existing desktop environment.  Use the ethernet connection for this.

Once you log in for the first time you can find out the ip-address of the RPi by typing this command on the console (look for the number next to inet):
```console
ubuntu@ubuntu:~$ ifconfig
eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 10.0.0.87  netmask 255.255.255.0  broadcast 10.0.0.255
        inet6 2601:af5:8200:caf0::b6c3  prefixlen 128  scopeid 0x0<global>
        inet6 fe80::def6:aeff:fe4d:980f  prefixlen 64  scopeid 0x20<link>
        inet6 2601:2ae:8200:ca60:ffa6:aeff:fe4d:980f  prefixlen 64  scopeid 0x0<global>
        ether dc:a6:32:4d:98:0f  txqueuelen 1000  (Ethernet)
        RX packets 384106  bytes 524816389 (524.8 MB)
        RX errors 56  dropped 56  overruns 0  frame 0
        TX packets 47745  bytes 5827337 (5.8 MB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)
        RX packets 234558  bytes 12730563 (12.7 MB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 234558  bytes 12730563 (12.7 MB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

```

with this ip-address you can now ssh into the RaspberryPi from the host machine:
```console
ssh ubuntu@ip-address
```

Once you log in, clone the companion repository and run the 1st setup script (this step takes about 20min)
```console
mkdir GitHub
pushd GitHub
git clone https://github.com/ardupilot/companion
pushd companion/RPI2/Ubuntu
sudo ./1_Setup_user_and_update.sh
```

Reboot the RPI and log back in using the apsync user, then run the following: (this step takes about 5min)
```console
pushd GitHub/companion/RPI2/Ubuntu
sudo ./2_Clone_Repo_Disable_console_sethost.sh
```

The RPi will automatically reboot. Log back in as apsync and run the following:
```console
pushd GitHub/companion/RPI2/Ubuntu
sudo ./3_Setup_Network_and_Packages.sh  (this steps takes about 20min)
sudo ./4_setup_apsync_components.sh     (this steps takes about 10min)
sudo ./5_setup_uhubctl.sh               (this steps takes about 1min)
sudo ./6_setup_realsense.sh             (this steps takes about 90min)
sudo ./7_setup_vision_to_mavros.sh      (this steps takes about 5min)
```

**(Warning, compiling the Intel Realsense Drivers on the RPi3 takes around 20hrs and requires a large swap file)**

This completes the installation of AP Sync you are now ready to prepare the image for cloning.


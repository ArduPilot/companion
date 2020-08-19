# UP Squared Ubuntu setup script for use as companion computer.

These instructions create an APSync image for the [UP Squared board](https://up-board.org/upsquared/specifications/) (UP2) based on the official Ubuntu 18.04 LTS images.

> Note: ensure the flight controller as well as any cameras (Realsense T265/D4xx specifically) are not connected to the UP2 until all installation steps are completed.

## 1. Back-up the existing system (Optional)

If you already have an existing system onboard the UP2, it would be beneficial to first back-up the system with [clonezilla](https://clonezilla.org/downloads.php).
See related instructions on how to:
- [Clone the disk](https://clonezilla.org/show-live-doc-content.php?topic=clonezilla-live/doc/01_Save_disk_image),
- [Restore the disk](https://clonezilla.org/show-live-doc-content.php?topic=clonezilla-live/doc/02_Restore_disk_image).

## 2. Install the OS and prerequisite

The general instructions can be found [here](https://wiki.up-community.org/Ubuntu_18.04). In short, the steps are:

- Download the [Ubuntu LTS image](https://releases.ubuntu.com/). 18.04 is the recommended image.

- Burn the image onto a USB flash drive using [Balena Etcher](https://www.balena.io/etcher/) or [Win32DiskImager](https://wiki.ubuntu.com/Win32DiskImager).

> Note: these instructions require at least an 8GB USB. If building an image for general, use an 8GB USB so that the final image is kept as small as possible.

- Provide internet connection to the UP2, either with ethernet cable / USB wifi dongle / wifi adapter card.

- Insert the USB in an empty port of the UP2. Boot up the UP2 and follow the normal Ubuntu installation.

> Note: In all of the follow-up sections, we assume the login username/password is `up2/ubuntu`. If you use a different username, change `STD_USER` accordingly in the `config.env` file.

- Enable [SSH on Ubuntu 18.04](https://linuxize.com/post/how-to-enable-ssh-on-ubuntu-18-04/) on the UP2 itself. Monitor, keyboard + mouse, internet connection are required. 
  - Open a terminal and run:
  ```console
  sudo apt update
  sudo apt install openssh-server
  sudo ufw allow ssh
  ```
  - Check SSH server status. You should see something like `Active: active (running)`:
  ```console
  sudo systemctl status ssh
  ```

- Find out the ip-address of the UP2 by typing this command on the console (look for the number next to `inet`, which is `192.168.1.12` in this case):
```console
up2@up2:~$ ifconfig
lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)
        RX packets 234558  bytes 12730563 (12.7 MB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 234558  bytes 12730563 (12.7 MB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

wlxe0b94d193b9e: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.1.12  netmask 255.255.255.0  broadcast 192.168.1.255
        inet6 fe80::e1c2:9ae5:f488:e3c1  prefixlen 64  scopeid 0x20<link>
        ether e0:b9:4d:19:3b:9e  txqueuelen 1000  (Ethernet)
        RX packets 6078  bytes 804670 (804.6 KB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 900  bytes 112286 (112.2 KB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```

With this ip address you can now ssh into the UP2 from the host machine:
```console
ssh up2@ip-address
```

## 2. Install the packages and other components

Once you log in, clone the companion repository and run the 1st setup script
```console
sudo apt install git
mkdir GitHub
pushd GitHub
git clone https://github.com/ardupilot/companion
pushd companion/Up_Squared/Ubuntu
sudo ./1_Setup_user_and_update.sh
```

Reboot the UP2 and log back in using the username/password `apsync/apsync`, then run the following:
```console
ssh apsync@ip-address # SSH into the UP2 from the host computer
pushd GitHub/companion/Up_Squared/Ubuntu
sudo ./2_Clone_Repo_Disable_console_sethost.sh
```

The UP2 will automatically reboot. Log back in as apsync and run the following:
```console
pushd GitHub/companion/Up_Squared/Ubuntu
sudo ./3_Setup_Network_and_Packages.sh
sudo ./4_setup_apsync_components.sh
sudo ./5_setup_realsense.sh
```

This completes the installation of AP Sync you are now ready to prepare the image for cloning.


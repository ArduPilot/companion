# RPi Ubuntu setup script for use as companion computer.

These instructions are for the official Ubuntu LTS images. 

Download Ubuntu LTS image at this time 18.04 is the recomended image, for RPi3 and RPi4 use the 64bit Image
Even though the RPi3 has only a marginal difference between using 32bit vs 64bit, using the 64bit image provides 
Common ground between our images.

https://ubuntu.com/download/raspberry-pi 

Flash image onto SD card using Balena Etcher which can be downloaded from 
https://www.balena.io/etcher/

NOTE: make sure you use at least a  16GB card, preferabbly use a 128GB card to allow enough space to install all software.

Boot Raspberry Pi and follow the instructions for changing the password for the default user (User: ubuntu, Password: ubuntu)

Setup is easier if you can ssh into the vehicle from an existing
desktop environment.  Use the ethernet connection for this.

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

with that ip-address you can now ssh into the RaspberryPi 
From the host machine:
```console
ssh ubuntu@ip-address
```

Once you log in, clone this repository
```console
cd
mkdir GitHub
pushd GitHub
git clone https://github.com/ardupilot/companion
pushd companion/RPI2/Ubuntu
```

Update the package manager and upgrade everything to the latest versions
```console
sudo apt update
sudo apt upgrade -y
```

Install some basic packages and create a user named apsync
```console
sudo apt install nano rsync
sudo useradd -s /bin/bash -m -U -G sudo,netdev,users,dialout,video apsync
echo "apsync:apsync" | chpasswd
```

Move all files to the apsync user folder
```console
sudo rsync -aPH --delete /home/ubuntu/ /home/apsync
sudo chown -R apsync.apsync /home/apsync
sudo rm -rf *
```

You have finished the first part, now you will need to logout and log back in using the apsync user
If desired at this point you can copy your ssh keys to the RPi so that you dont need to enter the password everytime.

To copy the SSH keys you need to have generated an RSA id on your host machine. Once you have an rsa_id you can copy the keys to the RPi
on the host machine:
```console
ssh-copy-id apsync@ip-address-of-rpi
```

ssh into the RPi with the new user apsync
```console
ssh apsync@ip-address-of-rpi
```

Now go back to the companion repo folder and continue installing required software
```console
pushd /home/apsync/GitHub/companion/RPI2/Ubuntu
sudo ./set-hostname  #set the hostname to apsync
sudo apt autoremove -y # avoid repeated no-longer-required annoyance
sudo ./remove-unattended-upgrades
sudo ./ensure_rc_local.sh
sudo ./disable_console.sh
sudo reboot  #reboot for the changes to take effect
```

ssh back into the RPi and continue with the following:
```console
pushd /home/apsync/GitHub/companion/RPI2/Ubuntu
sudo -E ./2_install_packages.sh # 20m
sudo -E ./install_niceties || echo "Failed" # 20s
sudo -E ./3_wifi_access_point.sh # 20s
sudo reboot #reboot for the changes to take effect
```

Check to see if you can see a WiFi Network named `ardupilot`

ssh back into the RPi and continue with these command:
```console
pushd /home/apsync/GitHub/companion/RPI2/Ubuntu
sudo ./apstreamline.sh # 1m  This is optional
sudo ./setup_master_mavlink-router.sh
sudo ./7_dflogger.sh # ~210s
sudo apt install -y libxml2-dev libxslt1.1 libxslt1-dev  python-lxml
sudo -H pip install future # 4m
sudo ./install_pymavlink # new version required for apweb #1m

pushd /home/apsync/GitHub/pymavlink
git config --global user.email "devel@ardupilot.org"
git config --global user.name "ArduPilotCompanion"

git stash
git revert e1532c3fc306d83d03adf82fb559f1bb50860c03
export MDEF=~/GitHub/mavlink/message_definitions
python setup.py build install --user --force
popd

sudo ./install_apweb # 2m
```

At this point you have finished installing the necesary packages for the basic APSync image

# Automated Scripts
For convenience we have created 4 scripts that automate all the steps above. In order to use those you can do the following after loging into the cosole for the first time:

```console
mkdir GitHub
pushd GitHub
git clone https://github.com/ardupilot/companion
pushd companion/RPI2/Ubuntu/automated
sudo ./1_Setup_user_and_update.sh
```
After the first script logout and log back in using the apsync user, then run the following:
```console
pushd companion/RPI2/Ubuntu/automated
sudo ./2_Clone_Repo_Disable_console_sethost.sh
```
After this the RPi will automatically reboot, log back in and continue with
```console
pushd companion/RPI2/Ubuntu/automated
sudo ./3_Setup_Network_and_Packages.sh
sudo ./4_setup_apsync_components.sh
```
After completing step 4, the RPI will reboot to enable the swap file. By default this creates a 6GB swap file so make  sure you have enough space on the SD Card, if you dont have enough space you can modify the script to create a smaller file. Once it reboots log back in and run
```console
sudo ./5_setup_realsense.sh
```
**(Warning, compiling the Intel Realsense Drivers on the RPi3 takes around 20hrs and requires a large swap file)**

This completes the installation of AP Sync you are now ready to prepare the image for cloning.


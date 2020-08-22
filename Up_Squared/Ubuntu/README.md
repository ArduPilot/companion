# UP Squared Ubuntu setup script for use as companion computer.

These instructions create an APSync image for the [UP Squared board](https://up-board.org/upsquared/specifications/) (UP2) based on the official Ubuntu 18.04 LTS images.

> Note: ensure the flight controller as well as any cameras (Realsense T265/D4xx specifically) are not connected to the UP2 until all installation steps are completed.

## 1. Back-up the existing system (Optional)

If you already have an existing system onboard the UP2, it would be beneficial to first back-up the system with [clonezilla](https://clonezilla.org/downloads.php).
See related instructions on how to:
- [Clone the disk](https://clonezilla.org/show-live-doc-content.php?topic=clonezilla-live/doc/01_Save_disk_image),
- [Restore the disk](https://clonezilla.org/show-live-doc-content.php?topic=clonezilla-live/doc/02_Restore_disk_image).

## 2. System description

The **hardware** components include:
- [UP Squared board](https://up-board.org/upsquared/specifications/) (UP2) with Wifi/Network connection,
- Serial connection to the FCU (not covered here, see [wiki](https://ardupilot.org/copter/docs/common-telemetry-port-setup.html)),
- Optional: [Realsense T265 tracking camera](https://www.intelrealsense.com/tracking-camera-t265/) and/or [Realsense Depth camera](https://www.intelrealsense.com/stereo-depth/) (tested with D435).

The **software** components on the companion computer include:
- Automatically creates a Wifi Access Point on startup,
- Automatically runs a light weight webserver which allows the user to connect to the drone using a known URL and perform various actions,
- Automatically launch the `t265_to_mavlink.py` and `d4xx_to_mavlink.py` scripts,
- Real-time video streaming of the RGB image from the Realsense camera on the drone to the ground station.

> The following configuration and installation steps should be modified/removed according to your actual system and requirements.

## 3. Install the OS and prerequisite

The general instructions can be found [here](https://wiki.up-community.org/Ubuntu_18.04). In short, the steps are:

- Download the [Ubuntu LTS image](https://releases.ubuntu.com/). 18.04 is the recommended image.

- Burn the image onto a USB flash drive using [Balena Etcher](https://www.balena.io/etcher/) or [Win32DiskImager](https://wiki.ubuntu.com/Win32DiskImager).

> Note: these instructions require at least an 8GB USB. If building an image for general, use an 8GB USB so that the final image is kept as small as possible.

- Provide network connection to the UP2, either with ethernet cable / USB wifi dongle / wifi adapter card.

- Insert the USB in an empty port of the UP2. Boot up the UP2 and follow the normal Ubuntu installation.
 - In all of the follow-up sections, we assume the login username/password is `up2/ubuntu`. If you use a different username, change `STD_USER` accordingly in the `config.env` file.

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

## 4. Install the packages and other components

- Once you log in, clone the companion repository:
```console
sudo apt install git
cd ~
mkdir GitHub
pushd GitHub
git clone https://github.com/thien94/companion.git # TO-DO: Change back to https://github.com/ardupilot/companion before pushing the PR
```
- Change the configurations according to your hardware system:
```
# System configuration
# - Change STD_USER to the current username
# - Change SETUP_DEPTH_CAMERA=0 if not using depth camera
# - NORMAL_USER should NOT be changed (apsync)
pushd GitHub/companion/Up_Squared/Ubuntu
nano config.env

# Serial connection
# - Change [UartEndpoint to_fc] to the actual serial connection
nano mavlink-rounter.conf
```

- Run the 1st setup script: 
```
sudo ./1_Setup_user_and_update.sh
```

- Reboot the UP2, log back in using the username/password `apsync/apsync`:
```console
sudo reboot now
ssh apsync@ip-address # SSH into the UP2 from the host computer
pushd GitHub/companion/Up_Squared/Ubuntu
sudo ./2_Clone_Repo_Disable_console_sethost.sh
```

- The UP2 will automatically reboot. Log back in as `apsync` and run the rest of the scripts to complete the installation.
```console
pushd GitHub/companion/Up_Squared/Ubuntu
sudo ./3_Setup_Network_and_Packages.sh  # Common packages and wifi hotspot
sudo ./4_setup_apsync_components.sh     # Web-based user interface
sudo ./5_setup_mavproxy.sh              # MavProxy running on the companion computer
sudo ./6_setup_uhubctl.sh               # Auto cycle the USB hub, if there is one
sudo ./7_setup_realsense.sh             # librealsense, T265 (default, always used) and D4xx (optional) cameras
```

- Setup the Wifi access point
```
# First change IFNAME to your system's network interface (example: wlxe0b94d193b9e is my Wifi USB dongle)
nano install_wifi_access_point.h
# Then run the script to setup wifi hotspot
sudo ./install_wifi_access_point.sh     # Setup a wifi hotspot with ssid/password ardupilot/ardupilot
```

- For each script, I suggest skimming through to figure out if it applies to your case and skip any deemed unnecessary.

This completes the installation of AP Sync you are now ready to prepare the image for cloning.

## 5. Verify the system is working

### 5.1 Main components
Following the description in the [APSync main wiki](https://ardupilot.org/dev/docs/apsync-intro.html) to test the main components. The data flows are described [here](https://ardupilot.org/dev/docs/apsync-intro.html#how-flight-controller-data-is-routed-to-various-programs).

- If Wifi hotspot is enabled, connect to the network `ardupilot` with password `ardupilot`. If you have trouble connecting, consider disabling the password requirement. Once connected to the WiFi network it would be possible to:
  - Connect to AP Web server via the URL `http://10.0.1.128`. Details of available actions on the AP Web server can be found [here](https://ardupilot.org/dev/docs/apsync-intro.html#wifi-access-point-dataflash-logging).
  - ssh to `10.0.1.128` username: `apsync`, password: `apsync`.

- In Mission Planner or other ground station:
  - Setting the connection to using “UDP”, port 14550.
  - Once connected, open `Ctrl-F` > `MAVLink inspector` and verify the data from the T265 (`VISION_POSITION_ESTIMATE`, `VISION_SPEED_ESTIMATE`) and D4xx (`OBSTACLE_DISTANCE`) cameras are being received:
  ![test_mavlink](https://i.imgur.com/NYgYWTG.png)

### 5.2 Video feed:
First, setup gstreamer feed in Mission Planner:
- Installation of [`gstreamer 1.0`](https://gstreamer.freedesktop.org/download/) is required, but should be done automatically by MP.
- On MP: right-click the HUD > `Video` > `Set GStreamer Source`.
  - Test MP's gstreamer by passing the test pipeline in the Gstreamer url window:
    ```
    videotestsrc ! video/x-raw, width=1280, height=720,framerate=25/1 ! clockoverlay ! videoconvert ! video/x-raw,format=BGRA ! appsink name=outsink
    ```
  - You should see something similar to this:
    ![test_hud](https://i.imgur.com/QaGvWfk.png)

The script `d4xx_to_mavlink.py` has an option `RTSP_STREAMING_ENABLE`. If enabled (`True`), a video stream of the RGB image from the depth camera will be available at `rtsp://10.0.1.128:8554/d4xx`:
- Pass the following pipeline into the Gstreamer url window. Change the ip address if need to:
``` 
rtspsrc location=rtsp://10.0.1.128:8554/d4xx caps=“application/x-rtp, media=(string)video, clock-rate=(int)90000, encoding-name=(string)H264” latency=100 ! queue ! rtph264depay ! avdec_h264 ! videoconvert ! video/x-raw,format=BGRA ! appsink name=outsink
```
- You should see the RGB image overlay on the HUD.
  ![img](https://i.imgur.com/NtVY49b.png)
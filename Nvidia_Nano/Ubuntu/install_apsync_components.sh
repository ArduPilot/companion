#!/bin/bash

######################################################################################
# Command Line Option Parsing                                                        #
######################################################################################
function usage
{
    echo "Usage: sudo ./install_apsync_components.sh [[-c companion] | [-h]]"
    echo "Install Ardupilot apsync image components"
    echo "These scripts install the Ardupilot Apsync components on Nvidia Jetson computers"
    echo "the default installation is for the Jetson Nano but can also be used for TX2 and"
    echo "Xavier, these scripts have not been tested on the Xavier NX or TX2 NX but should"
    echo "work too."
    echo "-c | --companion <companiontype>  Companion Computer Type"
    echo "                                  Available types:"
    echo "                                      TX2"
    echo "                                      Xavier"
    echo "                                      Nano"
    echo "-ap | --wifiap <ssid> Enable WiFi access point"
    echo "                      none = leave WiFi config unchanged"
    echo "                      ssid-name = type the desired ssid name"
    echo "-h | --help  This message"
}

function shouldSetCompanion
{
    tput setaf 1
    echo "Incorrect Companion Version!"
    tput sgr0
    echo "Please include one of the following:"
    echo "   TX2"
    echo "   Xavier"
    echo "   Nano"
    echo "   XavierNX"
    echo ""
    echo "Aborting installation"
}

# Iterate through command line inputs
companion=()
wifi=()
while [ "$1" != "" ]; do
    case $1 in
        -c | --companion )      shift
                                companion+=("$1")
                                ;;
        -ap | --wifiap )        shift
                                wifi+=("$1")
                                ;;
        -h | --help )           usage
                                exit
                                ;;
        * )                     usage
                                exit 1
    esac
    shift
done

# Check to see if a companion computer was specified
# If not, set the default to Nano
if [ ${#companion[@]}  -eq 0 ] ; then
 companion+="Nano"
fi
echo "Companion Version: "${companion[@]}
hasCompanion=false
for companion in "${companion[@]}"; do
  if [[ $companion == "TX2" ]]; then
    hasCompanion=true
    break
  elif [[ $companion == "Xavier" ]]; then
    hasCompanion=true
    break
  elif [[ $companion == "Nano" ]]; then
    hasCompanion=true
    break
  elif [[ $companion == "XavierNX" ]]; then
    hasCompanion=true
  fi
done

if [ $hasCompanion == false ] ; then
   shouldSetCompanion
   exit 1
fi

# Check to see if an ssid was specified
# If not, set the default to none
if [ ${#wifi[@]}  -eq 0 ] ; then
 wifi+="none"
fi
echo "WiFi SSID: "${wifi[@]}
hasWiFi=false
for wifi in "${wifi[@]}"; do
  if [[ $wifi != "none" ]]; then
    hasWiFi=true
    break
  fi
done
######################################################################################
# Command Line Option Parsing End                                                    #
######################################################################################

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   usage
   exit 1
fi

set -e
set -x

# Set the nvpmodel to MAXN
if [[ $companion != "XavierNX" ]]; then
   nvpmodel -m 0
else
   nvpmodel -m 2
fi

. ./config.env

# Add fancy prompt
cp ./bashrc-final /home/$NORMAL_USER/.bashrc

# Update package manager and upgrade packages
apt update -y
apt upgrade -y

apt install rsync -y
apt install nano -y
apt -y autoremove # avoid repeated no-longer-required annoyance
apt -y remove unattended-upgrades

# Ensure rc.local is present
if [ ! -f /etc/rc.local ]; then
    cat >/etc/rc.local <<EOF
#!/bin/bash

exit 0
EOF
    chmod +x /etc/rc.local
fi

# Disable Console on Nvidia Jetsons
systemctl disable nvgetty.service

# Install Packages
apt -y purge whoopsie
apt -y purge modemmanager
apt -y install python-dev python-numpy python3-numpy python-pip python-opencv
apt -y install libxml2-dev libxslt1.1 libxslt1-dev libz-dev
apt -y install python-lxml python-future
apt -y install screen
apt -y install autoconf libtool
apt -y install gstreamer1.0 gstreamer1.0-libav || true
apt autoremove -y
apt clean

# Install niceties
apt install -y strace ltrace tcpdump lsof mlocate v4l-utils usbutils tree wireless-tools can-utils
updatedb

if [ $hasWiFi != false ] ; then
############ WiFi Stuff ##############
if [ $companion == "TX2" ]; then
    # the hardware must be told to go into AP mode:
    echo "options bcmdhd op_mode=2" | tee -a /etc/modprobe.d/bcmdhd.conf
    echo 2 >/sys/module/bcmdhd/parameters/op_mode
fi

apt -y install dnsmasq haveged
systemctl disable dnsmasq

# DNS setup for Access Point
# add IP address range to /etc/dnsmasq.conf
dd of=/etc/NetworkManager/dnsmasq.d/$wifi.conf <<EOF
interface=wlan0
dhcp-range=192.168.13.129,192.168.13.138,12h
EOF

sudo systemctl disable dnsmasq

IFNAME=wlan0
nmcli connection delete $wifi || true
nmcli connection add type wifi ifname $IFNAME con-name $wifi ssid $wifi
nmcli connection modify $wifi connection.autoconnect no
nmcli connection modify $wifi connection.autoconnect-priority 0
nmcli connection modify $wifi 802-11-wireless.mode ap
nmcli connection modify $wifi 802-11-wireless.band a
nmcli connection modify $wifi ipv4.method shared
nmcli connection modify $wifi ipv6.method ignore
nmcli connection modify $wifi wifi-sec.key-mgmt wpa-psk
nmcli connection modify $wifi ipv4.addresses 192.168.13.128/24
nmcli connection modify $wifi wifi-sec.psk "ardupilot"
nmcli connection modify $wifi 802-11-wireless-security.group ccmp
nmcli connection modify $wifi 802-11-wireless-security.pairwise ccmp
########## End WiFi Stuff ############   
fi

time ./install_mavlink-router # ~2m Remember to change the mavlink_router.conf file to the right serial port
time ./setup_mavproxy.sh

export START_UDP_STREAM_SCRIPT="$PWD/start_udp_stream"

time ./install_cherrypy # 11s  This is optional

time apt-get install -y libxml2-dev libxslt1.1 libxslt1-dev
time ./install_pymavlink # new version required for apweb #1m

# Install jetson-stats utility and Adafruit I2C python display driver
pip install jetson-stats
pip install Adafruit_SSD1306

if [ $companion == "TX2" ]; then
    cp ./mavlink-router-TX2.conf /home/$NORMAL_USER/start_mavlink-router/mavlink-router.conf
elif [ $companion == "Xavier" ]; then
    cp ./mavlink-router-Xavier.conf /home/$NORMAL_USER/start_mavlink-router/mavlink-router.conf
elif  [ $companion == "Nano" ]; then
    cp ./mavlink-router-Nano.conf /home/$NORMAL_USER/start_mavlink-router/mavlink-router.conf
elif [ $companion == "XavierNX" ]; then
    cp ./mavlink-router-Xavier.conf /home/$NORMAL_USER/start_mavlink-router/mavlink-router.conf
fi

# Build & Install librealsense from source 2.44.0 as of Apr 1, 2021
time ./buildLibrealsense.sh

sudo systemctl enable mavlink-router.service 

echo >&2 "Reboot to Finish changes"
#reboot # ensure hostname correct / console disabling OK / autologin working

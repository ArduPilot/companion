#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

. config.env

tput setaf 3
echo "Setting up access point using wifi-ap snap"
tput sgr0

# time snap install network-manager
time snap install wifi-ap
sleep 5
wifi-ap.config set wifi.ssid=ArduPilot
wifi-ap.config set wifi.security-passphrase=ardupilot
wifi-ap.config set wifi.address=10.0.1.128
wifi-ap.config set wifi.operation-mode=a    # 5Ghz by default
wifi-ap.config set wifi.channel=48          # set to a clear channel in your area
wifi-ap.config set dhcp.range-start=10.0.1.129
wifi-ap.config set dhcp.range-stop=10.0.1.138
wifi-ap.config set disabled=false

# copy wifi scripts into place
pushd /home/$NORMAL_USER/GitHub/companion/Common/Ubuntu/wifi_ap
rm -rf /home/$NORMAL_USER/start_wifi
mkdir /home/$NORMAL_USER/start_wifi
cp start_wifi.sh /home/$NORMAL_USER/start_wifi
cp start_wifi_2.4Ghz.sh /home/$NORMAL_USER/start_wifi
cp start_wifi_5Ghz.sh /home/$NORMAL_USER/start_wifi
cp stop_wifi.sh /home/$NORMAL_USER/start_wifi
popd

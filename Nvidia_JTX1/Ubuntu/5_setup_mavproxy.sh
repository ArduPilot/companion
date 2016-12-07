#!/bin/bash

# this script sets up mavproxy

# auto start mavproxy
mkdir ~/start_mavproxy
cp start_mavproxy.sh ~/start_mavproxy
cp autostart_mavproxy.sh ~/start_mavproxy
   
# add line below to bottom of /etc/rc.local to call $HOME/start_mavproxy/autostart_mavproxy.sh
echo "sudo -H -u ubuntu /bin/bash -c '/home/ubuntu/start_mavproxy/autostart_mavproxy.sh'" | sudo tee -a /etc/rc.local


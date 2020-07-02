#!/bin/bash

# Stop wifi accesspoint
wifi-ap.config set disabled=true

# Set to 5Ghz
wifi-ap.config set wifi.operation-mode=a
wifi-ap.config set wifi.channel=48

# Start wifi accesspoint
wifi-ap.config set disabled=false

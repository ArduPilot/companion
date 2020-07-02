#!/bin/bash

# Stop wifi accesspoint
wifi-ap.config set disabled=true

# Set to 2.4Ghz
wifi-ap.config set wifi.operation-mode=bg
wifi-ap.config set wifi.channel=6


# Start wifi accesspoint
wifi-ap.config set disabled=false

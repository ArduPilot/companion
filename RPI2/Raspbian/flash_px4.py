#!/usr/bin/python -u

import os
import urllib
import time
import sys
from optparse import OptionParser

parser = OptionParser()
parser.add_option("--url",dest="url",help="Firmware download URL (optional)")
parser.add_option("--stdin",action="store_true",dest="fromStdin",default=False,help="Expect input from stdin")
parser.add_option("--frame",dest="frame",default="vectored",help="ArduSub frame type for automatical download (optional)")
(options,args) = parser.parse_args()

# Get firmware from stdin if possible
print "Trying to read file from stdin..."
if options.fromStdin:
                fileIn = sys.stdin.read()
                if fileIn:
                                file = open("/tmp/ArduSub-v2.px4","w")
                                file.write(fileIn)
                                file.close()
                                print "Got firmware file from stdin!"

# Stop screen session with mavproxy
print "Stopping mavproxy"
os.system("sudo screen -X -S mavproxy quit")

# Download most recent firmware
firmwareURL = "http://firmware.ardusub.com/Sub/latest/PX4-"+options.frame+"/ArduSub-v2.px4"
if options.url:
                firmwareURL = options.url
                print "Downloading latest ArduSub firmware from URL..."
else:
                print "Downloading latest ArduSub "+options.frame+" firmware..."
if not options.fromStdin:
                firmwarefile = urllib.URLopener()
                firmwarefile.retrieve(firmwareURL, "/tmp/ArduSub-v2.px4")

# Download flashing script
print "Downloading px4 flashing tool..."
firmwarefile = urllib.URLopener()
firmwarefile.retrieve("https://raw.githubusercontent.com/PX4/Firmware/master/Tools/px_uploader.py", "/tmp/px_uploader.py")

# Flash Pixhawk
print "Flashing Pixhawk..."
os.system("python -u /tmp/px_uploader.py --port /dev/ttyACM0 /tmp/ArduSub-v2.px4")

# Wait a few seconds
print "Waiting to restart mavproxy..."
time.sleep(10)

# Start screen session with mavproxy
print "Restarting mavproxy"
os.system("sudo screen -dm -S mavproxy /home/pi/companion/RPI2/Raspbian/start_mavproxy_telem_splitter.sh")

print "Complete!"
#!/usr/bin/python -u

import os
import urllib
import time
from optparse import OptionParser

parser = OptionParser()
parser.add_option("-url","--url",dest="url",help="Firmware URL")
parser.add_option("-px4","--px4",dest="px4file",help="Firmware File Stream")
(options,args) = parser.parse_args()

# Get firmware from stdin if possible
print "Trying to read file from stdin..."
fileFromStdIn = False
fileIn = sys.stdin.read()
if result:
		file = open("tmp/ArduSub-v2.px4","w")
		file.write(fileIn)
		file.close()
		fileFromStdIn = True
		print "Got firmware file from stdin!"

# Stop screen session with mavproxy
print "Stopping mavproxy"
os.system("sudo screen -X -S mavproxy quit")

# Download most recent firmware
if not fileFromStdIn:
		print "Downloading latest ArduSub firmware..."
		firmwarefile = urllib.URLopener()
		firmwarefile.retrieve("http://firmware.ardusub.com/Sub/latest/PX4-vectored/ArduSub-v2.px4", "/tmp/ArduSub-v2.px4")

# Download flashing script
print "Downloading px4 flashing tool..."
firmwarefile = urllib.URLopener()
firmwarefile.retrieve("https://raw.githubusercontent.com/PX4/Firmware/master/Tools/px_uploader.py", "/tmp/px_uploader.py")

# Flash Pixhawk
print "Flashing Pixhawk..."
os.system("python -u /tmp/px_uploader.py --port /dev/ttyACM0 /tmp/ArduSub-v2.px4")

# Wait a few seconds
print "Waiting to restart mavproxy..."
time.sleep(5)

# Start screen session with mavproxy
print "Restarting mavproxy"
os.system("sudo screen -dm -S mavproxy /home/pi/companion/RPI2/Raspbian/start_mavproxy_telem_splitter.sh")

print "Complete!"
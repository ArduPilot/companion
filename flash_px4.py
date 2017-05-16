#!/usr/bin/python -u

import os
import urllib
import time
import sys
import signal
from optparse import OptionParser

def timeout(signum, frame):
    print 'Timed out waiting for firmware on stdin!'
    exit(1)

parser = OptionParser()
parser.add_option("--url",dest="url",help="Firmware download URL (optional)")
parser.add_option("--stdin",action="store_true",dest="fromStdin",default=False,help="Expect input from stdin")
parser.add_option("--latest",action="store_true",dest="latest",default=False,help="Upload latest development firmware")
(options,args) = parser.parse_args()

if options.fromStdin:
                # Get firmware from stdin if possible
                print "Trying to read file from stdin..."
                
                signal.signal(signal.SIGALRM, timeout)
                signal.alarm(5)
                fileIn = sys.stdin.read()
                signal.alarm(0)

                if fileIn:
                                file = open("/tmp/ArduSub-v2.px4","w")
                                file.write(fileIn)
                                file.close()
                                print "Got firmware file from stdin!"      
                else:
                                error("Read error on stdin!")
else:
                # Download most recent firmware
                if options.url:
                                firmwareURL = options.url
                                print "Downloading ArduSub firmware from %s" % firmwareURL
                elif options.latest:
                                firmwareURL = "http://firmware.us.ardupilot.org/Sub/latest/PX4/ArduSub-v2.px4"
                                print "Downloading latest ArduSub firmware from %s" % firmwareURL
                else:
                                firmwareURL = "http://firmware.us.ardupilot.org/Sub/stable/PX4/ArduSub-v2.px4"
                                print "Downloading stable ArduSub firmware from %s" % firmwareURL
                
                try:
                                firmwarefile = urllib.URLopener()
                                firmwarefile.retrieve(firmwareURL, "/tmp/ArduSub-v2.px4")
                
                except Exception as e:
                                print(e)
                                print "Error downloading firmware! Do you have an internet connection? Try 'ping ardusub.com'"
                                exit(1)
                                
                
# Stop screen session with mavproxy
print "Stopping mavproxy"
os.system("screen -X -S mavproxy quit")

# Flash Pixhawk
print "Flashing Pixhawk..."
if(os.system("python -u /home/pi/companion/Tools/px_uploader.py --port /dev/ttyACM0 /tmp/ArduSub-v2.px4") != 0):
                print "Error flashing pixhawk! Do you have most recent version of companion? Try 'git pull' or scp."
                exit(1)
                

# Wait a few seconds
print "Waiting to restart mavproxy..."
time.sleep(10)

# Start screen session with mavproxy
print "Restarting mavproxy"
os.system("screen -dm -S mavproxy /home/pi/companion/RPI2/Raspbian/start_mavproxy_telem_splitter.sh")

print "Complete!"

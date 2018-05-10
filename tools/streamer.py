#!/usr/bin/python

import os
from time import sleep 

while True:
  while (os.system("ls /dev/video* 2>/dev/null") != 0) or (os.path.isfile("/home/pi/companion/start_video.sh")):
    sleep(5)

  os.system("/home/pi/companion/scripts/start_video.sh $(cat /home/pi/vidformat.param)")
  sleep(2)



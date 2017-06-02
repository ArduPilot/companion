#!/usr/bin/python

import time
import socket

file = open('/home/pi/companion/tools/raw-nmea-log', 'r')
content = file.readlines()
file.close()

ip="0.0.0.0"
portnum = 27000
sockit = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sockit.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sockit.setblocking(False)

while True:
    for line in content:
        time.sleep(0.1)
        try:
            sockit.sendto(line, (ip, portnum))
        except Exception as e:
            print e

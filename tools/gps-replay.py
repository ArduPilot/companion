#!/usr/bin/python

import time
import socket
import argparse

parser = argparse.ArgumentParser(description="GPS Replay Tool for Testing and Debugging")
parser.add_argument('--frequency', action="store", type=float, default=10, help="gps message update frequency")
parser.add_argument('--file', action="store", type=str, default='/home/pi/companion/tools/raw-nmea-log', help="gps log file from which to read")
parser.add_argument('--port', action="store", type=int, default=27000, help="udp destination port")
parser.add_argument('--ip', action="store", type=str, default="0.0.0.0", help="udp destination ip address")
args = parser.parse_args()

file = open(args.file, 'r')
content = file.readlines()
file.close()

delay = 1.0/args.frequency

sockit = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sockit.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sockit.setblocking(False)

while True:
    for line in content:
        time.sleep(delay)
        try:
            sockit.sendto(line, (args.ip, args.port))
        except Exception as e:
            print e

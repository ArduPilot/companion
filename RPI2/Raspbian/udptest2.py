#!/usr/bin/python

import serial
import socket
import time
import argparse
import json


sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind(('192.168.2.2', 18990))

while True:
	try:
		data, address = sock.recvfrom(1024)
		print("%s sent %s") % (address, data)
		data = json.loads(data)
		print data
	except Exception as e:
		print(e)
		pass
	time.sleep(0.1)
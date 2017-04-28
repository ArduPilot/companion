#!/usr/bin/python

import serial
import socket
import time
import argparse

parser = argparse.ArgumentParser(description="Connect serial port to UDP port")
parser.add_argument('-l', dest='left', required=True, help='Left hand side of route (serial)')
parser.add_argument('-b', dest='baudrate', required=True, help='Baud rate for left hand side of route')
parser.add_argument('--ip', dest='ip', required=True, help='IP address')
parser.add_argument('--port', dest='port', type=int, required=True, help='UDP port')
parser.add_argument('-d', dest='direction', required=True, help='Direction to route')

args = parser.parse_args()

port = serial.Serial(args.left, args.baudrate, timeout=0)

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.setblocking(False)
sock.bind((args.ip, args.port))

connected = False
master = None

while not connected:
	try:
		udpReceived, addr = sock.recvfrom(1024)
		if master is None:
			master = addr
		
		if len(udpReceived) > 0:
			print "Sending "+str(len(udpReceived))+" bytes from UDP to serial"
			port.write(udpReceived)
			for x in udpReceived:
				print hex(ord(x)),
			print ""
				
	except:
		pass
	
	if master is None:
		continue
	
	print 'reading'
	serialReceived = port.read(1024)
	if len(serialReceived) > 0:
		print "Sending "+str(len(serialReceived))+" bytes from serial to UDP"
		sock.sendto(serialReceived,master)
		for x in serialReceived:
			print hex(ord(x)),
		print ""
	
	time.sleep(0.01)

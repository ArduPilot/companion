#!/usr/bin/python

import serial
import socket
import time
import argparse

UDP_IP = "192.168.2.2"
UDP_PORT = 8989

parser = argparse.ArgumentParser(description="Connect serial port to UDP port")
parser.add_argument('-p',dest='serialPort',required=True,help='serial port to connect to')
args = parser.parse_args()

port = serial.Serial(args.serialPort,115200,timeout=0)

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.setblocking(False)
sock.bind((UDP_IP,UDP_PORT))

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

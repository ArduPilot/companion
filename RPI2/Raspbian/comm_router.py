#!/usr/bin/python

import serial
import socket
import time
import argparse
import json
import endpoint

debug = False

endpoint.load('/home/pi/companion/RPI2/Raspbian/routing.conf')
print endpoint.endpoints

for _endpoint in endpoint.endpoints:
	print _endpoint.id
	print _endpoint.connections
	
# endpoint.remove('apm.udp2')


sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.setblocking(False)
sock.bind(('0.0.0.0', 18990))

while True:
	time.sleep(0.01)
	
	# read all endpoints and write all routes
	for _endpoint in endpoint.endpoints:
		_endpoint.read()
		
	try:
		data, address = sock.recvfrom(1024)
		print("\n%s sent %s\n") % (address, data)
		
		
		msg = json.loads(data)
		
		try:
			request = msg['request']
			print("Got request %s") % request
		except:
			print "No request!"
			continue
		
		if request == 'remove endpoint':
			endpoint.remove(msg['id'])
			sock.sendto(endpoint.to_json(), address)
			
		elif request == 'connect endpoints':
			print('got connect request: %s') % data
			endpoint.connect(msg['source'], msg['target'])
			
		elif request == 'disconnect endpoints':
			endpoint.disconnect(msg['source'], msg['target'])
		
		elif request == 'add endpoint':
			endpoint.add(endpoint.from_json(msg))
			
		elif request == 'save all':
			endpoint.save(msg['filename'])
			
		elif request == 'load all':
			if msg['soft'] == False:
				print("Hard load")
				# garbage collect
				endpoint.endpoints = []
			endpoint.load(msg['filename'])
			
		# send updated list of endpoints
		sock.sendto(endpoint.to_json(), address)
		endpoint.save('/home/pi/companion/RPI2/Raspbian/routing.conf')
		
	except socket.error as e:
		continue
# 	except Exception as e:
# 		print("Error: %s") % e
# 		continue
	

		
	
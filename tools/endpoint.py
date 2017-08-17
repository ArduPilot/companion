#!/usr/bin/python

import serial
import socket
import time
import json

debug = False

endpoints = []

class Endpoint(object):
	
	def __init__(self, id, type, connectionIds):
		
		# unique
		self.id = id
		self.type = type
		self.connectionIds = connectionIds
		# target destinations for inbound traffic
		self.connections = []
		
		
	def connect(self, target):
		if target.id == self.id:
			print("loopback not allowed: %s") % self.id
			return
		if target.id in self.connectionIds:
			print("%s is already connected to %s") % (self.id, target.id)
			return
		self.connections.append(target)
		self.connectionIds.append(target.id)
		
		
	def disconnect(self, target_id):
		try:
			self.connectionIds.remove(target_id)
		except:
			print("Error disconnecting %s") % target.id
			return
		
		for endpoint in self.connections:
			if endpoint.id == target_id:
				self.connections.remove(endpoint)


class SerialEndpoint(Endpoint):
	
	def __init__(self, port, baudrate, id, connections):
		Endpoint.__init__(self, id, 'serial', connections)
		self.port = port
		self.baudrate = baudrate
		self.active = False
		
		# not a socket! just a port
		self.socket = serial.Serial()
		self.socket.port = port
		self.socket.baudrate = 115200
		self.socket.timeout = 0
		
		
	def read(self):
		try:
			if not self.socket.is_open:
				self.socket.open()
				print('%s on %s:%s') % (self.id, self.port, self.baudrate)
			data = self.socket.read(1024)
			self.active = True
		except Exception as e:
			self.socket.close()
			self.active = False
			#print("Error reading serial endpoint: %s") % e
			return
		
		if len(data) > 0:
			if debug:
				#this works fine on rpi, but not desktop (ubuntu 16) for some reason
				#print('%s read %s') % (self.id, data[:25].decode('utf-8'))
				print('%s read') % self.id
				
			# write data out on all outbound connections
			for endpoint in self.connections:
				endpoint.write(data)
	
	
	def write(self, data):
		try:
			if self.socket.is_open:
				self.socket.write(data)
				if debug:
					print('%s write %s') % (self.id, data[:25])
				
		# serial.SerialException
		except Exception as e:
			print("Error writing: %s") % e
			return
		
		
	def to_json(self):
		return {"id": self.id,
				"type": self.type,
				"port": self.port,
				"baudrate": self.baudrate,
				"connections": self.connectionIds};
				
		
class UDPEndpoint(Endpoint):
	
	def __init__(self, ip, port, id, connections):
		Endpoint.__init__(self, id, 'udp', connections)
		self.ip = ip
		self.port = port
		self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
		self.socket.setblocking(False)
		print('%s on %s:%s') % (self.id, self.ip, self.port)
		if (self.ip == '0.0.0.0'):
			print('binding')
			self.socket.bind((ip, int(port)))
		
	def read(self):
		try:
			data, address = self.socket.recvfrom(1024)
			self.destination = address
		except:
			return
		
		if len(data) > 0:
			if debug:
				#print('%s read %s on %s') % (self.id, data[:25], address)
				print("%s read") % self.id

			for endpoint in self.connections:
				endpoint.write(data)
				
	def write(self, data):
		try:
			if (self.ip == '0.0.0.0'):
				self.socket.sendto(data, self.destination)
			else:
				self.socket.sendto(data, (self.ip, int(self.port)))
			
			if debug:
				#print('%s write %s') % (self.id, data[:25])
				print("%s write") % self.id

		except Exception as e:
			print e
			return


	def to_json(self):
		return {"id": self.id,
				"type": self.type,
				"port": self.port,
				"ip": self.ip,
				"connections": self.connectionIds};


def add(new_endpoint):
	for existing_endpoint in endpoints:
		if new_endpoint.id == existing_endpoint.id:
			print("Error adding endpoint %s, id already exists") % new_endpoint.id
			return
	for existing_endpoint in endpoints:
		if new_endpoint.id in existing_endpoint.connectionIds:
			existing_endpoint.connections.append(new_endpoint)
		if existing_endpoint.id in new_endpoint.connectionIds:
			new_endpoint.connections.append(existing_endpoint)
			
	endpoints.append(new_endpoint)


def remove(endpoint_id):
	remove = None
	for endpoint in endpoints:
		if endpoint.id == endpoint_id:
			remove = endpoint
			break
		
	if remove is None:
		print("Error removing endpoint %s, id doesn't exist") % endpoint_id
		return
	
	print("remove: %s") % remove
	try:
		remove.socket.close()
		endpoints.remove(remove)
		print("removed endpoint %s") % remove.id
		
		
		for endpoint in endpoints:
			endpoint.connections.remove(remove)
			endpoint.connections.connectionIds.remove(remove.id)
				
				
	except Exception as e:
		#print("Error removing: %s") % e
		pass


def to_json(endpoint_id=None):
	configuration = []
	for endpoint in endpoints:
		configuration.append(endpoint.to_json())
	configuration = {"endpoints": configuration}
	return json.dumps(configuration, indent=4)

def from_json(endpoint_json):
	if endpoint_json['type'] == 'serial':
		new_endpoint = SerialEndpoint(
							endpoint_json['port'],
							endpoint_json['baudrate'],
							endpoint_json['id'],
							endpoint_json['connections'])
		
	elif endpoint_json['type'] == 'udp':
		new_endpoint = UDPEndpoint(
							endpoint_json['ip'],
							endpoint_json['port'],
							endpoint_json['id'],
							endpoint_json['connections'])
	
	return new_endpoint


def connect(source_id, target_id):
	source = None
	target = None
	for endpoint in endpoints:
		if endpoint.id == source_id:
			source = endpoint
		if endpoint.id == target_id:
			target = endpoint
			
	if source is None:
		print("Error: source %s is not present") % source_id
		
	if target is None:
		print("Error: target %s is not present") % target_id
		
	source.connect(target)


def disconnect(source_id, target_id):
	source = None

	for endpoint in endpoints:
		if endpoint.id == source_id:
			source = endpoint
			
	if source is None:
		print("Error: source %s is not present") % source_id
		
	#it's ok if target does not exist, it may still be a desired endpoint
		
	source.disconnect(target_id)


def get_endpoints():
	return endpoints


def save(filename):
	f = open(filename, 'w+')
	f.write(to_json())
	f.close()


def load(filename):
	try:
		f = open(filename, 'r')
		configuration = json.load(f)
		f.close()
	except Exception as e:
		print("Error loading from file %s: %s") % (filename, e)
		return
	
	for endpoint in configuration['endpoints']:
		try:
			if endpoint['type'] == 'serial':
				new_endpoint = SerialEndpoint(
									endpoint['port'],
									endpoint['baudrate'],
									endpoint['id'],
									endpoint['connections'])
				
			elif endpoint['type'] == 'udp':
				new_endpoint = UDPEndpoint(
									endpoint['ip'],
									endpoint['port'],
									endpoint['id'],
									endpoint['connections'])
			
			add(new_endpoint)
		
		except Exception as e:
			print(e)
			pass

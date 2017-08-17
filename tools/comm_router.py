#!/usr/bin/python

import socket
import time
import json
import endpoint

debug = False

# load configuration from file
try:
    print 'loading configuration from file...'
    endpoint.load('/home/pi/routing.conf')
    print 'configuration successfully loaded'
except Exception as e:
    print 'error loading configuration'
    print e
    pass

# we will listen here for requests
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.setblocking(False)
sock.bind(('0.0.0.0', 18990))

while True:
    # don't hog the cpu
    time.sleep(0.01)
    
    # read all endpoints and write all routes
    for _endpoint in endpoint.endpoints:
        _endpoint.read()
        
    try:
        # see if there is a new request
        data, address = sock.recvfrom(1024)
        print("\n%s sent %s\n") % (address, data)
        
        # all requests come packed in json
        msg = json.loads(data)
        
        try:
            request = msg['request']
            print("Got request %s") % request
        except:
            print "No request!"
            continue
        
        if request == 'add endpoint':
            endpoint.add(endpoint.from_json(msg))
            
        elif request == 'remove endpoint':
            endpoint.remove(msg['id'])
            sock.sendto(endpoint.to_json(), address)
            
        elif request == 'connect endpoints':
            print('got connect request: %s') % data
            endpoint.connect(msg['source'], msg['target'])
            
        elif request == 'disconnect endpoints':
            endpoint.disconnect(msg['source'], msg['target'])
            
        elif request == 'save all':
            endpoint.save(msg['filename'])
            
        # Hard load replaces current configuration with load configuration
        # Soft load appends load configuration to current configuration
        elif request == 'load all':
            if msg['soft'] == False:
                print("Hard load")
                # TODO: garbage collect?
                endpoint.endpoints = []
            endpoint.load(msg['filename'])
            
        # send updated list of endpoints
        sock.sendto(endpoint.to_json(), address)
        
        # save current list of endpoints
        endpoint.save('/home/pi/routing.conf')
        
    except socket.error as e:
        continue
    except Exception as e:
        print("Error: %s") % e
        continue

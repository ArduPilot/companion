#!/usr/bin/python

import time
import pynmea2
import json
import socket
from os import system

# destination / output
ip="127.0.0.1"
portnum = 25100
sockitOut = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sockitOut.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sockitOut.setblocking(False)

# UDP source
sockitUdp = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sockitUdp.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sockitUdp.setblocking(False)
sockitUdp.bind(('0.0.0.0', 27000))

# Alternative TCP source
sockitTcp = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sockitTcp.setblocking(False)
sockitTcp.bind(('0.0.0.0', 27001))
sockitTcp.listen(1)

parser = pynmea2.NMEAStreamReader()

data = {
    'time_usec' : 0,                        # (uint64_t) Timestamp (micros since boot or Unix epoch)
    'gps_id' : 0,                           # (uint8_t) ID of the GPS for multiple GPS inputs
    'ignore_flags' : 56,                    # (uint16_t) Flags indicating which fields to ignore (see GPS_INPUT_IGNORE_FLAGS enum). All other fields must be provided.
    'time_week_ms' : 0,                     # (uint32_t) GPS time (milliseconds from start of GPS week)
    'time_week' : 0,                        # (uint16_t) GPS week number
    'fix_type' : 3,                         # (uint8_t) 0-1: no fix, 2: 2D fix, 3: 3D fix. 4: 3D with DGPS. 5: 3D with RTK
    'lat' : 0,                              # (int32_t) Latitude (WGS84), in degrees * 1E7
    'lon' : 0,                              # (int32_t) Longitude (WGS84), in degrees * 1E7
    'alt' : 0,                              # (float) Altitude (AMSL, not WGS84), in m (positive for up)
    'hdop' : 0,                             # (float) GPS HDOP horizontal dilution of position in m
    'vdop' : 0,                             # (float) GPS VDOP vertical dilution of position in m
    'vn' : 0,                               # (float) GPS velocity in m/s in NORTH direction in earth-fixed NED frame
    've' : 0,                               # (float) GPS velocity in m/s in EAST direction in earth-fixed NED frame
    'vd' : 0,                               # (float) GPS velocity in m/s in DOWN direction in earth-fixed NED frame
    'speed_accuracy' : 0,                   # (float) GPS speed accuracy in m/s
    'horiz_accuracy' : 0,                   # (float) GPS horizontal accuracy in m
    'vert_accuracy' : 0,                    # (float) GPS vertical accuracy in m
    'satellites_visible' : 0                # (uint8_t) Number of satellites visible.
}

data_received = False
gps_type_set = False
last_output_t = 0;

# wait for connection
def waitConnection():
	while True:
	    try:
		sockit, addr = sockitTcp.accept()
		print("TCP connected!")
                return sockit
		break
	    except:
		print("TCP not connected, waiting for data")

	    try:
		sockitUdp.recvfrom(4096)
		sockit = sockitUdp
		print("UDP connected!")
                return sockitUdp
		break
	    except:
		print("UDP not connected, waiting for data")

	    time.sleep(1) # 1 Hz update before connected

sockit = waitConnection()

# setup gps type parameter
system('screen -S mavproxy -p 0 -X stuff "param set GPS_TYPE 14^M"')

while True:
    
    time.sleep(0.05) # 20 Hz update once connected

    try:
        datagram = sockit.recv(4096) # This blocks for UDP, for TCP, it will return None when remote hangs up

        if not datagram: # TCP disconnect
            print("Remote has hung up")
            sockit.shutdown(socket.SHUT_RDWR)
            sockit.close()
            sockit = waitConnection()
        else:
            for byte in datagram:
                for msg in parser.next(byte):
                    if msg.sentence_type == 'GGA':
                        data['lat'] = msg.latitude * 1e7
                        data['lon'] = msg.longitude * 1e7
                        data['hdop'] = float(msg.horizontal_dil)
                        data['alt'] = float(msg.altitude)
                        data['satellites_visible'] = int(msg.num_sats)
                    elif msg.sentence_type == 'RMC':
                        data['lat'] = msg.latitude * 1e7
                        data['lon'] = msg.longitude * 1e7
                    elif msg.sentence_type == 'GLL':
                        data['lat'] = msg.latitude * 1e7
                        data['lon'] = msg.longitude * 1e7
                    elif msg.sentence_type == 'GNS':
                        data['lat'] = msg.latitude * 1e7
                        data['lon'] = msg.longitude * 1e7
                        data['satellites_visible'] = int(msg.num_sats)
                        data['hdop'] = float(msg.hdop)
                        
            if time.time() > last_output_t + 0.1:
                last_output_t = time.time();
                buf = json.dumps(data)
                print("Sending: ", data)
                sockitOut.sendto(buf, (ip, portnum))
            
    except socket.error as e:
        if e.errno == 11:
            pass
        else:
            print("Error:", e)
    except Exception as e:
        print("Got error:", e)

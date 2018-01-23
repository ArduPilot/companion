#!/usr/bin/python

import time
import socket
import json
import argparse
import grequests
from pymavlink import mavutil

from os import system


master = mavutil.mavlink_connection('udpout:192.168.2.1:14400', source_system=2, source_component=1)

parser = argparse.ArgumentParser(description="Driver for the Water Linked Underwater GPS system.")
parser.add_argument('--ip', action="store", type=str, default="demo.waterlinked.com", help="remote ip to query on.")
parser.add_argument('--port', action="store", type=str, default="80", help="remote port to query on.")
args = parser.parse_args()


connected = False
while not connected:
    time.sleep(5)
    print("scanning for Water Linked underwater GPS...")
    connected = not system('curl ' + args.ip + ':' + args.port + '/api/v1/about/')

print("Found Water Linked underwater GPS!")

system('screen -S mavproxy -p 0 -X stuff "param set GPS_TYPE 14^M"')

sockit = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sockit.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sockit.setblocking(0)
sockit.bind(('0.0.0.0', 25102))

gpsUrl = "http://" + args.ip + ":" + args.port

def processMasterPosition(response, *args, **kwargs):
    print('got master response:', response.text)
    result = response.json()
    master.mav.heartbeat_send(
        0,                     # type                      : Type of the MAV (quadrotor, helicopter, etc., up to 15 types, defined in MAV_TYPE ENUM) (uint8_t)
        1,                     # autopilot                 : Autopilot type / class. defined in MAV_AUTOPILOT ENUM (uint8_t)
        0,                     # base_mode                 : System mode bitfield, see MAV_MODE_FLAG ENUM in mavlink/include/mavlink_types.h (uint8_t)
        0,                     # custom_mode               : A bitfield for use for autopilot-specific flags. (uint32_t)
        0,                     # system_status             : System status flag, see MAV_STATE ENUM (uint8_t)
        0                      # mavlink_version           : MAVLink version, not writable by user, gets added by protocol because of magic data type: uint8_t_mavlink_version (uint8_t)
    )
    master.mav.gps_raw_int_send(
        0,                     # time_usec                 : Timestamp (microseconds since UNIX epoch or microseconds since system boot) (uint64_t)
        3,                     # fix_type                  : See the GPS_FIX_TYPE enum. (uint8_t)
        result['lat'] * 1e7,   # lat                       : Latitude (WGS84), in degrees * 1E7 (int32_t)
        result['lon'] * 1e7,   # lon                       : Longitude (WGS84), in degrees * 1E7 (int32_t)
        0,                     # alt                       : Altitude (AMSL, NOT WGS84), in meters * 1000 (positive for up). Note that virtually all GPS modules provide the AMSL altitude in addition to the WGS84 altitude. (int32_t)
        0,                     # eph                       : GPS HDOP horizontal dilution of position (unitless). If unknown, set to: UINT16_MAX (uint16_t)
        0,                     # epv                       : GPS VDOP vertical dilution of position (unitless). If unknown, set to: UINT16_MAX (uint16_t)
        0,                     # vel                       : GPS ground speed (m/s * 100). If unknown, set to: UINT16_MAX (uint16_t)
        0,                     # cog                       : Course over ground (NOT heading, but direction of movement) in degrees * 100, 0.0..359.99 degrees. If unknown, set to: UINT16_MAX (uint16_t)
        6                      # satellites_visible        : Number of satellites visible. If unknown, set to 255 (uint8_t)
    )
    master.mav.vfr_hud_send(
        0,                     # airspeed                  : Current airspeed in m/s (float)
        0,                     # groundspeed               : Current ground speed in m/s (float)
        result['orientation'], # heading                   : Current heading in degrees, in compass units (0..360, 0=north) (int16_t)
        0,                     # throttle                  : Current throttle setting in integer percent, 0 to 100 (uint16_t)
        0,                     # alt                       : Current altitude (MSL), in meters (float)
        0                      # climb                     : Current climb rate in meters/second (float)
    )
    
def processLocatorPosition(response, *args, **kwargs):
    print('got global response:', response.text)
    result = response.json()
    result['lat'] = result['lat'] * 1e7
    result['lon'] = result['lon'] * 1e7
    result['fix_type'] = 3
    result['hdop'] = 1.0
    result['vdop'] = 1.0
    result['satellites_visible'] = 10
    result['ignore_flags'] = 8 | 16 | 32
    result = json.dumps(result);
    print('sending      ', result)
    
    sockit.sendto(result, ('0.0.0.0', 25100))
    
def notifyPutResponse(response, *args, **kwargs):
    print('PUT response:', response.text)

update_period = 0.25
last_master_update = 0
last_locator_update = 0
s = grequests.Session()
# Thank you https://stackoverflow.com/questions/16015749/in-what-way-is-grequests-asynchronous
while True:
    if time.time() > last_locator_update + update_period:
        last_locator_update = time.time()
        url = gpsUrl + "/api/v1/position/global"
        print('requesting data from', url)
        request = grequests.get(url, session=s, hooks={'response': processLocatorPosition})
        job = grequests.send(request)
        
    if time.time() > last_master_update + update_period:
        last_master_update = time.time()
        url = gpsUrl + "/api/v1/position/master"
        print('requesting data from', url)
        request = grequests.get(url, session=s, hooks={'response': processMasterPosition})
        job = grequests.send(request)
    
    try:
        datagram = sockit.recvfrom(4096)
        recv_payload = json.loads(datagram[0])
        
        # Send depth/temp to external/depth api
        ext_depth = {}
        ext_depth['depth'] = max(min(100, recv_payload['depth']), 0)
        ext_depth['temp'] = max(min(100, recv_payload['temp']), 0)
        
        send_payload = json.dumps(ext_depth)
        
        headers = {'Content-type': 'application/json'}
        
        url = gpsUrl + "/api/v1/external/depth"
        print('sending', send_payload, 'to', url)
        
        # Equivalent
        # curl -X PUT -H "Content-Type: application/json" -d '{"depth":1,"temp":2}' "http://37.139.8.112:8000/api/v1/external/depth"
        request = grequests.put(url, session=s, headers=headers, data=send_payload, hooks={'response': notifyPutResponse})
        grequests.send(request)
        
        # Send heading to external/orientation api
        ext_orientation = {}
        ext_orientation['orientation'] = max(min(360, recv_payload['orientation']), 0)
        
        send_payload = json.dumps(ext_orientation)
        
        headers = {'Content-type': 'application/json'}
        
        url = gpsUrl + "/api/v1/external/orientation"
        print('sending', send_payload, 'to', url)
        
        request = grequests.put(url, session=s, headers=headers, data=send_payload, hooks={'response': notifyPutResponse})
        grequests.send(request)

    except socket.error as e:
        if e.errno == 11:
            pass # no data available for udp read
        else:
            print(e)

    time.sleep(0.02)

#!/usr/bin/python

# initialization script to setup BU-353S4 gps for ArduSub positioning input
# BU-353S4 is based on SiRF STAR IV chipset which uses the '$PSRF' identifier
# Jacob Walser September 2016

import serial
import time

from optparse import OptionParser

parser = OptionParser()
parser.add_option("--port", dest="port", default='/dev/ttyUSB0', help="port that GPS is on")
parser.add_option("--baudrate", dest="baudrate", default=4800, help="baudrate for serial communication")
(options,args) = parser.parse_args()

print 'opening port %s at %d baud' % (options.port, options.baudrate)

try:
    ser = serial.Serial(options.port, options.baudrate)
except Exception as e:
    print e
    exit(1)

print 'initalizing...'

print 'enabling VTG'
ser.write("$PSRF103,05,00,01,01*20\r\n")#enable VTG
time.sleep(1)

print 'enabling GSA'
ser.write("$PSRF103,02,00,00,01*26\r\n")#disable GSA
time.sleep(1)

print 'disabling GSV'
ser.write("$PSRF103,03,00,00,01*27\r\n")#disable GSV
time.sleep(1)

print 'set 5Hz mode'
ser.write("$PSRF103,0,6,0,0*23\r\n")#set 5Hz mode
time.sleep(1)

print 'enable VTG with checksum'
ser.write("$PSRF103,05,00,01,01*20\r\n")#enable VTG, ensure checksum
time.sleep(1)

print 'enable RMC with checksum'
ser.write("$PSRF103,04,00,01,01*21\r\n")#enable RMC, ensure checksum
time.sleep(1)

print 'set 115.2 kbaud'
ser.write("$PSRF100,1,115200,8,1,0*05\r\n")#set baudrate
time.sleep(1)

print 'Done.'

ser.close

export LD_LIBRARY_PATH=/usr/local/lib/
cd /home/pi/
gst-launch-1.0 -v -e alsasrc device=hw:1,0 ! audioconvert ! rtpL16pay ! udpsink host=192.168.2.1 port=5601


#gst-launch-1.0 -v -e alsasrc device=hw:1,0 ! audioconvert ! tcpserversink host=192.168.2.2 port=5700

# This one fo-sho works
#gst-launch-1.0 -v -e alsasrc device=hw:1,0 ! audioconvert ! lamemp3enc ! tcpserversink host=192.168.2.2 port=5700

# Video Streaming Command
# Please uncomment only one line depending on streaming preference

# For all streaming options:
# - Since we are hardwired through tether, bitrate is high to maximize quality
# - Auto white balance is disabled
# - Video stream is flushed to minimize latency
# - Framerate is maximized
# - Port 5600 is used for compatibility with QGroundControl

# Low-latency, low resolution stream (100ms)

# raspivid --nopreview \
#          --width 640 \
#          --height 480 \
#          --bitrate 10000000
#          -fps 30 \
#          --awb off \
#          -fl \
#          --timeout 0 \
#          --output - | \
#          gst-launch-1.0 -v fdsrc ! h264parse ! rtph264pay config-interval=10 pt=96 ! \
#          udpsink host=169.254.2.1 port=5600

# 1080p stream with some latency for RasPi camera (250ms on RPi3)

raspivid --nopreview \
         --mode 2 \
         --bitrate 25000000 \
       	 --intra 3 \
       	 --awb auto \
         -fl \
         --timeout 0 \
         --output - | \
         gst-launch-1.0 -v fdsrc ! h264parse ! rtph264pay config-interval=10 pt=96 ! \
         udpsink host=169.254.2.1 port=5600
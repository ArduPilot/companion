# Video Streaming Command
# Please uncomment only one line depending on streaming preference

# For all streaming options:
# - Since we are hardwired through tether, bitrate is high to maximize quality
# - Auto white balance is disabled
# - Video stream is flushed to minimize latency
# - Framerate is maximized
# - Port 5000 is used for compatibility with QGroundControl

# Low-latency, low resolution stream (100ms)

# raspivid --nopreview \
#          --width 640 \
#          --height 480 \
#          --bitrate 5000000
#          --framerate 30 \
#          --awb off \
#          -fl \
#          --timeout 0 \
#          --output - | \
#          gst-launch-1.0 -v fdsrc ! h264parse ! rtph264pay config-interval=10 pt=96 ! \
#          udpsink host=169.254.2.1 port=5000

# Reliable 720p stream with fairly low latency (200ms)

# raspivid --nopreview \
#          --width 1280 \
#          --height 720 \
#          --bitrate 10000000
#          --framerate 30 \
#          --awb off \
#          -fl \
#          --timeout 0 \
#          --output - | \
#          gst-launch-1.0 -v fdsrc ! h264parse ! rtph264pay config-interval=10 pt=96 ! \
#          udpsink host=169.254.2.1 port=5000   

# 1080p stream with some latency for wide angle RasPi camera (300ms)

raspivid --nopreview \
         --mode 2 \
         --bitrate 17000000 \
         --framerate 15 \
         --awb off \
         --exposure night \
         -fl \
         --timeout 0 \
         --output - | \
         gst-launch-1.0 -v fdsrc ! h264parse ! rtph264pay config-interval=10 pt=96 ! \
         udpsink host=169.254.2.1 port=5000

# 4K stream with latency (standard RasPiCam only)

# raspivid --nopreview \
#          --mode 2 \
#          --bitrate 25000000
#          --framerate 15 \
#          --awb off \
#          -fl \
#          --timeout 0 \
#          --output - | \
#          gst-launch-1.0 -v fdsrc ! h264parse ! rtph264pay config-interval=10 pt=96 ! \
#          udpsink host=169.254.2.1 port=5000     
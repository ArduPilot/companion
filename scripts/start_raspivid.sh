export LD_LIBRARY_PATH=/usr/local/lib/

raspivid $1 --output - | gst-launch-1.0 -v fdsrc $2

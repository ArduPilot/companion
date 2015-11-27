John Lian  - john.lian@pleiades.ca

Alexandre Willame - alexandre.willame@pleiades.ca

## Guide to set up NVIDIA TK1 to communicate with Pixhawk

### Hardware

You'll want to connect the TK1 to the Pixhawk using UART/serial. The USB connection works but it's potentially unstable.

The TK1 uses 1.8V for its serial pins and the Pixhawk is 5V. Therefore you will need a voltage converter (Texas Instruments TXB0104 is what we used). The pins are configured as such:

| TK1           | TXB0104     | Pixhawk |
|:------------- |:-----------:| -------:|
| 1.8V: P37     | VCCA - VCCB | 5V: P1  |
| GND: P38      | GND - GND   | GND: P6 |
| TXd1: P41     | A1 - B1     | TX1: P2 |
| RXd1: P44     | A2 - B2     | RX1: P3 |

This will allow you to connect TK1 to the Jetson via `ttyTHS0`

### Ubuntu setup

To run have a `mavproxy` session running please run

```bash
$ sudo apt-get install python-opencv python-wxgtk python-pip python-dev
$ pip install numpy
$ pip install mavproxy
```

## /etc/rc.local

```bash
# BASIC CONNECTION
sudo mavproxy.py --master=/dev/ttyTHS0 --baudrate 1500000 #(this should be the same as SER2_BAUD on your PixHawk)

# GSTREAMING WITH H.264 CAMERA (EG LOGITECH C920)
# Uncomment below 
# gst-launch-1.0 v4l2src device=/dev/video0 ! video/x-h264,width=640,height=360,framerate=30/1 ! h264parse ! rtph264pay pt=127 config-interval=4 ! udpsink host=172.27.224.12 port=5000 

exit 0
```



This is a web server for ArduPilot. It provides the following
features:

 - listens for HTTP requests on specified port
 - connects to a mavlink serial port
 - forwards mavlink packets to UDP port 14550 broadcast
 - provides web interface for parameters, sensor status and map

Typical usage:

  ./web_server -p 80 -s /dev/serial/by-id/usb-3D_Robotics_PX4_FMU_v2.x_0-if00
  
then connect to http://127.0.0.1/

Some information on the JSON protocol used is here:

 https://docs.google.com/document/d/12IQFXDRIif06BiriHSCGdiJGZ6zsQ_phQsG_iI6_MAo/edit?usp=sharing
 

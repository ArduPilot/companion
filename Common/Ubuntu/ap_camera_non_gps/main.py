import threading
import time
import video_capture_gazebo
import feature_match_ardu
from pymavlink import mavutil
import traceback
import signal
import sys


the_connection = mavutil.mavlink_connection('tcp:127.0.0.1:5762')
the_connection.wait_heartbeat()
print("Heartbeat from system (system %u component %u)" %
      (the_connection.target_system, the_connection.target_component))


class main:
	def __init__(self):
		self.lat = 0
		self.lon = 0
		self.alt = 0
		self.alt_ab_ter = 0
		
		self.video = video_capture_gazebo.Cam_stream()
		t1 = threading.Thread(target=self.video.setup)
		t1.start()

		the_connection.mav.command_long_send(
			the_connection.target_system, the_connection.target_component,
			mavutil.mavlink.MAV_CMD_SET_MESSAGE_INTERVAL, 0,
			33,
			1e6 / 30,
			0, 0, 0, 0,
			0,
		)


	def get_gps(self):
		msg = the_connection.recv_match(type='GLOBAL_POSITION_INT', blocking=False)
		if msg:
			self.lat = msg.lat
			self.lon = msg.lon
		return {self.lat, self.lon}

	def vid_sleep(self):
		time.sleep(0.3)




m = main()

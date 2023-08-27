#!/usr/bin/env python

import gi
import numpy as np
import cv2 as cv

gi.require_version('Gst', '1.0')
from gi.repository import Gst


class Cam_stream():
    def __init__(self, port=5600):

        Gst.init(None)
        self.frame = None
        self.config = f'udpsrc port={port} ! application/x-rtp, payload=96 ! rtph264depay ! h264parse ! avdec_h264 ! decodebin ! videoconvert ! video/x-raw,format=(string)BGR ! videoconvert ! appsink emit-signals=true sync=false max-buffers=2 drop=true'
        self.pipe = None
        self.vid_out = None
        self.check = 0
        self.n = 0
        self.main()

    def bridge(self,sample):
        buf = sample.get_buffer()
        caps = sample.get_caps()
        array = np.ndarray((caps.get_structure(0).get_value('height'), caps.get_structure(0).get_value('width'), 3), buffer=buf.extract_dup(0, buf.get_size()), dtype=np.uint8)
        return array

    def frame_available(self):
        return type(self.frame) != type(None)

    def main(self):
        self.pipe = Gst.parse_launch(self.config)
        self.pipe.set_state(Gst.State.PLAYING)
        self.vid_out = self.pipe.get_by_name('appsink0')

        self.vid_out.connect('new-sample', self.callback)

    def callback(self, sink):
        sample = sink.emit('pull-sample')
        mainframe = self.bridge(sample)
        self.frame = mainframe
        return Gst.FlowReturn.OK

    def setup(self):
        while True:
            if not self.frame_available():
                continue

            cv.imshow('frame', self.frame)

            if self.check == 1:
                self.n += 1
                cv.imwrite(f"data{self.n}.jpeg", self.frame)
                self.check = 0

            if cv.waitKey(1) & 0xFF == ord('q'):
                break


if __name__ == '__main__':
    stream = Cam_stream()

    while True:
        if not stream.frame_available():
            continue

        frame = stream.frame
        cv.imshow('frame', frame)

        if self.check == 1:
            self.n += 1
            cv.imwrite(f"data{self.n}.jpeg", self.frame)
            self.check = 0

        if cv.waitKey(1) & 0xFF == ord('q'):
            break
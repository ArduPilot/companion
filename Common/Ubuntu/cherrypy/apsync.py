#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
apsync.py

Simple interface to control various aspects of the APSync Companion Computer image
"""

import os
import sys
import string
import subprocess
import time
import traceback
import threading

import cherrypy
import jinja2

local_path = os.path.dirname(os.path.abspath(__file__))

cherrypy_conf = {
    '/': {
        'tools.sessions.on': True,
        'tools.staticdir.root': local_path
    },
    '/static': {
        'tools.staticdir.dir': os.path.join('html','static'),
        'tools.staticdir.on': True,
    }
}


class APSync(object):

    class VideoStreamerState(object):
        def __init__(self):
            self.filepath = "/tmp/cmavnode-links.txt"

    def __init__(self):
        self.port = 8000
        self.host = '0.0.0.0'

        self.streaming = False
        self.streaming_pid = None
        self.streaming_error = None
        self.streaming_to_ip = None

        self.no_streaming_flagfile = "apsync.py-no-streaming-flagfile"

        self.video_streamer_state = APSync.VideoStreamerState()

    def run(self):
        self.run_web_server()
        self.run_video_stream_starter()

        print 'Waiting for cherrypy engine...'
        cherrypy.engine.block()

    def run_web_server(self):
        cherrypy.tree.mount(APSyncActions(self), '/', config=cherrypy_conf)

        cherrypy.config.update({
            'server.socket_host': self.host,
            'server.socket_port': self.port,
            'log.screen': None
         })

        print('''Server will be bound on %s:%u''' % (self.host,self.port))

        cherrypy.engine.start()

    def video_streamer_get_stats(self):
        ret = {}
        try:
            fh = file(self.video_streamer_state.filepath, "r")
        except Exception as e:
            print("Caught exception opening %s: %s" % (self.video_streamer_state.filepath, repr(e)))
            return {}
        for line in fh.readlines():
            (address, count_str) = string.split(line, sep=" ")
            count = int(count_str)
            if address.find('127.0.0.1') != -1:
                # ignore anything from localhost
                continue
            if address.find('0.0.0.0') != -1:
                # ignore anything broadcast
                continue
            if address.find('10.0.1.128') != -1:
                # ignore anything broadcast
                continue
            if address.find('.255') != -1:
                # ignore any broadcast addresses
                continue
            #if address.find("14550") == -1:
                # ignore any non-14550 lines for now
             #   continue
            ret[address] = count
        fh.close()
        return ret

    def good_video0(self):
        path = "/dev/video0"
        if not os.path.exists(path):
            return False

        try:
            output = subprocess.check_output(["v4l2-ctl", "-D", "-d", path])
        except CalledProcessError as e:
            print("Failed to get description of (%s)", path)
            return False

        if output.find("ZED") != -1:
            print("/dev/video0 is ZED!")
            return False
        return True


    def is_raspi(self):
        return os.path.exists("/etc/rpi-issue")

    def video_stream_starter_main(self):
        '''Monitor a file in /tmp/ for telemtry traffic (currently written by
        cmavnode), possibly redirect video stream out that way
        '''
        while not self.auto_streaming_enabled():
#            print("Auto streaming currently disabled")
            time.sleep(1)

        while not self.good_video0() and not self.is_raspi():
            print("Waiting for good video0")
            time.sleep(1)

        winner = None
        while winner is None:
            stats = self.video_streamer_get_stats()
            winner_count = 0
            for address in stats.keys():
                if winner is None or stats[address] > winner_count:
                    winner = address
                    winner_count = stats[address]
            time.sleep(1) # run at 1Hz
        (ip,port) = string.split(address, sep=':')
        print("Starting video stream to ip (%s)" % ip)
        self.stream_video_to_ip(ip)

    def run_video_stream_starter(self):
        '''start a thread for responsible for starting video stream'''
        video_stream_starter_thread = threading.Thread(name='video_stream_starter_main', target=self.video_stream_starter_main)
        video_stream_starter_thread.start()

    def close_all_fds(self):
        for i in range(3, 256):
            try:
                os.close(i)
            except OSError as e:
                if e.errno != 9:
                    print("Exception on close of fd=%u: %s" % (i, repr(e)))

    def streaming_start_child(self, to_ip):
        args = [ os.path.join(local_path, "start_udp_stream") ]
        args.append(to_ip)
        self.close_all_fds()
        out = os.open("/tmp/streaming.stdout", os.O_WRONLY|os.O_CREAT|os.O_TRUNC)
        err = os.open("/tmp/streaming.stderr", os.O_WRONLY|os.O_CREAT|os.O_TRUNC)
        os.dup2(out, 1)
        os.dup2(err, 2)
        x = os.execv(args[0], args)
        sys.exit(1)

    def stream_video_to_ip(self, to_ip):
        if not self.streaming:
            try:
                pid = os.fork()
                if pid == 0:
                    # child
                    os.setsid()
                    try:
                        self.streaming_start_child(to_ip) # does not return
                    except Exception as e:
                        print("streaming_start_child failed: %s" % str(e))
                        traceback.print_stack()
                    sys.exit(1)
                # parent
                self.streaming_pid = pid
            except Exception as e:
                print("Create-Child failed: %s" % str(e))
                traceback.print_stack()
                return

        self.streaming = True
        self.streaming_error = None
        self.streaming_to_ip = to_ip

    def set_auto_streaming(self, enable):
        if enable:
            if os.path.exists(self.no_streaming_flagfile):
                os.unlink(self.no_streaming_flagfile)
        else:
            fd = os.open(self.no_streaming_flagfile, os.O_CREAT|os.O_WRONLY)
            os.close(fd)

    def auto_streaming_enabled(self):
        if os.path.exists(self.no_streaming_flagfile):
            return False
        return True

class Templates:
    def __init__(self, apsync):
        self.apsync = apsync
        loader = jinja2.FileSystemLoader(self.html_dirpath())
        self.environment = jinja2.Environment(loader=loader)

    def html_dirpath(self):
        return os.path.join(local_path,'html')

    def index(self):
        opts = {}
        opts['streaming'] = self.apsync.streaming
        opts['streaming_error'] = self.apsync.streaming_error
        opts['streaming_to_ip'] = self.apsync.streaming_to_ip
        opts['auto_streaming'] = self.apsync.auto_streaming_enabled()
        return self.render_template('index', opts)

    def render_template(self, template_name, opts):
        template = self.environment.get_template(template_name + '.html')
        return template.render(state=opts)

class APSyncActions(object):
    def __init__(self,  apsync):
        self.apsync = apsync
        self.templates = Templates(apsync)

    @cherrypy.expose
    def index(self):
        return self.templates.index()

    @cherrypy.expose
    def streaming_start(self):
        self.apsync.stream_video_to_ip(str(cherrypy.request.remote.ip))
        return self.templates.index()

    @cherrypy.expose
    def streaming_stop(self):
        if self.apsync.streaming:
            try:
                # fixme: how do we kill a PG in Python?!
                os.system("kill -9 -%u" % (self.apsync.streaming_pid,))
                os.waitpid(self.apsync.streaming_pid, os.WNOHANG)
                self.apsync.streaming_error = None
            except Exception as e:
                self.apsync.streaming_error = str(e)

            self.apsync.streaming = False
            self.apsync.streaming_pid = None
            self.apsync.streaming_to_ip = None

        return self.templates.index()

    @cherrypy.expose
    def auto_streaming_enable(self):
        self.apsync.set_auto_streaming(True)
        return self.templates.index()

    @cherrypy.expose
    def auto_streaming_disable(self):
        self.apsync.set_auto_streaming(False)
        return self.templates.index()

print 'Launching APSync...'
APSync().run()

#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
apsync.py

Simple interface to control various aspects of the APSync Companion Computer image
"""

import os
import sys
import time
import traceback

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

    def __init__(self):
        self.port = 8000
        self.host = '0.0.0.0'

        self.streaming = False
        self.streaming_pid = None
        self.streaming_error = None
        self.streaming_to_ip = None

    def run(self):
        self.run_web_server()

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

    @cherrypy.expose
    def streaming_start(self):
        to_ip = str(cherrypy.request.remote.ip)
        if not self.apsync.streaming:
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
                self.apsync.streaming_pid = pid
            except Exception as e:
                print("Create-Child failed: %s" % str(e))
                traceback.print_stack()
                return

        self.apsync.streaming = True
        self.apsync.streaming_error = None
        self.apsync.streaming_to_ip = to_ip
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

print 'Launching APSync...'
APSync().run()

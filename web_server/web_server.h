#pragma once

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <signal.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <ctype.h>
#include <getopt.h>
#include <time.h>
#include <string.h>
#include <netdb.h>
#include <unistd.h>
#include <fnmatch.h>
#include <strings.h>
#include <dlfcn.h>
#include <sys/time.h>
#include <sys/types.h>
#include <sys/mman.h>
#include <sys/wait.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <netinet/in_systm.h>
#include <netinet/ip.h>
#include <pthread.h>

struct connection_state;

#include "cgi.h"

#define WEB_SERVER_PORT 80

/*
  structure for output buffering
 */
struct sock_buf {
    bool add_content_length;
    uint32_t header_length;
    char *buf;
    int fd;
};


/*
  state of one connection
 */
struct connection_state {
    struct sock_buf *sock;
    struct cgi_state *cgi;
};

#define FMT_PRINTF(a,b) __attribute__((format(printf, a, b)))

void web_server_task_process(void *pvParameters);
void connection_destroy(struct connection_state *c);
ssize_t sock_write(struct sock_buf *sock, const char *s, size_t size);
void sock_printf(struct sock_buf *sock, const char *fmt, ...) FMT_PRINTF(2,3);
void web_server_set_debug(int debug);
void web_debug(int level, const char *fmt, ...);
void mavlink_fc_write(const uint8_t *buf, size_t len);


#define console_printf printf
#define console_vprintf vprintf


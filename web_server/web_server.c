/*
  simple web server for sonix board

  based on tserver:

  https://github.com/tridge/junkcode/tree/master/tserver
*/
#include "web_server.h"
#include "includes.h"
#include "web_files.h"

#include <termios.h>

static pthread_mutex_t lock;
static int num_sockets_open;
static int debug_level;
static int mavlink_fd;

void web_server_set_debug(int level)
{
    debug_level = level;
}

void web_debug(int level, const char *fmt, ...)
{
    if (level > debug_level) {
        return;
    }
    va_list ap;
    va_start(ap, fmt);
    console_vprintf(fmt, ap);
    va_end(ap);
}

static void lock_state(void)
{
    pthread_mutex_lock(&lock);
}

static void unlock_state(void)
{
    pthread_mutex_unlock(&lock);
}

/*
  destroy socket buffer, writing any pending data
 */
static int sock_buf_destroy(struct sock_buf *sock)
{
    if (sock->add_content_length) {
        /*
          support dynamic content by delaying the content-length
          header. This is needed to keep some anti-virus programs
          (eg. AVG Free) happy. Without a content-length the load of
          dynamic json can hang
         */
        uint32_t body_size = talloc_get_size(sock->buf) - sock->header_length;
        write(sock->fd, sock->buf, sock->header_length);
        char *clen = print_printf(sock, "Content-Length: %u\r\n\r\n", body_size);
        if (clen) {
            write(sock->fd, clen, talloc_get_size(clen));
        }
        write(sock->fd, sock->buf + sock->header_length, body_size);
    } else {
        size_t size = talloc_get_size(sock->buf);
        if (size > 0) {
            write(sock->fd, sock->buf, size);
        }
    }

    lock_state();
    num_sockets_open--;
    web_debug(4,"closing fd %d num_sockets_open=%d\n", sock->fd, num_sockets_open);
    unlock_state();
    
    close(sock->fd);
    return 0;
}

/*
  write to sock_buf
 */
ssize_t sock_write(struct sock_buf *sock, const char *s, size_t size)
{
    size_t current_size = talloc_get_size(sock->buf);
    ssize_t ret;
    if (!sock->add_content_length &&
        (size >= 1000 || (size >= 200 && current_size == 0))) {
        if (current_size > 0) {
            ret = write(sock->fd, sock->buf, current_size);
            if (ret != current_size) {
                return -1;
            }
            talloc_free(sock->buf);
            sock->buf = NULL;
        }
        ret = write(sock->fd, s, size);
    } else {
        sock->buf = talloc_realloc_size(sock, sock->buf, current_size + size);
        if (sock->buf) {
            memcpy(sock->buf + current_size, s, size);
        }
        ret = size;
    }
    return ret;
}

/*
  print to socket buffer
 */
void sock_printf(struct sock_buf *sock, const char *fmt, ...)
{
    if (strchr(fmt, '%') == NULL) {
        // simple string
        sock_write(sock, fmt, strlen(fmt));
        return;
    }
    va_list ap;
    va_start(ap, fmt);
    char *buf2 = print_vprintf(sock, fmt, ap);
    size_t size = talloc_get_size(buf2);
    if (buf2 && size > 0 && buf2[size-1] == 0) {
        // cope with differences in print_vprintf between platforms
        size--;
    }
    sock_write(sock, buf2, size);
    talloc_free(buf2);
    va_end(ap);
}


/*
  destroy a connection
*/
void connection_destroy(struct connection_state *c)
{
    talloc_free(c);
    pthread_exit(0);
}


/*
  write some data to the flight controller
 */
void mavlink_fc_write(const uint8_t *buf, size_t size)
{
    write(mavlink_fd, buf, size);
}

/*
  send a mavlink message to flight controller
 */
void mavlink_fc_send(mavlink_message_t *msg)
{
    _mavlink_resend_uart(MAVLINK_COMM_FC, msg);    
}

/*
  send a mavlink msg over WiFi
 */
static void mavlink_broadcast(int fd, mavlink_message_t *msg)
{
    uint8_t buf[300];
    uint16_t len = mavlink_msg_to_send_buffer(buf, msg);
    if (len > 0) {
        struct sockaddr_in addr;
        memset(&addr, 0x0, sizeof(addr));

        addr.sin_family = AF_INET;
        addr.sin_addr.s_addr = htonl(INADDR_BROADCAST);
        addr.sin_port = htons(14550);
        
        sendto(fd, buf, len, 0, (struct sockaddr*)&addr, sizeof(addr));
    }
}

/*
  process input on a connection
*/
static void connection_process(struct connection_state *c)
{
    if (!c->cgi->setup(c->cgi)) {
        connection_destroy(c);
        return;
    }
    c->cgi->load_variables(c->cgi);
    web_debug(3, "processing '%s' on %d num_sockets_open=%d\n", c->cgi->pathinfo, c->cgi->sock->fd, num_sockets_open);
    c->cgi->download(c->cgi, c->cgi->pathinfo);
    web_debug(3, "destroying '%s' fd=%d\n", c->cgi->pathinfo, c->cgi->sock->fd);
    connection_destroy(c);
}


/*
  task for web_server
*/
static void *web_server_connection_process(void *arg)
{
    int fd = (intptr_t)arg;
    // new talloc tree per thread
    struct connection_state *c = talloc_zero(NULL, struct connection_state);
    c->sock = talloc_zero(c, struct sock_buf);
    c->sock->fd = fd;

    lock_state();

    num_sockets_open++;
    
    web_debug(4,"Opened connection %d num_sockets_open=%d\n", fd, num_sockets_open);

    unlock_state();
    
    talloc_set_destructor(c->sock, sock_buf_destroy);
    c->cgi = cgi_init(c, c->sock);
    if (!c->cgi) {
        connection_destroy(c);
        return NULL;
    }

    connection_process(c);
    return NULL;
}

/*
  main select loop
 */
static void select_loop(int tcp_socket, int udp_socket, int mavlink_fd)
{    
    while (1) {
        fd_set fds;
        struct timeval tv;
        int numfd = tcp_socket+1;

        FD_ZERO(&fds);
        FD_SET(tcp_socket, &fds);
        FD_SET(udp_socket, &fds);
        FD_SET(mavlink_fd, &fds);

        if (udp_socket >= numfd) {
            numfd = udp_socket+1;
        }
        if (mavlink_fd >= numfd) {
            numfd = mavlink_fd+1;
        }
        
        
        tv.tv_sec = 1;
        tv.tv_usec = 0;

        int res = select(numfd, &fds, NULL, NULL, &tv);
        if (res <= 0) {
            continue;
        }

        // check for new incoming tcp connection
        if (FD_ISSET(tcp_socket, &fds)) {
            int fd = accept(tcp_socket, NULL,0);
            if (fd == -1) continue;
        
            // use a thread per connection. This allows for sending MAVLink messages
            // via mavlink_fc_send() from connections
            pthread_t thread_id;
            pthread_attr_t thread_attr;

            pthread_attr_init(&thread_attr);
            pthread_attr_setdetachstate(&thread_attr, 0);
            pthread_create(&thread_id, &thread_attr, web_server_connection_process, (void*)(intptr_t)fd);
            pthread_attr_destroy(&thread_attr);
        }

        // check for incoming UDP packet
        if (FD_ISSET(udp_socket, &fds)) {
            // we have data pending
            uint8_t buf[300];
            ssize_t nread = read(udp_socket, buf, sizeof(buf));
            if (nread > 0) {
                // send the data straight to the flight controller
                write(mavlink_fd, buf, nread);
            }
        }

        // check for incoming bytes from flight controller
        if (FD_ISSET(mavlink_fd, &fds)) {
            uint8_t buf[200];
            ssize_t nread = read(mavlink_fd, buf, sizeof(buf));
            if (nread <= 0) {
                printf("Read error from flight controller\n");
                // we should re-open serial port
                exit(1);
            }
            mavlink_message_t msg;
            mavlink_status_t status;
            for (uint16_t i=0; i<nread; i++) {
                if (mavlink_parse_char(MAVLINK_COMM_FC, buf[i], &msg, &status)) {
                    if (!mavlink_handle_msg(&msg)) {
                        // forward to network connection as a udp broadcast packet
                        mavlink_broadcast(udp_socket, &msg);
                    }
                }
            }
        }
    }
}

/*
  open MAVLink serial port
 */
static int mavlink_serial_open(const char *path, unsigned baudrate)
{
    int fd = open(path, O_RDWR);
    if (fd == -1) {
        perror(path);
        return -1;
    }

    struct termios t;
    memset(&t, 0, sizeof(t));

    tcgetattr(fd, &t);
    
    cfsetspeed(&t, baudrate);

    t.c_iflag &= ~(BRKINT | ICRNL | IMAXBEL | IXON | IXOFF);
    t.c_oflag &= ~(OPOST | ONLCR);
    t.c_lflag &= ~(ISIG | ICANON | IEXTEN | ECHO | ECHOE | ECHOK | ECHOCTL | ECHOKE);
    t.c_cc[VMIN] = 0;
    t.c_cflag &= ~CRTSCTS;

    tcsetattr(fd, TCSANOW, &t);

    return fd;
}

/*
  open a TCP listening socket
 */
static int tcp_open(unsigned port)
{
    struct sockaddr_in sock;
    int listen_sock;
    int one=1;
    
    memset((char *)&sock, 0, sizeof(sock));
    sock.sin_port = htons(port);
    sock.sin_family = AF_INET;
    listen_sock = socket(AF_INET, SOCK_STREAM, 0);

    setsockopt(listen_sock, SOL_SOCKET,SO_REUSEADDR,(char *)&one,sizeof(one));

    if (bind(listen_sock, (struct sockaddr * ) &sock,sizeof(sock)) != 0) {
        close(listen_sock);
        return -1;
    }

    if (listen(listen_sock, 10) != 0) {
        close(listen_sock);
        return -1;        
    }

    return listen_sock;
}


/*
  open a UDP socket 

  We will listen on a emphemeral port, and send to the broadcast
  address
 */
static int udp_open(void)
{
    struct sockaddr_in sock;
    int res;
    int one=1;
    
    memset(&sock,0,sizeof(sock));

    sock.sin_port = 0;
    sock.sin_family = AF_INET;

    res = socket(AF_INET, SOCK_DGRAM, 0);
    if (res == -1) { 
        return -1;
    }

    setsockopt(res,SOL_SOCKET,SO_REUSEADDR,(char *)&one,sizeof(one));
    setsockopt(res,SOL_SOCKET,SO_BROADCAST,(char *)&one,sizeof(one));

    if (bind(res, (struct sockaddr *)&sock, sizeof(sock)) < 0) { 
        return(-1); 
    }

    return res;
}

/* main program, start listening and answering queries */
int main(int argc, char *argv[])
{
    int port = 80;
    extern char *optarg;
    int opt;
    const char *serial_port = NULL;
    unsigned baudrate = 57600;
    const char *usage = "Usage: web_server -p port -b baudrate -s serial_port -d debug_level";
    
    while ((opt=getopt(argc, argv, "p:s:b:hd:")) != -1) {
        switch (opt) {
        case 'p':
            port = atoi(optarg);
            break;
        case 's':
            serial_port = optarg;
            break;
        case 'b':
            baudrate = atoi(optarg);
            break;
        case 'd':
            web_server_set_debug(atoi(optarg));
            break;
        case 'h':
        default:
            printf("%s\n", usage);
            exit(1);
            break;
        }
    }

    pthread_mutex_init(&lock, NULL);
    
    if (!serial_port) {
        printf("You must supply a serial port with the -s option\n");
        exit(1);
    }

    mavlink_fd = mavlink_serial_open(serial_port, baudrate);
    if (mavlink_fd == -1) {
        printf("Failed to open mavlink serial port %s\n", serial_port);
        exit(1);
    }

    int udp_socket = udp_open();
    if (udp_socket == -1) {
        printf("Failed to open UDP socket\n");
        exit(1);
    }

    int tcp_socket = tcp_open(port);
    if (tcp_socket == -1) {
        printf("Failed to open TCP socket\n");
        exit(1);
    }
    
    select_loop(tcp_socket, udp_socket, mavlink_fd);
    
    return 0;
}


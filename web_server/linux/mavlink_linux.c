/*
  mavlink utility functions for web_server
 */

#include "../includes.h"

/*
  list of packet types received
 */
struct mavlink_packet {
    struct mavlink_packet *next;
    const char *name;
    mavlink_message_t msg;
    uint32_t receive_ms;
};


static struct mavlink_packet *mavlink_packets;

/*
  list of parameters received
 */
struct param_packet {
    struct param_packet *next;
    char name[17];
    float value;
};


// we have a param list per letter, to reduce list traversal cost
static struct param_packet *param_packets[26];
static uint32_t param_count;
static uint32_t param_expected_count;
static uint32_t param_last_value_sec;

/*
  list of command acks received
 */
struct mavlink_command_ack {
    struct mavlink_command_ack *next;
    uint32_t receive_ms;
    uint16_t command;
    uint8_t result;
};

static struct mavlink_command_ack *command_acks;

/*
  send a request to set stream rates
 */
static void send_stream_rates_request(uint8_t rate)
{
    mavlink_msg_request_data_stream_send(MAVLINK_COMM_FC,
                                         MAVLINK_TARGET_SYSTEM_ID,
                                         0,
                                         MAV_DATA_STREAM_ALL,
                                         rate, 1);
}
/*
  periodic mavlink tasks - run on each HEARTBEAT from fc
 */
static void mavlink_periodic(void)
{
    long long now = get_sys_seconds_boot();
    static long long last_send_stream;
    static long long last_heartbeat;
    
    if (now - last_send_stream > 15) {
        send_stream_rates_request(4);
        last_send_stream = now;
    }
    if (now - last_heartbeat > 10 || last_heartbeat == 0) {
        console_printf("heartbeat ok\n");
    }

    if (param_count == 0 ||
        (param_expected_count > param_count &&
         get_sys_seconds_boot() - param_last_value_sec > 20)) {
        console_printf("requesting parameters param_count=%u param_expected_count=%u\n",
                       param_count, param_expected_count);
        mavlink_msg_param_request_list_send(MAVLINK_COMM_FC,
                                            MAVLINK_TARGET_SYSTEM_ID,
                                            0);
    }

    last_heartbeat = now;
}

extern const char *mavlink_message_name(const mavlink_message_t *msg);

/*
  save a param value
 */
static void param_save_packet(const mavlink_message_t *msg)
{
    mavlink_param_value_t param_pkt;
    mavlink_msg_param_value_decode(msg, &param_pkt);
    if (param_pkt.param_id[0] < 'A' || param_pkt.param_id[0] > 'Z') {
        // invalid name
        return;
    }
    struct param_packet *p0 = param_packets[param_pkt.param_id[0] - 'A'];
    struct param_packet *p;
    for (p=p0; p; p=p->next) {
        if (strncmp(p->name, param_pkt.param_id, 16) == 0) {
            p->value = param_pkt.param_value;
            param_last_value_sec = get_sys_seconds_boot();
            if (param_pkt.param_count < 30000 &&
                param_pkt.param_count > 0 &&
                param_pkt.param_count > param_expected_count) {
                param_expected_count = param_pkt.param_count-1;
            }
            return;
        }
    }
    p = talloc_size(NULL, sizeof(*p));
    if (p) {
        strncpy(p->name, param_pkt.param_id, 16);
        p->name[16] = 0;
        p->value = param_pkt.param_value;
        p->next = p0;
        param_packets[param_pkt.param_id[0] - 'A'] = p;
        param_count++;
        param_last_value_sec = get_sys_seconds_boot();
        if (param_pkt.param_count < 30000 &&
            param_pkt.param_count > 0 &&
            param_pkt.param_count > param_expected_count) {
            param_expected_count = param_pkt.param_count-1;
        }
    }
}

/*
  get a parameter value
 */
bool mavlink_param_get(const char *name, float *value)
{
    if (name[0] < 'A' || name[0] > 'Z') {
        return false;
    }
    struct param_packet *p0 = param_packets[name[0] - 'A'];
    struct param_packet *p;
    for (p=p0; p; p=p->next) {
        if (strcmp(p->name, name) == 0) {
            *value = p->value;
            return true;
        }
    }
    return false;
}

/*
  list all parameters as json
 */
void mavlink_param_list_json(struct sock_buf *sock, const char *prefix, bool *first)
{
    uint8_t c;
    uint8_t plen = strlen(prefix);
    
    for (c=0; c<26; c++) {
        struct param_packet *p0 = param_packets[c];
        struct param_packet *p;
        for (p=p0; p; p=p->next) {
            if (strncmp(p->name, prefix, plen) != 0) {
                continue;
            }
            char *vstr = print_printf(sock, "%f ", p->value);
            if (vstr == NULL) {
                continue;
            }
            // ensure it is null terminated
            vstr[talloc_get_size(vstr)-1] = 0;
            if (vstr[strlen(vstr)-1] == '.') {
                // can't have trailing . in javascript float for json
                vstr[strlen(vstr)-1] = 0;
            }
            if (!*first) {
                sock_printf(sock, ",\r\n");
            }
            *first = false;
            sock_printf(sock, "{ \"name\" : \"%s\", \"value\" : %s }",
                        p->name, vstr);
            talloc_free(vstr);
        }
    }
}

/*
  save last instance of each packet type
 */
static void mavlink_save_packet(const mavlink_message_t *msg)
{
    if (msg->msgid == MAVLINK_MSG_ID_PARAM_VALUE) {
        param_save_packet(msg);
    }
    struct mavlink_packet *p;
    for (p=mavlink_packets; p; p=p->next) {
        if (p->msg.msgid == msg->msgid) {
            memcpy(&p->msg, msg, sizeof(mavlink_message_t));
            p->receive_ms = get_time_boot_ms();
            return;
        }
    }
    p = talloc_size(NULL, sizeof(*p));
    if (p == NULL) {
        return;
    }
    p->next = mavlink_packets;
    p->name = mavlink_message_name(msg);
    memcpy(&p->msg, msg, sizeof(mavlink_message_t));
    p->receive_ms = get_time_boot_ms();
    mavlink_packets = p;
}


/*
  save last instance of each COMMAND_ACK
 */
static void command_ack_save(const mavlink_command_ack_t *m)
{
    struct mavlink_command_ack *p;
    for (p=command_acks; p; p=p->next) {
        if (p->command == m->command) {
            p->result = m->result;
            p->receive_ms = get_time_boot_ms();
            return;
        }
    }
    p = talloc(NULL, struct mavlink_command_ack);
    if (p) {
        p->next = command_acks;
        p->command = m->command;
        p->result = m->result;
        p->receive_ms = get_time_boot_ms();
        command_acks = p;
    }
}

/*
  give last command ack result as json
 */
bool command_ack_get(uint16_t command, uint8_t *result, uint32_t *receive_ms)
{
    struct mavlink_command_ack *p;
    for (p=command_acks; p; p=p->next) {
        if (p->command == command) {
            *result = p->result;
            *receive_ms = p->receive_ms;
            return true;
        }
    }
    return false;
}

/*
  get last message of a specified type
 */
const mavlink_message_t *mavlink_get_message_by_msgid(uint32_t msgid, uint32_t *receive_ms)
{
    struct mavlink_packet *p;
    for (p=mavlink_packets; p; p=p->next) {
        if (p->msg.msgid == msgid) {
            *receive_ms = p->receive_ms;
            return &p->msg;
        }
    }
    return NULL;
}

/*
  get last message of a specified type
 */
const mavlink_message_t *mavlink_get_message_by_name(const char *name, uint32_t *receive_ms)
{
    struct mavlink_packet *p;
    for (p=mavlink_packets; p; p=p->next) {
        if (p->name && strcmp(name, p->name) == 0) {
            *receive_ms = p->receive_ms;
            return &p->msg;
        }
    }
    return NULL;
}

/*
  get list of available mavlink packets as JSON
 */
void mavlink_message_list_json(struct sock_buf *sock)
{
    sock_printf(sock, "[");
    bool first = true;
    struct mavlink_packet *p;
    for (p=mavlink_packets; p; p=p->next) {
        sock_printf(sock, "%s\"%s\"", first?"":", ", p->name);
        first = false;
    }
    sock_printf(sock, "]");
}

/*
 * handle an (as yet undecoded) mavlink message
 */
bool mavlink_handle_msg(const mavlink_message_t *msg)
{
    mavlink_save_packet(msg);
    
    switch(msg->msgid) {
        /*
          special handling for some messages
         */
    case MAVLINK_MSG_ID_HEARTBEAT: {
	mavlink_heartbeat_t m;
	mavlink_msg_heartbeat_decode(msg, &m);
        mavlink_periodic();
        break;
    }

    case MAVLINK_MSG_ID_COMMAND_ACK: {
	mavlink_command_ack_t m;
	mavlink_msg_command_ack_decode(msg, &m);
        command_ack_save(&m);
        break;
    }
        
    default:
	break;
    }
    return false;
}


/*
  set a parameter
 */
void mavlink_param_set(const char *name, float value)
{
    console_printf("Setting parameter %s to %f\n", name, value);
    mavlink_msg_param_set_send(MAVLINK_COMM_FC, MAVLINK_TARGET_SYSTEM_ID, 0, name, value, 0);
}

/*
  convert mavlink messages to JSON
 */

#define MAVLINK_USE_MESSAGE_INFO
#include "includes.h"
#include "web_server.h"
#include "mavlink_core.h"
#include "mavlink_json.h"

static void print_one_field(struct sock_buf *sock, const mavlink_message_t *msg, const mavlink_field_info_t *f, int idx)
{
//#define PRINT_FORMAT(f, def) (f->print_format?f->print_format:def)
#define PRINT_FORMAT(f, def) (def)
    switch (f->type) {
    case MAVLINK_TYPE_CHAR:
        sock_printf(sock, PRINT_FORMAT(f, "%c"), _MAV_RETURN_char(msg, f->wire_offset+idx*1));
        break;
    case MAVLINK_TYPE_UINT8_T:
        sock_printf(sock, PRINT_FORMAT(f, "%u"), _MAV_RETURN_uint8_t(msg, f->wire_offset+idx*1));
        break;
    case MAVLINK_TYPE_INT8_T:
        sock_printf(sock, PRINT_FORMAT(f, "%d"), _MAV_RETURN_int8_t(msg, f->wire_offset+idx*1));
        break;
    case MAVLINK_TYPE_UINT16_T:
        sock_printf(sock, PRINT_FORMAT(f, "%u"), _MAV_RETURN_uint16_t(msg, f->wire_offset+idx*2));
        break;
    case MAVLINK_TYPE_INT16_T:
        sock_printf(sock, PRINT_FORMAT(f, "%d"), _MAV_RETURN_int16_t(msg, f->wire_offset+idx*2));
        break;
    case MAVLINK_TYPE_UINT32_T:
        sock_printf(sock, PRINT_FORMAT(f, "%lu"), (unsigned long)_MAV_RETURN_uint32_t(msg, f->wire_offset+idx*4));
        break;
    case MAVLINK_TYPE_INT32_T:
        sock_printf(sock, PRINT_FORMAT(f, "%ld"), (long)_MAV_RETURN_int32_t(msg, f->wire_offset+idx*4));
        break;
    case MAVLINK_TYPE_UINT64_T:
        sock_printf(sock, PRINT_FORMAT(f, "%llu"), (unsigned long long)_MAV_RETURN_uint64_t(msg, f->wire_offset+idx*8));
        break;
    case MAVLINK_TYPE_INT64_T:
        sock_printf(sock, PRINT_FORMAT(f, "%lld"), (long long)_MAV_RETURN_int64_t(msg, f->wire_offset+idx*8));
        break;
    case MAVLINK_TYPE_FLOAT:
        sock_printf(sock, PRINT_FORMAT(f, "%f"), (double)_MAV_RETURN_float(msg, f->wire_offset+idx*4));
        break;
    case MAVLINK_TYPE_DOUBLE:
        sock_printf(sock, PRINT_FORMAT(f, "%f"), _MAV_RETURN_double(msg, f->wire_offset+idx*8));
        break;
    }
}

static void print_field(struct sock_buf *sock, const mavlink_message_t *msg, const mavlink_field_info_t *f)
{
    sock_printf(sock, "\"%s\": ", f->name);
    if (f->array_length == 0) {
        print_one_field(sock, msg, f, 0);
        sock_printf(sock, " ");
    } else {
        unsigned i;
        /* print an array */
        if (f->type == MAVLINK_TYPE_CHAR) {
            char *str = talloc_strndup(sock, f->wire_offset+(const char *)_MAV_PAYLOAD(msg), f->array_length);
            sock_printf(sock, "\"%s\"", str);
            talloc_free(str);
        } else {
            sock_printf(sock, "[ ");
            for (i=0; i<f->array_length; i++) {
                print_one_field(sock, msg, f, i);
                if (i < f->array_length-1) {
                    sock_printf(sock, ", ");
                }
            }
            sock_printf(sock, "]");
        }
    }
    sock_printf(sock, " ");
}

/*
  print a JSON string for a message to the given socket
*/
bool mavlink_json_message(struct sock_buf *sock, const mavlink_message_t *msg, uint32_t receive_ms)
{
    const mavlink_message_info_t *m = mavlink_get_message_info(msg);
    if (m == NULL) {
        return false;
    }
    const mavlink_field_info_t *f = m->fields;
    unsigned i;
    sock_printf(sock, "\"%s\" : { ", m->name);
    for (i=0; i<m->num_fields; i++) {
        print_field(sock, msg, &f[i]);
            sock_printf(sock, ",");
        }
    sock_printf(sock, "\"_seq\" : %u, ", msg->seq);
    sock_printf(sock, "\"_sysid\" : %u, ", msg->sysid);
    sock_printf(sock, "\"_compid\" : %u, ", msg->compid);
    sock_printf(sock, "\"_age\" : %u", get_time_boot_ms() - receive_ms);
    sock_printf(sock, "}");
    return true;
}

/*
  print a JSON string for a message to the given socket
*/
const char *mavlink_message_name(const mavlink_message_t *msg)
{
    const mavlink_message_info_t *m = mavlink_get_message_info(msg);
    if (m) {
        return m->name;
    }
    return NULL;
}

/*
  send a mavlink message using string arguments
 */
bool mavlink_message_send_args(int argc, char **argv)
{
    if (argc < 1) {
        return false;
    }
    const char *msg_name = argv[0];
    const mavlink_message_info_t *m = mavlink_get_message_info_by_name(msg_name);
    if (m == NULL) {
        console_printf("Invalid message '%s'\n", msg_name);
        return false;
    }
    if (argc > m->num_fields+1) {
        console_printf("Invalid number of fields %u for %s\n", argc-1, msg_name);
        return false;
    }

    // pack the message
    mavlink_message_t *msg = talloc_zero(NULL, mavlink_message_t);
    char *buf = _MAV_PAYLOAD_NON_CONST(msg);
    uint8_t i;
    
    msg->msgid = m->msgid;

    for (i=1; i<=argc; i++) {
        const mavlink_field_info_t *f = &m->fields[i-1];
        const char *arg = argv[i];
        if (arg == NULL) {
            continue;
        }

        switch (f->type) {
        case MAVLINK_TYPE_CHAR:
            if (f->array_length > 0) {
                _mav_put_char_array(buf, f->wire_offset, arg, f->array_length);
            } else {
                _mav_put_char(buf, f->wire_offset, arg[0]);
            }
            break;

        case MAVLINK_TYPE_UINT8_T:
            _mav_put_uint8_t(buf, f->wire_offset, strtoul(arg, NULL, 0));
            break;

        case MAVLINK_TYPE_UINT16_T:
            _mav_put_uint16_t(buf, f->wire_offset, strtoul(arg, NULL, 0));
            break;

        case MAVLINK_TYPE_UINT32_T:
            _mav_put_uint32_t(buf, f->wire_offset, strtoul(arg, NULL, 0));
            break;

        case MAVLINK_TYPE_UINT64_T:
            _mav_put_uint64_t(buf, f->wire_offset, strtoull(arg, NULL, 0));
            break;

        case MAVLINK_TYPE_INT8_T:
            _mav_put_int8_t(buf, f->wire_offset, strtol(arg, NULL, 0));
            break;

        case MAVLINK_TYPE_INT16_T:
            _mav_put_int16_t(buf, f->wire_offset, strtol(arg, NULL, 0));
            break;

        case MAVLINK_TYPE_INT32_T:
            _mav_put_int32_t(buf, f->wire_offset, strtol(arg, NULL, 0));
            break;

        case MAVLINK_TYPE_INT64_T:
            _mav_put_int64_t(buf, f->wire_offset, strtoll(arg, NULL, 0));
            break;

        case MAVLINK_TYPE_FLOAT:
            _mav_put_float(buf, f->wire_offset, atof(arg));
            break;

        case MAVLINK_TYPE_DOUBLE:
            _mav_put_double(buf, f->wire_offset, atof(arg));
            break;
        }
    }

    uint8_t msglen = 0;
    for (i=0; i<m->num_fields; i++) {
        const mavlink_field_info_t *f = &m->fields[i];
        uint8_t len = 0;
        switch (f->type) {
        case MAVLINK_TYPE_CHAR:
        case MAVLINK_TYPE_UINT8_T:
        case MAVLINK_TYPE_INT8_T:
            if (f->array_length > 0) {
                len = f->array_length;
            } else {
                len = 1;
            }
            break;

        case MAVLINK_TYPE_INT16_T:
        case MAVLINK_TYPE_UINT16_T:
            len = 2;
            break;

        case MAVLINK_TYPE_INT32_T:
        case MAVLINK_TYPE_UINT32_T:
            len = 4;
            break;

        case MAVLINK_TYPE_INT64_T:
        case MAVLINK_TYPE_UINT64_T:
            len = 8;
            break;

        case MAVLINK_TYPE_FLOAT:
            len = 4;
            break;

        case MAVLINK_TYPE_DOUBLE:
            len = 8;
            break;
        }
        if (len + f->wire_offset > msglen) {
            msglen = len + f->wire_offset;
        }
    }

    // send as MAVLink2
    extern void mavlink_set_proto_version(uint8_t chan, unsigned int version);
    extern uint8_t mavlink_get_crc_extra(const mavlink_message_t *msg);
    
    mavlink_set_proto_version(MAVLINK_COMM_FC, 2);
    
    mavlink_finalize_message_chan(msg, mavlink_system.sysid, mavlink_system.compid,
                                  MAVLINK_COMM_FC,
                                  msglen, msglen,
                                  mavlink_get_crc_extra(msg));

    mavlink_fc_send(msg);
    
    return true;
}



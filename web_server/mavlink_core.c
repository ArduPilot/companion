/*
  core mavlink functions. This file includes mavlink_helpers.h,
  providing the core mavlink functions used by other modules
*/
#include "mavlink_core.h"
#include "web_server.h"

mavlink_system_t mavlink_system = {MAVLINK_SYSTEM_ID,MAVLINK_COMPONENT_ID_REMOTE_LOG};

/*
  send a buffer out a MAVLink channel
 */
void comm_send_buffer(mavlink_channel_t chan, const uint8_t *buf, uint8_t len)
{
    switch (chan) {
    case MAVLINK_COMM_FC:
        mavlink_fc_write(buf, len);
        break;
    default:
        break;
    }
}

/*
  send one byte out a mavlink channel
 */
void comm_send_ch(mavlink_channel_t chan, uint8_t ch)
{
    comm_send_buffer(chan, &ch, 1);
}

#include "generated/mavlink/mavlink_helpers.h"

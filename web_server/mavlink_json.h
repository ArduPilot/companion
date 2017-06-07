#include "mavlink_core.h"

/*
  print a JSON string for a message to the given socket
*/
bool mavlink_json_message(struct sock_buf *sock, const mavlink_message_t *msg, uint32_t receive_ms);
const char *mavlink_message_name(const mavlink_message_t *msg);
bool mavlink_message_send_args(int argc, char **argv);

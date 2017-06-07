#pragma once

#include "../mavlink_core.h"

struct sock_buf;

const mavlink_message_t *mavlink_get_message_by_msgid(uint32_t msgid, uint32_t *receive_ms);
const mavlink_message_t *mavlink_get_message_by_name(const char *name, uint32_t *receive_ms);
void mavlink_message_list_json(struct sock_buf *sock);
bool command_ack_get(uint16_t command, uint8_t *result, uint32_t *receive_ms);
void mavlink_param_set(const char *name, float value);
bool mavlink_param_get(const char *name, float *value);
void mavlink_param_list_json(struct sock_buf *sock, const char *prefix, bool *first);
void mavlink_fc_send(mavlink_message_t *msg);
bool mavlink_handle_msg(const mavlink_message_t *msg);


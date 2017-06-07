/*
  utility functions for Linux port
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

// get upload progress as a percentage
uint8_t get_upload_progress(void);
const char *get_upload_message(void);

// get number of seconds since boot
long long get_sys_seconds_boot();

// get number of milliseconds since boot
uint32_t get_time_boot_ms();

void mdelay(uint32_t ms);

bool toggle_recording(void);
void reboot(void);


char *print_vprintf(void *ctx, const char *fmt, va_list ap);
void *print_printf(void *ctx, const char *fmt, ...);

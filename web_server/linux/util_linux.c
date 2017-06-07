/*
  support functions when running on Linux. Many of these are stubs for now
 */
#include "../includes.h"


/*
 get upload progress as a percentage
*/
uint8_t get_upload_progress(void)
{
    return 0;
}

/*
 get upload progress message
*/
const char *get_upload_message(void)
{
    return "";
}

static struct {
    bool initialised;
    struct timeval tv;
} system_time;

// get number of seconds since boot
long long get_sys_seconds_boot()
{
    if (!system_time.initialised) {
        gettimeofday(&system_time.tv,NULL);
    }
    struct timeval tv;
    gettimeofday(&tv,NULL);
    return tv.tv_sec - system_time.tv.tv_sec;
}

// get number of milliseconds since boot
uint32_t get_time_boot_ms()
{
    if (!system_time.initialised) {
        gettimeofday(&system_time.tv,NULL);
        system_time.initialised = true;
    }
    struct timeval tv;
    gettimeofday(&tv,NULL);
    return (tv.tv_sec - system_time.tv.tv_sec) * 1000U + (tv.tv_usec - system_time.tv.tv_usec) / 1000U;
}

void mdelay(uint32_t ms)
{
    uint32_t start = get_time_boot_ms();
    while (get_time_boot_ms() - start < ms) {
        struct timeval tv;
        tv.tv_sec = 0;
        tv.tv_usec = 1000;
        select(0,NULL,NULL, NULL, &tv);
    }
}

bool toggle_recording(void)
{
    printf("toggle_recording not implemented\n");
    return false;
}

void reboot(void)
{
    printf("reboot not implemented\n");
}


/* compatibility with the sonix */
char *print_vprintf(void *ctx, const char *fmt, va_list ap)
{
    char *ret = talloc_vasprintf(ctx, fmt, ap);
    if (ret) {
        size_t size = talloc_get_size(ret);
        if (size > 0 && ret[size-1]==0) {
            ret = talloc_realloc_size(ctx, ret, size-1);
        }
    }
    return ret;
}

void *print_printf(void *ctx, const char *fmt, ...)
{
    va_list ap;
    va_start(ap, fmt);
    void *ret = print_vprintf(ctx, fmt, ap);
    va_end(ap);
    return ret;
}

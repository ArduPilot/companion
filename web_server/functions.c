/*
  server side functions for web server.
 */

#include "includes.h"
#include "template.h"
#include "functions.h"
#include "mavlink_json.h"
#include "mavlink_core.h"
#include "cgi.h"

#ifdef SYSTEM_FREERTOS
/*
  get uptime in seconds
 */
static void uptime(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    sock_printf(tmpl->sock, "%u", (unsigned)get_sys_seconds_boot());
}

/*
  get FC mavlink packet count
 */
static void fc_mavlink_count(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    sock_printf(tmpl->sock, "%u", mavlink_fc_pkt_count());
}

/*
  get FC mavlink baudrate
 */
static void fc_mavlink_baudrate(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    sock_printf(tmpl->sock, "%u", uart2_get_baudrate());
}

/*
  get free kernel memory, with selection of memory type
 */
static void mem_free(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    int mem_type = argc>0?atoi(argv[0]):1;
    sock_printf(tmpl->sock, "%u", xPortGetFreeHeapSize(mem_type));
}
#endif

/*
  get upload progress
 */
static void upload_progress(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    sock_printf(tmpl->sock, "%u", get_upload_progress());
}

/*
  get upload message
 */
static void upload_message(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    sock_printf(tmpl->sock, "%s", get_upload_message());
}

/*
  toggle video recording
 */
static void toggle_video(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    sock_printf(tmpl->sock, "%s", toggle_recording()?"Started recording":"Stopped recording");
}


/*
  mavlink message as JSON
 */
static void mavlink_message(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    uint16_t i;
    bool need_comma = false;
    sock_printf(tmpl->sock, "{\n");
    for (i=0; i<argc; i++) {
        const char *name = argv[i];
        const mavlink_message_t *msg;
        uint32_t receive_ms=0;
        if (isdigit(*name)) {
            msg = mavlink_get_message_by_msgid(atoi(name), &receive_ms);
        } else {
            msg = mavlink_get_message_by_name(name, &receive_ms);
        }
        if (msg != NULL) {
            if (need_comma) {
                sock_printf(tmpl->sock, ",\r\n");
            }
            mavlink_json_message(tmpl->sock, msg, receive_ms);
            need_comma = true;
        }
    }
    sock_printf(tmpl->sock, "}");
}

/*
  list of mavlink messages
 */
static void mavlink_message_list(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    mavlink_message_list_json(tmpl->sock);
}

#ifdef SYSTEM_FREERTOS
// a queue between camera callback and snapshot() function
static QueueHandle_t picture_queue;

/*
  get one picture
 */
static void snapshot_get_pic(unsigned char *pPic, unsigned int size, const char *name, enum RECORDKIND type)
{
    uint8_t *picture = talloc_memdup(NULL, pPic, size);
    if (picture && xQueueSend(picture_queue, (void*)&picture, 0) != pdTRUE) {
        talloc_free(picture);
    }
}

/*
  return snapshot jpeg
 */
static void snapshot(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    if (!picture_queue) {
        picture_queue = xQueueCreate(1, sizeof(uint8_t *));
    }

    // hijack the snapshot callback for one image
    mj_notice_t old_cb = mf_video_get_snapshot_cb();    
    mf_video_set_snapshot_cb(snapshot_get_pic);

    // trigger snapshot
    set_takepic_num(1);
    mf_set_snapshot(1);

    uint8_t *picture = NULL;
    xQueueReceive(picture_queue, &picture, 200/portTICK_PERIOD_MS);

    // restore callback
    if (old_cb != snapshot_get_pic) {
        mf_video_set_snapshot_cb(old_cb);
    }

    mf_set_snapshot(0);
    
    if (picture) {
        sock_write(tmpl->sock, (const char *)picture, talloc_get_size(picture));
        talloc_free(picture);
    } else {
        console_printf("no jpeg\n");
    }
}


// note the stream we're using so we can auto-close on new connection
static struct sock_buf *mpeg_stream_sock;

/*
  return mjpeg video
 */
static void mjpg_video(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    const char *CGI_frame_rate = tmpl->get(tmpl, "CGI_frame_rate");
    uint8_t frame_rate = 0;
    if (CGI_frame_rate) {
        // optional frame rate
        frame_rate = atoi(CGI_frame_rate);
    }

    if (!picture_queue) {
        picture_queue = xQueueCreate(1, sizeof(uint8_t *));
    }

    mpeg_stream_sock = tmpl->sock;
    
    // hijack the snapshot callback
    mj_notice_t old_cb = mf_video_get_snapshot_cb();    
    mf_video_set_snapshot_cb(snapshot_get_pic);

    // trigger snapshot
    set_takepic_num(1);
    mf_set_snapshot(1);

    console_printf("Starting mjpg stream on fd %d\n", tmpl->sock->fd);

    TickType_t last_frame_iicks = 0;

    while (tmpl->sock == mpeg_stream_sock) {
        uint8_t *picture = NULL;
        xQueueReceive(picture_queue, &picture, 200/portTICK_PERIOD_MS);

        if (picture && frame_rate > 0) {
            TickType_t now = xTaskGetTickCount();
            uint32_t diff_ms = (now - last_frame_iicks) / portTICK_PERIOD_MS;
            uint32_t rate_ms = 1000 / frame_rate;
            if (diff_ms < rate_ms) {
                talloc_free(picture);
                set_takepic_num(1);
                mf_set_snapshot(1);
                continue;
            }
            last_frame_iicks = now;
        }

        
        if (picture) {
            uint32_t size = talloc_get_size(picture);
            sock_printf(tmpl->sock, "--mjpgboundary\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n", size);
            size_t written = sock_write(tmpl->sock, (const char *)picture, size);
            talloc_free(picture);
            if (written != size) {
                break;
            }
            sock_printf(tmpl->sock, "\r\n");
        }
        // trigger more frames
        set_takepic_num(1);
        mf_set_snapshot(1);
    }

    console_printf("Stopping mjpg stream on fd %d\n", tmpl->sock->fd);
    
    set_takepic_num(1);
    mf_set_snapshot(0);

    // restore callback
    if (tmpl->sock == mpeg_stream_sock && old_cb != snapshot_get_pic) {
        mf_video_set_snapshot_cb(old_cb);
    }
}

/*
  take a picture
 */
static void take_picture(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    console_printf("take_picture\n");
    set_takepic_num(1);
    mf_set_snapshot(1);
}
#endif // SYSTEM_FREERTOS

/*
  process C calls from commandN variables
 */
static void process_c_calls(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    char cmd[] = "CGI_commandN";
    uint8_t i;
    for (i=1; i<10; i++) {
        cmd[strlen(cmd)-1] = '0' + i;
        const char *command = tmpl->get(tmpl, cmd);
        if (!command) {
            break;
        }
        web_debug(2, "process_c_call(%s)\n", command);
        tmpl->process_c_call(tmpl, command);
    }
}

/*
  process content variable as input to template parser
 */
static void process_content(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    const char *content = tmpl->get(tmpl, "CGI_content");
    if (content) {
        web_debug(2, "process_content: '%s' %u\n", content, strlen(content));
        tmpl->process_content(tmpl, content, strlen(content));
    }
}


/*
  send a mavlink message
 */
static void mavlink_message_send(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    const char *command_ack = tmpl->get(tmpl, "CGI_command_ack");
    const char *command_timeout = tmpl->get(tmpl, "CGI_command_ack_timeout");
    uint32_t ack_timestamp = 0;
    uint8_t result = 0;
    uint16_t command = 0;
    if (command_ack) {
        command = atoi(command_ack);
        command_ack_get(command, &result, &ack_timestamp);
    }
    // send the message
    mavlink_message_send_args(argc, argv);
    if (!command_ack) {
        // no ack to wait for
        return;
    }
    /*
      wait for an acknowledgement
     */
    uint32_t timeout = 2000;
    if (command_timeout) {
        timeout = atoi(command_timeout);
    }
    uint32_t start = get_time_boot_ms();
    while (get_time_boot_ms() - start < timeout) {
        uint32_t timestamp = 0;
        if (command_ack_get(command, &result, &timestamp) && timestamp != ack_timestamp) {
            sock_printf(tmpl->sock, "%u", result);
            return;
        }
        mdelay(100);
    }
    sock_printf(tmpl->sock, "-1");
}

/*
  reboot video board
 */
static void reboot_companion(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    console_printf("rebooting ...\n");
    reboot();    
}

extern void snx_nvram_bootup_upgrade(void);

/*
  factory reset of companion computer
 */
static void factory_reset(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    console_printf("resetting to factory defaults\n");
    sock_printf(tmpl->sock, "resetting to factory defaults");
    mavlink_param_set("SYSID_SW_MREV", 0);
#ifdef SYSTEM_FREERTOS
    snx_nvram_reset_to_default(NVRAM_RTD_ALL, NULL, NULL);    
    snx_nvram_init();
    snx_nvram_bootup_upgrade();
#endif
}

/*
  format microSD
 */
static void format_storage(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
#ifdef SYSTEM_FREERTOS
    if (f_mkfs("0:", 1, 0) == FR_OK) {
        sock_printf(tmpl->sock, "Format success");
    } else {
        sock_printf(tmpl->sock, "Format failed");
    }
#endif
}


#ifdef SYSTEM_FREERTOS
/*
  validate auth settings for wifi
  return error-string on error. Return NULL if OK
 */
static const char *validate_ssid_password(const char *ssid,
                                          const char *password,
                                          enc_auth_t auth_mode,
                                          int channel)
{
    if (channel < 1 || channel > 14) {
        return "Invalid WiFi channel";
    }
    switch (auth_mode) {
    case AUTH_NONE:
        // always accept
        return NULL;
    case AUTH_WEP:
        // must be 5 char password
        if (strlen(password) != 5) {
            return "WEP password must be exactly 5 characters long";
        }
        return NULL;
    case AUTH_WPA:
    case AUTH_WPA2:
        // must be at least 8 char password
        if (strlen(password) < 8) {
            return "WEP password must be at least 8 characters long";
        }
        return NULL;
    default:
        break;
    }
    return "Invalid auth mode";
}

/*
  set ssid and password
 */
static void set_ssid(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    if (argc < 4) {
        return;
    }
    const char *ssid = argv[0];
    const char *password = argv[1];
    const char *authtype = argv[2];
    const char *channel = argv[3];
    if (!ssid || !password || !authtype || !channel) {
        sock_printf(tmpl->sock, "invalid SSID or password\n");
    }

    int auth_mode = atoi(authtype);
    int ap_channel = atoi(channel);
    
    const char *ret = validate_ssid_password(ssid, password, auth_mode, ap_channel);
    if (ret) {
        // invalid input
        sock_printf(tmpl->sock, ret);
        return;
    }
    
    console_printf("Setting SSID='%s' password='%s' authtype=%s channel=%u\n", ssid, password, authtype, ap_channel);

    snx_nvram_integer_set("WIFI_DEV", "AP_AUTH_MODE", auth_mode);
    snx_nvram_integer_set("WIFI_DEV", "AP_CHANNEL_INFO", ap_channel);
    snx_nvram_string_set("WIFI_DEV", "AP_SSID_INFO", ssid);
    snx_nvram_string_set("WIFI_DEV", "AP_KEY_INFO", password);

    sock_printf(tmpl->sock, "Set SSID and password");
}

/*
  get ssid and password
 */
static void get_ssid(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    char ssid[50]="", pass[50]="";
    int mode=0, channel=0;
    
    snx_nvram_string_get("WIFI_DEV", "AP_SSID_INFO", ssid);
    snx_nvram_integer_get("WIFI_DEV", "AP_AUTH_MODE", &mode);
    snx_nvram_integer_get("WIFI_DEV", "AP_CHANNEL_INFO", &channel);
    snx_nvram_string_get("WIFI_DEV", "AP_KEY_INFO", pass);

    sock_printf(tmpl->sock, "{ \"ssid\": \"%s\", \"password\" : \"%s\", \"channel\" : %d, \"authmode\" : %d }",
                ssid, pass, channel, mode);
}

/*
  handle sonix fw update
 */
static void handle_sonix_upgrade(struct template_state *tmpl, const char *filename, const char *filedata, uint32_t size)
{
    set_upload_message("checking firmware MD5");
    set_upload_progress(1);
    if (check_fw_md5((const unsigned char *)filedata, size)) {
        set_upload_message("Good MD5 on image - upgrading. Please reconnect WiFi in 30 seconds");
        set_upload_progress(100);
        // give time for UI to update
        mdelay(3000);
        fw_upgrade(__DECONST(char*,filedata), size);
        set_upload_message("rebooting");
    } else {
        set_upload_message("Bad MD5 on image");
    }
}

/*
  handle ardupilot fw update
 */
static void handle_ardupilot_upgrade(struct template_state *tmpl, const char *filename, const char *filedata, uint32_t size)
{
    console_printf("ardupilot_upgrade: size=%u\n", size);
    set_upload_message("checking firmware MD5");
    set_upload_progress(1);
    uint32_t fw_offset;
    if (check_fc_fw_md5(__DECONST(uint8_t*,filedata), size, &fw_offset)) {
        set_upload_message("Good MD5 on image - starting upgrade");
        upgrade_fc_firmware(__DECONST(uint8_t*,filedata), size, fw_offset);
    } else {
        set_upload_message("Bad MD5 on image");
    }
}

/*
  handle TX fw update
 */
static void handle_tx_upgrade(struct template_state *tmpl, const char *filename, const char *filedata, uint32_t size)
{
    console_printf("tx_upgrade: size=%u\n", size);
    set_upload_message("TX update transfer started");
    set_upload_progress(1);
    tx_upgrade((uint8_t*)filedata, size);
}

/*
  handle file upload
 */
static void handle_file_upload(struct template_state *tmpl, const char *filename, const char *filedata, uint32_t size)
{
    console_printf("file_upload: size=%u filename='%s'\n", size, filename);
    const char *result;

    FIL fh;
    
    if (f_open(&fh, filename, FA_WRITE | FA_CREATE_ALWAYS) == FR_OK) {
        unsigned written=0;
        if (f_write(&fh, filedata, size, &written) == FR_OK && written==size) {
            result = "file uploaded OK";
        } else {
            result = "file write failed";
        }
        f_close(&fh);
    } else {
        result = "failed to open file";
    }
}


/*
  file upload and firmware upgrade
 */
static void file_upload(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    struct cgi_state *cgi = talloc_find_parent_byname(tmpl, "struct cgi_state");
    if (!cgi) {
        console_printf("Unable to get cgi state\n");
        return;
    }
    const char *uploadtype = cgi->get(cgi, "uploadtype");
    if (!uploadtype) {
        console_printf("no uploadtype variable\n");
        return;
    }
    const char *filename = cgi->get(cgi, "file");
    uint32_t size = 0;
    const char *filedata = cgi->get_content(cgi, "file", &size);
    const char *fs_filename = cgi->get(cgi, "FILENAME");

    console_printf("file_upload: uploadtype=%s filename=%s size=%u\n", uploadtype, filename, size);
    
    if (strcmp(uploadtype, "ArduPilot") == 0) {
        handle_ardupilot_upgrade(tmpl, filename, filedata, size);
    } else if (strcmp(uploadtype, "TX") == 0) {
        handle_tx_upgrade(tmpl, filename, filedata, size);
    } else if (strcmp(uploadtype, "sonix") == 0) {
        handle_sonix_upgrade(tmpl, filename, filedata, size);
    } else if (strcmp(uploadtype, "fs") == 0) {
        handle_file_upload(tmpl, fs_filename, filedata, size);
    } else {
        console_printf("Invalid file upload\n");
    }
}

/*
  return sonix version
 */
static void sonix_version(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    sock_printf(tmpl->sock, "{ \"sonix_build_date\" : \"%s\", \"sonix_git_revision\" : \"%s\" }",
                SONIX_BUILD_DATE, SONIX_GIT_REVISION);
}


/*
  unlink files
 */
static void file_unlink(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    uint32_t i;
    uint8_t ret = 0;
    for (i=0;i<argc;i++) {
        const char *fname = argv[i];
        console_printf("Removing %s\n", fname);
        if (f_unlink(fname) != FR_OK) {
            ret = 1;
        }
    }
    sock_printf(tmpl->sock, "%u", ret);
}

/*
  mkdir
 */
static void file_mkdir(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    uint8_t ret = 0;
    if (argc > 0) {
        const char *fname = argv[0];
        console_printf("mkdir %s\n", fname);
        if (f_mkdir(fname) != FR_OK) {
            ret = 1;
        }
    }
    sock_printf(tmpl->sock, "%u", ret);
}

/*
  rename
 */
static void file_rename(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    uint8_t ret = 0;
    if (argc > 1) {
        const char *fname1 = argv[0];
        const char *fname2 = argv[1];
        console_printf("rename %s %s\n", fname1, fname2);
        if (f_rename(fname1, fname2) != FR_OK) {
            ret = 1;
        }
    }
    sock_printf(tmpl->sock, "%u", ret);
}

/*
  list directory
 */
static void file_listdir(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    if (argc < 1) {
        return;
    }
    const char *dirname = argv[0];
    FRESULT ret;
    DIR dir;
    
    if ((ret = f_opendir(&dir, dirname)) != FR_OK) {
        console_printf("Failed to open directory %s\n", dirname);
        return;
    }

    sock_printf(tmpl->sock, "[ ");
    
    FILLIST ff = {};
    ff.finfo.lfname = ff.lfname;
    ff.finfo.lfsize = sizeof(ff.lfname);

    bool first = true;
    while ((ret = f_readdir(&dir, &ff.finfo)) == FR_OK) {
        if (strcmp(ff.finfo.fname, ".") == 0) {
            continue;
        }
        if (ff.finfo.fname[0] == 0) {
            break;
        }
        const char *fname = GET_FN(ff.finfo);
        sock_printf(tmpl->sock, "%s{ \"type\" : %u, \"name\" : \"%s\", \"date\" : \"%04u-%02u-%02u %02u:%02u:%02u\", \"size\" : %u }",
                    first?"":",\n",
                    (ff.finfo.fattrib&AM_DIR)?1:0,
                    fname,
                    FF_YEAR(ff.finfo.fdate), FF_MONTH(ff.finfo.fdate), FF_DATE(ff.finfo.fdate),
                    FF_HOUR(ff.finfo.ftime), FF_MINUTE(ff.finfo.ftime), FF_SECOND(ff.finfo.ftime),
                    (unsigned)ff.finfo.fsize);
        first = false;
    }
    sock_printf(tmpl->sock, "]");
    f_closedir(&dir);
}


/*
  get disk information
 */
static void disk_info(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    FATFS *fs = NULL;
    unsigned long free_clusters = 0, total_clusters = 0, cluster_size = 0;
    char label[100] = "";
    DWORD serial = 0;
    
    f_getlabel("0:", label, &serial);
    
    /* Get volume information and free clusters of drive 1 */
    FRESULT ret = f_getfree("0:", &free_clusters, &fs);
    if (ret == FR_OK) {
        total_clusters = (fs->n_fatent - 2);
        cluster_size = fs->csize;
    }
    sock_printf(tmpl->sock, "{ \"label\" : \"%s\", \"serial\" : %u, \"total_clusters\" : %u, \"free_clusters\" : %u, \"cluster_size\" : %u}",
                label, (unsigned)serial, (unsigned)total_clusters, (unsigned)free_clusters, (unsigned)(cluster_size*512));
}

/*
  set the UTC time
 */
static void set_time_utc(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    if (argc > 0) {
        uint32_t utc_seconds = simple_strtoul(argv[0], NULL, 10);
        set_date_utc(utc_seconds);
    }
    if (argc > 1) {
        uint32_t tz_seconds = simple_strtoul(argv[1], NULL, 10);
        set_tz_offset(tz_seconds);
    }
    ublox_set_time(get_sys_seconds_utc());
}
#endif // SYSTEM_FREERTOS


/*
  get one parameter value
 */
static void get_param(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    if (argc > 0) {
        float value;
        if (mavlink_param_get(argv[0], &value)) {
            sock_printf(tmpl->sock, "%f", value);
        }
    }
}

/*
  get parameter list
 */
static void get_param_list(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    bool first = true;
    uint16_t i;
    sock_printf(tmpl->sock, "[ ");
    if (argc == 0) {
        mavlink_param_list_json(tmpl->sock, "", &first);
    } else {
        for (i=0; i<argc; i++) {
            mavlink_param_list_json(tmpl->sock, argv[i], &first);
        }
    }
    sock_printf(tmpl->sock, "]");
}

#if SYSTEM_FREERTOS
/*
  get ublox MGA status
 */
static void mga_status(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    ublox_send_status_json(tmpl->sock);
}


/*
  upload MGA data to cache
 */
static void mga_upload(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    struct cgi_state *cgi = talloc_find_parent_byname(tmpl, "struct cgi_state");
    if (!cgi) {
        console_printf("Unable to get cgi state\n");
        return;
    }
    unsigned size = 0;
    const char *mga_data = cgi->get_content(cgi, "mga_data", &size);
    const char *cgi_lat = tmpl->get(tmpl, "CGI_latitude");
    const char *cgi_lon = tmpl->get(tmpl, "CGI_longitude");
    const char *cgi_alt = tmpl->get(tmpl, "CGI_altitude");
    const char *cgi_time = tmpl->get(tmpl, "CGI_utc_time");
    struct mga_position pos = {};

    if (cgi_lat) {
        pos.latitude = atoi(cgi_lat);
    }
    if (cgi_lon) {
        pos.longitude = atoi(cgi_lon);
    }
    if (cgi_alt) {
        pos.altitude_cm = atoi(cgi_alt);
    }
    if (cgi_time) {
        pos.utc_time = atoi(cgi_time);
    }

    if ((pos.latitude != 0 || pos.longitude != 0) && pos.utc_time != 0) {
        ublox_set_position(&pos);
    }
    
    console_printf("got MGA data of size %u\n", size);
    if (size > 0) {
        handle_ublox_data((const uint8_t *)mga_data, size);
    }
}


/*
  list all nvram packs as JSON array
 */
static void nvram_pack_list(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    nvram_pkg_name_info_t *pkg_name_info = NULL;
    int pkg_cnt = snx_nvram_get_all_pkg_count();
    bool first = true;
    
    sock_printf(tmpl->sock, "[");
    
    if (pkg_cnt < 0) {
        goto end;
    }
    
    pkg_name_info = talloc_zero_array(tmpl, nvram_pkg_name_info_t, pkg_cnt);
    if (pkg_name_info == NULL) {
        goto end;
    }
    snx_nvram_get_pkg_name_list(pkg_name_info);
    while (pkg_cnt--) {
        const char *pname = (pkg_name_info+pkg_cnt)->name;
        if (strcmp(pname, "Vdo_IQ") == 0) {
            // this would cause the Sonix to crash
            continue;
        }
        sock_printf(tmpl->sock, "%s\"%s\"", first?"":", ", pname);
        first = false;
    }
    
    talloc_free(pkg_name_info);
end:
    sock_printf(tmpl->sock, "]");
}

/*
  list values in nvram pack
 */
static void nvram_pack_values(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    if (argc < 1) {
        return;
    }
    char *pack_name = argv[0];
    char *cfg_name = NULL;
    nvram_cfg_name_data_info_t *cfg_name_info = NULL;
    bool first = true;
    
    int cfg_cnt = snx_nvram_get_all_cfg_count(pack_name);

    sock_printf(tmpl->sock, "[");
    
    if (cfg_cnt < 0) {
        goto end;
    }
    
    cfg_name_info = talloc_zero_array(tmpl, nvram_cfg_name_data_info_t, cfg_cnt);
    if (snx_nvram_get_cfg_name_list(pack_name, cfg_name_info) == NVRAM_E_PKGNOEXIST) {
        goto end;
    }

    while (cfg_cnt--) {
        nvram_cfg_name_data_info_t *cfg = &cfg_name_info[cfg_cnt];
        cfg_name = cfg->name;
        if (!first) {
            sock_printf(tmpl->sock, ", ");
        }
        first = false;
        sock_printf(tmpl->sock, "{ \"name\" : \"%s\", \"size\" : %u, ",
                    cfg_name, cfg->data_info.data_len);
        void *cfg_data = NULL;

        cfg_data = talloc_zero_size(cfg_name_info, cfg->data_info.data_len);
        if (cfg_data == NULL) {
            continue;
        }
        cfg->data_info.data = cfg_data;
        snx_nvram_get_immediately(pack_name, cfg_name, &cfg->data_info);

        switch (cfg->data_info.data_type) {
        case NVRAM_DT_STRING:
            sock_printf(tmpl->sock, "\"type\" : \"string\", \"value\" : \"%s\" }\n", (const char *)cfg->data_info.data);
            break;

        case NVRAM_DT_BIN_RAW:
            sock_printf(tmpl->sock, "\"type\" : \"file\" }");
            break;
            
        case NVRAM_DT_INT:
            sock_printf(tmpl->sock, "\"type\" : \"int\", \"value\" : %d }", *((int *)cfg->data_info.data));
            break;
            
        case NVRAM_DT_FLOAT:
            sock_printf(tmpl->sock, "\"type\" : \"float\", \"value\" : %f }", *((float *)cfg->data_info.data));
            break;
            
        case NVRAM_DT_UINT:
            sock_printf(tmpl->sock, "\"type\" : \"uint\", \"value\" : %u }", *((unsigned *)cfg->data_info.data));
            break;
            
        case NVRAM_DT_UCHAR:
            sock_printf(tmpl->sock, "\"type\" : \"uchar\", \"value\" : %u }", *((unsigned char *)cfg->data_info.data));
            break;
            
        default:
            sock_printf(tmpl->sock, "\"type\" : \"unknown\" }");
            break;
        }
        cfg_data = NULL;
    }

end:
    sock_printf(tmpl->sock, "]");
    talloc_free(cfg_name_info);
}


/*
  set a nvram value
 */
static void nvram_set_value(struct template_state *tmpl, const char *name, const char *value, int argc, char **argv)
{
    if (argc < 3) {
        return;
    }
    char *pack_name = argv[0];
    char *cfg_name = argv[1];
    const char *svalue = argv[2];
    int rc = -1;

    // work out the type
    int cfg_cnt = snx_nvram_get_all_cfg_count(pack_name);
    if (cfg_cnt < 0) {
        goto failed;
    }
    
    nvram_cfg_name_data_info_t *cfg_name_info = talloc_zero_array(tmpl, nvram_cfg_name_data_info_t, cfg_cnt);
    if (snx_nvram_get_cfg_name_list(pack_name, cfg_name_info) == NVRAM_E_PKGNOEXIST) {
        goto failed;
    }
    uint32_t i;
    int dtype = -1;
    for (i=0; i<cfg_cnt; i++) {
        nvram_cfg_name_data_info_t *cfg = &cfg_name_info[i];
        void *cfg_data = NULL;

        cfg_data = talloc_zero_size(cfg_name_info, cfg->data_info.data_len);
        if (cfg_data == NULL) {
            continue;
        }        
        cfg->data_info.data = cfg_data;
        snx_nvram_get_immediately(pack_name, cfg_name, &cfg->data_info);
        dtype = cfg->data_info.data_type; 
    }

    switch (dtype) {
    case NVRAM_DT_STRING:
        rc = snx_nvram_string_set(pack_name, cfg_name, svalue);
        break;
    case NVRAM_DT_INT:
        rc = snx_nvram_integer_set(pack_name, cfg_name, atoi(svalue));
        break;
    case NVRAM_DT_UINT:
        rc = snx_nvram_unsign_integer_set(pack_name, cfg_name, simple_strtoul(svalue, NULL, 10));
        break;
    default:
        rc = -1;
        break;
    }

failed:
    sock_printf(tmpl->sock, "%d", rc);
}
#endif // SYSTEM_FREERTOS

void functions_init(struct template_state *tmpl)
{
#ifdef SYSTEM_FREERTOS
    tmpl->put(tmpl, "uptime", "", uptime);
    tmpl->put(tmpl, "mem_free", "", mem_free);
    tmpl->put(tmpl, "snapshot", "", snapshot);
    tmpl->put(tmpl, "mjpgvideo", "", mjpg_video);
    tmpl->put(tmpl, "take_picture", "", take_picture);
    tmpl->put(tmpl, "get_ssid", "", get_ssid);
    tmpl->put(tmpl, "set_ssid", "", set_ssid);
    tmpl->put(tmpl, "sonix_version", "", sonix_version);
    tmpl->put(tmpl, "file_upload", "", file_upload);
    tmpl->put(tmpl, "file_unlink", "", file_unlink);
    tmpl->put(tmpl, "file_mkdir", "", file_mkdir);
    tmpl->put(tmpl, "file_rename", "", file_rename);
    tmpl->put(tmpl, "file_listdir", "", file_listdir);
    tmpl->put(tmpl, "disk_info", "", disk_info);
    tmpl->put(tmpl, "set_time_utc", "", set_time_utc);
    tmpl->put(tmpl, "fc_mavlink_count", "", fc_mavlink_count);
    tmpl->put(tmpl, "fc_mavlink_baudrate", "", fc_mavlink_baudrate);
    tmpl->put(tmpl, "mga_status", "", mga_status);
    tmpl->put(tmpl, "mga_upload", "", mga_upload);
    tmpl->put(tmpl, "nvram_pack_list", "", nvram_pack_list);
    tmpl->put(tmpl, "nvram_pack_values", "", nvram_pack_values);
    tmpl->put(tmpl, "nvram_set_value", "", nvram_set_value);
#endif // SYSTEM_FREERTOS
    tmpl->put(tmpl, "format_storage", "", format_storage);
    tmpl->put(tmpl, "factory_reset", "", factory_reset);
    tmpl->put(tmpl, "reboot_companion", "", reboot_companion);
    tmpl->put(tmpl, "toggle_video", "", toggle_video);
    tmpl->put(tmpl, "upload_progress", "", upload_progress);
    tmpl->put(tmpl, "upload_message", "", upload_message);
    tmpl->put(tmpl, "mavlink_message", "", mavlink_message);
    tmpl->put(tmpl, "mavlink_message_list", "", mavlink_message_list);
    tmpl->put(tmpl, "mavlink_message_send", "", mavlink_message_send);
    tmpl->put(tmpl, "process_c_calls", "", process_c_calls);
    tmpl->put(tmpl, "process_content", "", process_content);
    tmpl->put(tmpl, "get_param", "", get_param);
    tmpl->put(tmpl, "get_param_list", "", get_param_list);
}


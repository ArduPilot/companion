/* 
   some simple CGI helper routines
   Copyright (C) Andrew Tridgell 1997-2001
   
   This program is free software; you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation; either version 2 of the License, or
   (at your option) any later version.
   
   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.
   
   You should have received a copy of the GNU General Public License
   along with this program; if not, write to the Free Software
   Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.
*/


#include "includes.h"
#include <ctype.h>

#define CONTENT_DISPOSITION "Content-Disposition:"
#define CONTENT_TYPE "Content-Type:"
#define MULTIPART_FORM_DATA "multipart/form-data"
#define CRLF "\r\n"

/* 
   trim the tail of a string
*/
void trim_tail(char *s, char *trim_chars)
{
	int len = strlen(s);
	while (len > 0 && strchr(trim_chars, s[len-1])) len--;
	s[len] = 0;
}



/* 
   inplace handling of + and % escapes in http variables 
*/
static void unescape(char *p)
{
    unsigned v;

    while (*p) {
        if (*p == '+') *p = ' ';
        if (*p == '%' && sscanf(p+1, "%02x", &v) == 1) {
            *p = (char)v;
            memcpy(p+1, p+3, strlen(p+3)+1);
        }
        p++;
    }
}

/*
  read from CGI socket, with buffering
 */
static ssize_t cgi_read(struct cgi_state *cgi, char *buf, uint32_t len)
{
    ssize_t ret = 0;
    while (len > 0) {
        if (cgi->bufofs < cgi->buflen) {
            uint16_t n = cgi->buflen - cgi->bufofs;
            if (n > len) {
                n = len;
            }
            memcpy(buf, &cgi->buf[cgi->bufofs], n);
            buf += n;
            cgi->bufofs += n;
            len -= n;
            ret += n;
        } else {
            ssize_t n = read(cgi->sock->fd, &cgi->buf[0], sizeof(cgi->buf));
            if (n <= 0) {
                break;
            }
            cgi->buflen = n;
            cgi->bufofs = 0;
        }
    }
    return ret;
}

/*
  read one line from a file, allocating space as need be
  adjust length on return
*/
static char *grab_line(struct cgi_state *cgi, const char *terminator, unsigned *length)
{
    int len = 1024;
    char *ret = talloc_size(cgi, len);
    int i = 0;
    int tlen = strlen(terminator);

    while (*length) {
        char c;
        
        if (i == len) {
            len *= 2;
            ret = talloc_realloc_size(cgi, ret, len);
        }

        if (cgi_read(cgi, &c, 1) != 1) {
            (*length) = 0;
            break;                    
        }

        (*length)--;

        ret[i++] = c;

        if (i >= tlen && memcmp(terminator, &ret[i-tlen], tlen) == 0) {
            i -= tlen;
            break;
        }
    }

    ret[i] = 0;
    return ret;
}


/*
  add a name/value pair to the list of cgi variables 
*/
static void put(struct cgi_state *cgi, const char *name, const char *value)
{
    struct cgi_var *var;
    int len;
    char *p;

    if (!name || !value) return;

    web_debug(4, "cgi %s=%s\n", name, value);
        
    var = talloc(cgi, struct cgi_var);
    memset(var, 0, sizeof(*var));
    var->next = cgi->variables;

    /* trim leading spaces */
    while (*name && (*name == '+' || *name == ' ')) name++;

    var->name = talloc_strdup(var, name);
    var->value = talloc_strdup(var, value);
    unescape(var->name);
    unescape(var->value);

    /* trim trailing spaces */
    len = strlen(var->value);
    while (len && isspace(var->value[len-1])) {
        var->value[len-1] = 0;
        len--;
    }

    for (p=var->name; *p; p++) {
        if (!isalnum(*p) && !strchr("_-", *p)) {
            *p = '_';
        }
    }

    cgi->variables = var;
    char cgi_name[100];
    snprintf(cgi_name, sizeof(cgi_name)-1, "CGI_%s", var->name);
    cgi_name[sizeof(cgi_name)-1] = 0;
    cgi->tmpl->put(cgi->tmpl, cgi_name, var->value, NULL);
}


/*
  parse a url encoded form
*/
static void load_urlencoded(struct cgi_state *cgi)
{
    unsigned len = cgi->content_length;
    char *line;
    char *p;

    while (len && (line=grab_line(cgi, "&", &len))) {
        p = strchr(line,'=');
        if (p) {
            *p = 0;
            put(cgi, line, p+1);
        }
        talloc_free(line);
    }
}

/*
  parse a single element of a multipart encoded form
  It's rather more complex than I would like :(
*/
static int load_one_part(struct cgi_state *cgi, unsigned *len, char *boundary)
{
    char *line;
    char *name=NULL;
    char *content;
    char *filename=NULL;
    unsigned content_len=0, content_alloc=1024;
    unsigned boundary_len = strlen(boundary);
    int raw_data = 0;

    while (*len && (line=grab_line(cgi, CRLF, len))) {
        if (*line == 0) break;
        if (strcmp(line,"--") == 0) return 1;
        if (strncasecmp(line, CONTENT_TYPE, 
                        strlen(CONTENT_TYPE)) == 0) {
            raw_data = 1;
        }
        if (strncasecmp(line, CONTENT_DISPOSITION, 
                        strlen(CONTENT_DISPOSITION)) == 0) {
            char *p = strstr(line,"; name=");
            if (!p) continue;
            p += 7;
            if (*p == '"') p++;
            name = talloc_strndup(cgi, p, strcspn(p, "\";"));
            p = strstr(line,"; filename=\"");
            if (p) {
                p += 12;
                filename = talloc_strndup(cgi, p, strcspn(p, "\";"));
            }
        }
    }

    content = talloc_size(cgi, content_alloc);
	
    char c;
    while (*len && cgi_read(cgi, &c, 1) == 1) {
        (*len)--;
        if (content_len >= (content_alloc-1)) {
            // if bigger than 1k, then allocate enough for whole object
            if (content_alloc < cgi->content_length) {
                content_alloc = cgi->content_length;
            } else {
                content_alloc *= 2;
            }
            content = talloc_realloc_size(cgi, content, content_alloc);
            if (!content) {
                return 1;
            }
        }
        content[content_len++] = c;
        /* we keep grabbing content until we hit a boundary */
        if (content_len >= boundary_len &&
            memcmp(boundary, &content[content_len-boundary_len], 
                   boundary_len) == 0 &&
            memcmp("--", &content[content_len-boundary_len-2], 2) == 0) {
            content_len -= boundary_len+4;
            if (name) {
                if (raw_data || filename) {
                    put(cgi, name, filename?filename:"");
                    content = talloc_realloc_size(cgi, content, content_len);
                    if (!content) {
                        return 1;
                    }
                    cgi->variables->content = content;
                    cgi->variables->content_len = content_len;
                } else {
                    content[content_len] = 0;
                    put(cgi, name, content);
                    talloc_free(name);
                    talloc_free(content);
                }
            } else {
                talloc_free(content);
            }
            char b[2];
            cgi_read(cgi, b, 2);
            (*len) -= 2;
            return 0;
        }
    }

    if (filename) {
        talloc_free(filename);
    }

    return 1;
}

/*
  parse a multipart encoded form (for file upload)
  see rfc1867
*/
static void load_multipart(struct cgi_state *cgi)
{
    char *boundary;
    unsigned len = cgi->content_length;
    char *line;

    if (!cgi->content_type) return;
    boundary = strstr(cgi->content_type, "boundary=");
    if (!boundary) return;
    boundary += 9;
    trim_tail(boundary, CRLF);
    line = grab_line(cgi, CRLF, &len);
    if (strncmp(line,"--", 2) != 0 || 
        strncmp(line+2,boundary,strlen(boundary)) != 0) {
        console_printf("Malformed multipart?\n");
        talloc_free(line);
        return;
    }

    if (strcmp(line+2+strlen(boundary), "--") == 0) {
        /* the end is only the beginning ... */
        talloc_free(line);
        return;
    }

    talloc_free(line);
    while (load_one_part(cgi, &len, boundary) == 0) ;
}

/*
  load all the variables passed to the CGI program. May have multiple variables
  with the same name and the same or different values. 
*/
static void load_variables(struct cgi_state *cgi)
{
    char *p, *s, *tok;

    if (cgi->content_length > 0 && cgi->request_post) {
        if (strncmp(cgi->content_type, MULTIPART_FORM_DATA, 
                    strlen(MULTIPART_FORM_DATA)) == 0) {
            load_multipart(cgi);
        } else {
            load_urlencoded(cgi);
        }
    }

    if ((s=cgi->query_string)) {
        char *pp;
        for (tok=strtok_r(s,"&;", &pp);tok;tok=strtok_r(NULL,"&;", &pp)) {
            p = strchr(tok,'=');
            if (p) {
                *p = 0;
                put(cgi, tok, p+1);
            }
        }
    }
}


/*
  find a variable passed via CGI
  Doesn't quite do what you think in the case of POST text variables, because
  if they exist they might have a value of "" or even " ", depending on the 
  browser. Also doesn't allow for variables[] containing multiple variables
  with the same name and the same or different values.
*/
static const char *get(struct cgi_state *cgi, const char *name)
{
    struct cgi_var *var;

    for (var = cgi->variables; var; var = var->next) {
        //console_printf("var: %s=%s\n", var->name, var->value);
        if (strcmp(var->name, name) == 0) {
            return var->value;
        }
    }
    return NULL;
}

/*
  return the content of a binary cgi variable (for file upload)
*/
static const char *get_content(struct cgi_state *cgi, const char *name, unsigned *size)
{
    struct cgi_var *var;

    for (var = cgi->variables; var; var = var->next) {
        if (strcmp(var->name, name) == 0) {
            *size = var->content_len;
            return var->content;
        }
    }
    return NULL;
}

/*
  get a line from cgi socket
*/
static bool cgi_gets(struct cgi_state *cgi, char *line, uint32_t size)
{
    uint32_t n = 0;
    while (n < size-1) {
        char c;
        if (cgi_read(cgi, &c, 1) != 1) {
            break;
        }
        if (c == '\n') {
            break;
        }
        line[n++] = c;
    }
    line[n] = 0;
    return n > 0;
}

/*
  tell a browser about a fatal error in the http processing
*/
static void http_error(struct cgi_state *cgi, 
		       const char *err, const char *header, const char *info)
{
    if (!cgi->got_request) {
        /* damn browsers don't like getting cut off before they give a request */
        char line[1024];
        while (cgi_gets(cgi, line, sizeof(line))) { {
                if (strncasecmp(line,"GET ", 4)==0 || 
                    strncasecmp(line,"POST ", 5)==0 ||
                    strncasecmp(line,"PUT ", 4)==0) {
                    break;
                }
            }
	}
    }
    sock_printf(cgi->sock, "HTTP/1.0 %s\r\n%sConnection: close\r\nContent-Type: text/html\r\n\r\n<HTML><HEAD><TITLE>%s</TITLE></HEAD><BODY><H1>%s</H1>%s<p></BODY></HTML>\r\n\r\n", err, header, err, err, info);
}

static const struct mime_type {
    const char *pattern;
    const char *mime_type;
    enum CGI_MIME_TYPE type;
} mime_types[] = {
    {".gif",  "image/gif",  MIME_TYPE_IMAGE_GIF},
    {".jpg",  "image/jpeg", MIME_TYPE_IMAGE_JPEG},
    {".txt",  "text/plain", MIME_TYPE_TEXT_PLAIN},
    {".html", "text/html;charset=UTF-8",  MIME_TYPE_TEXT_HTML},
    {".mp4",  "video/mp4",  MIME_TYPE_VIDEO_MP4},
    {".bin",  "data",       MIME_TYPE_UNKNOWN},
    {".svg",  "image/svg+xml", MIME_TYPE_IMAGE_SVG},
    {".js",   "application/javascript", MIME_TYPE_JAVASCRIPT},
    {".json", "application/json", MIME_TYPE_JSON},
    {".css",  "text/css", MIME_TYPE_CSS},
    {".mjpg",  "multipart/x-mixed-replace; boundary=mjpgboundary", MIME_TYPE_MJPG},
    {NULL,     "data",      MIME_TYPE_UNKNOWN},
};

/*
  send a http header based on file extension
*/
static const struct mime_type *get_mime_type(const char *filename)
{
    int i;

    int len = strlen(filename);
    for (i=0; mime_types[i].pattern != NULL; i++) {
        int plen = strlen(mime_types[i].pattern);
        if (len >= plen && strcasecmp(&filename[len-plen], mime_types[i].pattern) == 0) {
            break;
        }
    }
    return &mime_types[i];
}

/*
  send a http header based on file extension
*/
static void http_header(struct cgi_state *cgi, const char *filename)
{
    const struct mime_type *mtype = get_mime_type(filename);
    
    sock_printf(cgi->sock, "HTTP/1.0 200 OK\r\nConnection: close\r\n");

    sock_printf(cgi->sock, "Content-Type: %s\r\n", mtype->mime_type);
    if (cgi->content_length > 0) {
        sock_printf(cgi->sock, "Content-Length: %u\r\n",
                    (unsigned)cgi->content_length);
    }
    sock_printf(cgi->sock, "Access-Control-Allow-Origin: *\r\n");
    if (mtype->type != MIME_TYPE_TEXT_HTML &&
        mtype->type != MIME_TYPE_JSON &&
        strncmp(filename, "ajax/", 5) != 0 &&
        strncmp(filename, "fs/", 3) != 0) {
        //console_printf("serving %s\n", filename);
        sock_printf(cgi->sock, "Cache-Control: public, max-age=3600\r\n");
    }
    if (cgi->sock->add_content_length) {
        // delay the content length header
        cgi->sock->header_length = talloc_get_size(cgi->sock->buf);
    } else {
        sock_printf(cgi->sock, "\r\n");
    }
}

#ifdef SYSTEM_FREERTOS
/*
  handle FAT filesystem list request
 */
static void download_file_list(struct cgi_state *cgi, const char *path)
{
    FRESULT ret;
    DIR dir;
    char *path2 = talloc_strdup(cgi, path);
    if (!path2) {
        cgi->http_error(cgi, "404 Bad File", "", "file not found");
        return;
    }
    if (path2[strlen(path2)-1] == '/') {
        path2[strlen(path2)-1] = 0;
    }

    put(cgi, "FILENAME", path2);
    
    if ((ret = f_opendir(&dir, path2)) != FR_OK) {
        cgi->http_error(cgi, "404 Bad File", "", "file not found");
        talloc_free(path2);
        return;
    }

    cgi->http_header(cgi, "index.html");
    cgi->tmpl->process(cgi->tmpl, "dirheader.html", 1);

    FILLIST ff = {};
    ff.finfo.lfname = ff.lfname;
    ff.finfo.lfsize = sizeof(ff.lfname);
    while ((ret = f_readdir(&dir, &ff.finfo))==FR_OK) {
        if (strcmp(ff.finfo.fname, ".") == 0) {
            continue;
        }
        if (ff.finfo.fname[0] == 0) {
            break;
        }
        const char *fname = GET_FN(ff.finfo);
        sock_printf(cgi->sock, "<tr><td>%s</td><td><a href='%s%s'>%s%s</a></td><td>%04u-%02u-%02u %02u:%02u</td><td>%u</td>\n",
                    (ff.finfo.fattrib&AM_DIR)?"d":"-",
                    fname,
                    (ff.finfo.fattrib&AM_DIR)?"/":"",
                    fname,
                    (ff.finfo.fattrib&AM_DIR)?"/":"",
                    FF_YEAR(ff.finfo.fdate), FF_MONTH(ff.finfo.fdate), FF_DATE(ff.finfo.fdate),
                    FF_HOUR(ff.finfo.ftime), FF_MINUTE(ff.finfo.ftime),
                    (unsigned)ff.finfo.fsize);
    }
    f_closedir(&dir);
    sock_printf(cgi->sock, "</table>\n");
    cgi->tmpl->process(cgi->tmpl, "dirfooter.html", 1);
    talloc_free(path2);
}

/*
  handle FAT filesystem request
 */
static void download_filesystem(struct cgi_state *cgi, const char *fs_path)
{
    const char *path = fs_path+2;
    FILLIST f = {};
    f.finfo.lfname = f.lfname;
    f.finfo.lfsize = sizeof(f.lfname);
    if (strcmp(path, "/") == 0 ||
        path[strlen(path)-1] == '/' ||
        (f_stat(path, &f.finfo) == FR_OK && (f.finfo.fattrib & AM_DIR) != 0)) {
        download_file_list(cgi, path);
        return;
    }
    cgi->content_length = f.finfo.fsize;
    FIL fh;
    if (f_open(&fh, path, FA_READ) == FR_OK) {
        cgi->http_header(cgi, fs_path);
        char buf[2048];
        UINT read_count;
        while (f_read(&fh, buf, sizeof(buf), &read_count) == FR_OK && read_count>0) {
            if (sock_write(cgi->sock, buf, read_count) != read_count) {
                break;
            }
        }
        f_close(&fh);
    } else {
        cgi->http_error(cgi, "404 Bad File", "", "file not found");
    }
}
#endif // SYSTEM_FREERTOS

/*
  handle a file download
*/
static void download(struct cgi_state *cgi, const char *path)
{
    const struct mime_type *mtype;

    if (!path || *path == 0) {
        // handle root page
        path = "index.html";
    }
    
    mtype = get_mime_type(path);

#ifdef SYSTEM_FREERTOS
    if (strncmp(path, "fs/", 3) == 0) {
        download_filesystem(cgi, path);
        return;
    }
#endif
    
    size_t size = 0;
    const char *contents = get_embedded_file(path, &size);
    if (!contents) {
        web_debug(2, "not found: %s\n", path);
        cgi->http_error(cgi, "404 Bad File", "", "file not found");
        return;
    }

    if (mtype->type == MIME_TYPE_TEXT_HTML ||
        mtype->type == MIME_TYPE_JSON ||
        strncmp(path, "ajax/", 5) == 0) {
        cgi->content_length = 0;
        if (mtype->type != MIME_TYPE_MJPG) {
            cgi->sock->add_content_length = true;
        }
        cgi->http_header(cgi, path);
        web_debug(2, "process: %s\n", path);
        cgi->tmpl->process(cgi->tmpl, path, 1);
        return;
    }

    web_debug(2, "embedded: %s\n", path);
    cgi->content_length = size;
    cgi->http_header(cgi, path);
    sock_write(cgi->sock, contents, size);
}


/* setup headers for standalone web server */
static bool setup_standalone(struct cgi_state *cgi)
{
    char line[1024];
    char *url=NULL;
    char *p;

    while (cgi_gets(cgi, line, sizeof(line))) {
        trim_tail(line, CRLF);
        if (line[0] == 0) break;
        if (strncasecmp(line,"GET ", 4)==0) {
            cgi->got_request = 1;
            url = talloc_strdup(cgi, &line[4]);
        } else if (strncasecmp(line,"POST ", 5)==0) {
            cgi->got_request = 1;
            cgi->request_post = 1;
            url = talloc_strdup(cgi, &line[5]);
        } else if (strncasecmp(line,"PUT ", 4)==0) {
            cgi->got_request = 1;
            cgi->http_error(cgi, "400 Bad Request", "",
                            "This server does not accept PUT requests");
            return false;
        } else if (strncasecmp(line,"Content-Length: ", 16)==0) {
            cgi->content_length = atoi(&line[16]);
        } else if (strncasecmp(line,"Content-Type: ", 14)==0) {
            cgi->content_type = talloc_strdup(cgi, &line[14]);
        }
        /* ignore all other requests! */
    }

    if (!url) {
        cgi->http_error(cgi, "400 Bad Request", "",
                        "You must specify a GET or POST request");
        return false;
    }

    /* trim the URL */
    if ((p = strchr(url,' ')) || (p=strchr(url,'\t'))) {
        *p = 0;
    }

    /* anything following a ? in the URL is part of the query string */
    if ((p=strchr(url,'?'))) {
        cgi->query_string = p+1;
        *p = 0;
    }

    cgi->url = url;
    cgi->pathinfo = url;
    return true;
}

/*
  read and parse the http request
*/
static bool setup(struct cgi_state *cgi)
{
    bool ret;
    ret = setup_standalone(cgi);

    while (cgi->pathinfo && *cgi->pathinfo == '/') cgi->pathinfo++;

    return ret;
}

static struct cgi_state cgi_base = {
    /* methods */
    setup,
    http_header,
    load_variables,
    get,
    get_content,
    http_error,
    download,
    put,
	
    /* rest are zero */
};

struct cgi_state *cgi_init(struct connection_state *c, struct sock_buf *sock)
{
    struct cgi_state *cgi;

    cgi = talloc_zero(c, struct cgi_state);
    if (cgi == NULL) {
        return NULL;
    }
    memcpy(cgi, &cgi_base, sizeof(*cgi));

    cgi->tmpl = template_init(cgi, sock);
    cgi->sock = sock;

    return cgi;
}


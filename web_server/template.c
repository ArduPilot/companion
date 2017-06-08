/* 
   some simple html template routines
   Copyright (C) Andrew Tridgell 2001
   
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
#include "functions.h"

static void process_tag(struct template_state *tmpl, const char *tag);

/* 
   fetch a variable from the template variables list 
*/
static struct template_var *find_var(struct template_state *tmpl, const char *name)
{
    struct template_var *var;

    for (var = tmpl->variables; var; var = var->next) {
        if (strcmp(var->name, name) == 0) {
            return var;
        }
    }
    return NULL;
}

/*
  add a name/value pair to the list of template variables 
*/
static void put(struct template_state *tmpl, const char *name, 
		const char *value, template_fn fn)
{
    struct template_var *var;
    if (!name || !value) return;

    var = find_var(tmpl, name);
    if (var) {
        talloc_free(var->value);
    } else {
        var = talloc(tmpl, struct template_var);
        var->next = tmpl->variables;
        tmpl->variables = var;
        var->name = talloc_strdup(var, name);
        var->function = fn;
    }
    var->value = talloc_strdup(var, value);
    web_debug(5, "put(%s,%s)\n", name, value);
}

/* fetch a variable from the template variables list */
static const char *get(struct template_state *tmpl, const char *name)
{
    struct template_var *var;

    var = find_var(tmpl, name);
    if (var) return var->value;

    return NULL;
}


/* process a template variable */
static void process_variable(struct template_state *tmpl, const char *tag)
{
    const char *v = tmpl->get(tmpl, tag);
    if (v) {
        sock_printf(tmpl->sock, "%s", v);
    }
}

/* process setting a template variable */
static void process_set_var(struct template_state *tmpl, char *tag)
{
    char *p;
    p = strchr(tag, '=');
    if (!p) return;
    *p++ = 0;
    trim_tail(tag, " \t");
    trim_tail(p, " \t");
    while (isspace(*p)) p++;
    tmpl->put(tmpl, tag, p, NULL);
}

/* process a template variable with quote escaping */
static void process_escaped_variable(struct template_state *tmpl, const char *tag)
{
    const char *v = tmpl->get(tmpl, tag);
    while (v && *v) {
        if (*v == '"') {
            sock_printf(tmpl->sock, "&quot;");
        } else {
            sock_write(tmpl->sock, v, 1);
        }
        v++;
    }
}

/* process a call into a C function setup with put_function() */
static void process_c_call(struct template_state *tmpl, const char *tag)
{
    struct template_var *var;
    char *name, *args, *p, *tok;
    char **argv;
    int argc=0;

    if (!(p=strchr(tag, '('))) return;

    web_debug(2, "process_c_call: %s\n", tag);
    
    name = talloc_strndup(tmpl, tag, strcspn(tag, "("));

    var = find_var(tmpl, name);
    if (!var || !var->function) {
        web_debug(4,"No function '%s'\n", name);
        talloc_free(name);
        return;
    }

    args = talloc_strndup(tmpl, p+1, strcspn(p+1, ")"));

    argv = talloc(tmpl, char *);
    for (tok = strtok_r(args, ",", &p); tok; tok = strtok_r(NULL, ",", &p)) {
        argv = talloc_realloc_size(tmpl, argv, (argc+2)*sizeof(char *));
        while (isspace(*tok)) tok++;
        trim_tail(tok, " \t\r\n");
        argv[argc++] = tok;
    }
    argv[argc] = NULL;

    var->function(tmpl, name, var->value, argc, argv);
    talloc_free(args);
    talloc_free(name);
}

/*
  process a single tag
*/
static void process_tag(struct template_state *tmpl, const char *tag)
{
    char *tag2, *p;
    int recurse = 1;

    while (isspace(*tag)) tag++;

    tag2 = talloc_strdup(tmpl, tag);
    trim_tail(tag2, " \t\n\r");

    p = tag2;

    if (*p == '-') {
        p++;
        recurse = 0;
    }

    switch (*p) {
    case '$':
        process_variable(tmpl, p+1);
        break;
    case '%':
        process_escaped_variable(tmpl, p+1);
        break;
    case '@':
        process_c_call(tmpl, p+1);
        break;
    case '#':
        /* its a comment, ignore it */
        break;
    default:
        if (strchr(tag2, '=')) {
            process_set_var(tmpl, p);
        } else {
            /* an include file */
            tmpl->process(tmpl, p, recurse);
        }
    }
    talloc_free(tag2);
}

/*
  process provided content
*/
static int process_content(struct template_state *tmpl, const char *mp, uint32_t size)
{
    size_t remaining;
    const char *m;
    char *p, *s;
    int recurse = 1;

    remaining = size;
    m = mp;

    if (strncmp(m, "#!", 2) == 0) {
        /* advance past shell script tag */
        m = strchr(m, '\n');
        if (!m) return 0;
        m++;
        remaining -= (m-mp);
    }

    /* tags look like {{ TAG }} 
       where TAG can be of several forms
    */
    while (recurse && remaining && (p = strstr(m, START_TAG))) {
        const char *m0 = m;
        int len;
        char *contents, *s2;
        const char *m2;
        int depth=1;

        sock_write(tmpl->sock, m, (p-m));
        m = p + strlen(START_TAG);
        m2 = m;
        while (depth) {
            s2 = strstr(m2, START_TAG);
            s = strstr(m2, END_TAG);
            if (!s) break;
            if (s2 && s2 < s) {
                depth++;
                m2 = s2 + strlen(START_TAG);
            } else {
                depth--;
                m2 = s + strlen(END_TAG);
            }
        }
        if (!s || depth) {
            console_printf("No termination of tag!\n");
            return -1;
        }
        len = (s-m);
        while (len && isspace(m[len-1])) len--;
        contents = talloc_strndup(tmpl, m, len);
        process_tag(tmpl, contents);
        talloc_free(contents);
        m = s + strlen(END_TAG);
        remaining -= (m - m0);
    }

    if (remaining > 0) {
        sock_write(tmpl->sock, m, remaining);
    }
    return 0;
}

/*
  process a template file
*/
static int process(struct template_state *tmpl, const char *filename, int recurse)
{
    size_t size;
    const char *mp;

    mp = get_embedded_file(filename, &size);
    if (!mp) {
        console_printf("Failed to map %s\n", filename);
        return -1;
    }

    return process_content(tmpl, mp, size);
}


static struct template_state template_base = {
    /* methods */
    process,
    put,
    get,
    process_c_call,
    process_content,
    
    /* rest are zero */
    NULL,
    NULL,
};

struct template_state *template_init(void *ctx, struct sock_buf *sock)
{
    struct template_state *tmpl;

    tmpl = talloc(ctx, struct template_state);
    if (tmpl) {
        memcpy(tmpl, &template_base, sizeof(*tmpl));
        tmpl->sock = sock;
    }

    functions_init(tmpl);
    
    return tmpl;
}

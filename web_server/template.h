/* 
   some simple http template routines
   Copyright (C) Andrew Tridgell 2002
   
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

#pragma once

typedef void (*template_fn)(struct template_state *, const char *, const char *,
			    int, char **);

struct template_var {
    struct template_var *next;
    char *name;
    char *value;
    template_fn function;
};


struct template_state {
    /* methods */
    int (*process)(struct template_state *, const char *, int);
    void (*put)(struct template_state *, const char *, const char *, template_fn fn);
    const char *(*get)(struct template_state *, const char *name);
    void (*process_c_call)(struct template_state *, const char *);
    int (*process_content)(struct template_state *tmpl, const char *mp, uint32_t size);

    /* data */
    struct template_var *variables;
    struct sock_buf *sock;
};

#define START_TAG "{{"
#define END_TAG "}}"

/* prototypes */
struct template_state *template_init(void *ctx, struct sock_buf *sock);

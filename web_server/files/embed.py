#!/usr/bin/env python

'''
script to create embedded.c from a set of static files for web
server. This avoids the need for a ROMFS filesystem

Andrew Tridgell
May 2017
'''

import sys

out = open("embedded.c", "w")

out.write('''
// generated embedded files for web_server
#include <stdio.h>

struct embedded_file {
    const char *filename;
    unsigned size;
    const char *contents;
};

''')


def embed_file(f, idx):
    '''embed one file'''
    contents = open(f).read()
    out.write('''
// %s
static const char embedded_%u[] = {''' % (f, idx))

    for c in contents:
        out.write('%u,' % ord(c))
    out.write('''
0};
''')

for i in range(1, len(sys.argv)):
    embed_file(sys.argv[i], i)

out.write('''
const struct embedded_file embedded_files[] = {
''')

for i in range(1, len(sys.argv)):
    print("Embedding file %s" % sys.argv[i])
    out.write('{ "%s", sizeof(embedded_%u)-1, embedded_%u },\n' % (sys.argv[i], i, i))

out.write('''
{ NULL, 0, NULL }
};
''')

out.close()

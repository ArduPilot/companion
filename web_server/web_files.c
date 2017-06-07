/*
  support for embedded files
 */

#include "includes.h"

#include "files/embedded.c"

/*
  return pointer to embedded file, or NULL
 */
const char *get_embedded_file(const char *filename, size_t *size)
{
    uint16_t i;
    for (i=0; embedded_files[i].filename; i++) {
        if (strcmp(filename, embedded_files[i].filename) == 0) {
            *size = embedded_files[i].size;
            return embedded_files[i].contents;
        }
    }
    return NULL;
}

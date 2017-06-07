#pragma once

/*
  support for embedded files
 */


/*
  return pointer to embedded file, or NULL
 */
const char *get_embedded_file(const char *filename, size_t *size);


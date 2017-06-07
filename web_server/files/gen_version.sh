#!/bin/sh

(
    echo "#define SONIX_BUILD_DATE \"$(date +%Y-%m-%d)\""
    echo "#define SONIX_GIT_REVISION \"$(git rev-parse HEAD | cut -c1-8)\""
) > version.h


#!/bin/sh

(
    echo "CACHE MANIFEST"
    echo "# "$(date)
    echo "CACHE:"
    echo /
    for f in *.html js/*.js images/*.svg images/*.png css/*.css data/*.xml; do
        echo $f
    done
    echo "NETWORK:"
    echo "*"
) > manifest.appcache

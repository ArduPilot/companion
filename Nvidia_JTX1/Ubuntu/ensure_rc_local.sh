#!/bin/bash

if [ $(id -u) -ne 0 ]; then
   echo >&2 "Must be run as root"
   exit 1
fi

set -e
set -x

. config.env

if [ ! -f /etc/rc.local ]; then
    cat >/etc/rc.local <<EOF
#!/bin/bash

exit 0
EOF
    chmod +x /etc/rc.local
fi

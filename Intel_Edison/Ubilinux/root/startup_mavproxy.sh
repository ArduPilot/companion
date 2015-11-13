{
date
PATH=$PATH:/usr/local/bin:/root
export PATH
echo $PATH
export USER=root
export HOME=/root
cd /root
pwd
screen -d -m -s /bin/bash mavproxy.py --master=/dev/ttyMFD1,57600 --source-system=1 --source-component=100 --aircraft MyCamera
} > /tmp/rc.log 2>&1


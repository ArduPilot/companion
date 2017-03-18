#!/bin/bash

# Based on https://jakehewitt.github.io/custom-edison-image/ - thanks Jake!

set -e
set -x

echo "[Debian]: Starting install"
sudo apt-get install -y build-essential git diffstat gawk chrpath texinfo libtool gcc-multilib debootstrap debian-archive-keyring python dfu-util

wget http://downloadmirror.intel.com/25028/eng/edison-src-ww25.5-15.tgz  
tar xf edison-src-ww25.5-15.tgz

pushd edison-src
  mkdir bitbake_download_dir  
  mkdir bitbake_sstate_dir

  # https://communities.intel.com/thread/108000
  perl -pe 's/(IMAGE_INSTALL [+]= "iotkit-comm-js")/# $1/' -i 'meta-intel-edison/meta-intel-edison-distro/recipes-core/images/edison-image.bb'
  perl -pe 's/(IMAGE_INSTALL [+]= "iotkit-comm-c-dev")/# $1/' -i 'meta-intel-edison/meta-intel-edison-distro/recipes-core/images/edison-image.bb'

  time ./meta-intel-edison/setup.sh --dl_dir=bitbake_download_dir --sstate_dir=bitbake_sstate_dir --deb_packages --parallel_make=8 --bb_number_thread=8
  perl -pe 's%git://git.eclipse.org/gitroot/paho/org.eclipse.paho.mqtt.c.git%git://github.com/eclipse/paho.mqtt.c.git%' -i out/linux64/poky/meta-intel-iot-middleware/recipes-connectivity/paho-mqtt/paho-mqtt_3.1.bb
  pushd out/linux64
    . poky/oe-init-build-env
    time bitbake edison-image
  popd
  perl -pe 's%build_dir=\$top_repo_dir/build%build_dir=\$top_repo_dir/out/linux64/build%' -i meta-intel-edison/utils/create-debian-image.sh
  perl -pe 's%^fsize=.*%fsize=\$((`stat --printf="\%s" toFlash/edison-image-edison.ext4` / 524288 * 2))%' -i meta-intel-edison/utils/create-debian-image.sh

  # add kernel modules sufficient to have uvcvideo running:
  INSTALL_CMD='\$CHROOTCMD dpkg -i'
  MARKER='# Enables USB networking at startup\n'
  SCRIPT='meta-intel-edison/utils/create-debian-image.sh'
  KERNEL_VERSION='3.10.17-r0'
  for MODULENAME in videobuf2-core videobuf2-memops videobuf2-vmalloc uvcvideo ; do
      MODULE="/tmp/deb/edison/kernel-module-${MODULENAME}_${KERNEL_VERSION}_i386.deb"
      perl -pe "s%$MARKER%$INSTALL_CMD '$MODULE'\n$MARKER%" -i $SCRIPT
  done

  time sudo ./meta-intel-edison/utils/create-debian-image.sh --build_dir=out/linux64/build
popd

# after this script has run:
# cd ~/edison-src/out/linux64/build/toFlash
# ./flashall.sh
# I was not able to run this from the Vagrant VM, but rsync'd toFlash to my hostmachine.
# username/password is user/edison

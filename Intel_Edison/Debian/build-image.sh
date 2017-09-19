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

  # Fix USB host-mode per https://www.intel.com.au/content/www/au/en/support/boards-and-kits/intel-edison-boards/000020081.html
  cat >meta-intel-edison/meta-intel-edison-bsp/recipes-kernel/linux/files/Edison_USB_Host_Mode_Fix.patch <<EOF
--- a/drivers/usb/dwc3/dwc3-intel-mrfl.c	2017-09-15 08:14:56.027523626 +0000
+++ b/drivers/usb/dwc3/dwc3-intel-mrfl.c	2017-09-15 08:11:41.099533435 +0000
@@ -508,7 +508,7 @@
 int dwc3_intel_enable_vbus(struct dwc_otg2 *otg, int enable)
 {
 	atomic_notifier_call_chain(&otg->usb2_phy.notifier,
-			USB_EVENT_DRIVE_VBUS, &enable);
+			USB_EVENT_VBUS, &enable);
 
 	return 0;
 }
EOF
  echo 'SRC_URI += "file://Edison_USB_Host_Mode_Fix.patch"' >>meta-intel-edison/meta-intel-edison-bsp/recipes-kernel/linux/linux-yocto_3.10.bbappend

  # USB ethernet dongles:
  perl -pe 's/# CONFIG_USB_NET_(.*) is not set/CONFIG_USB_NET_$1=y/' -i ./meta-intel-edison/meta-intel-edison-bsp/recipes-kernel/linux/files/defconfig

  # continue build
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
  XMODULES="videobuf2-core videobuf2-memops videobuf2-vmalloc uvcvideo cdc_ether dm9601 smsc75xx smsc95xx gl620a net1080 plusb mcs7830"
  for MODULENAME in $XMODULES; do
      MODULE="/tmp/deb/edison/kernel-module-${MODULENAME}_${KERNEL_VERSION}_i386.deb"
      perl -pe "s%$MARKER%$INSTALL_CMD '$MODULE'\n$MARKER%" -i $SCRIPT
  done

  time sudo ./meta-intel-edison/utils/create-debian-image.sh --build_dir=out/linux64/build # 9m
popd

# after this script has run:
# cd ~/edison-src/out/linux64/build/toFlash
# ./flashall.sh
# I was not able to run this from the Vagrant VM, but copied it to /vagrant and flashed from the host machine
# vagrant@vagrant-ubuntu-trusty-64:~$ rsync -aPH edison-src/out/linux64/build/toFlash/ /vagrant/edison-ToFlash
# username/password is user/edison

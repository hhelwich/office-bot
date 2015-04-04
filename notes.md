## Installation

### Change distribution
I changed the distribution from the preinstalled [Ångström](http://www.angstrom-distribution.org) distribution to Ubuntu 14.04 after having some problems.

First get the latest prebuild ubuntu distribuiton from [here](http://elinux.org/BeagleBoardUbuntu#BeagleBone.2FBeagleBone_Black) e.g.:

    wget https://rcn-ee.net/rootfs/2015-02-19/microsd/bone-ubuntu-14.04.2-console-armhf-2015-02-19-2gb.img.xz
    md5sum bone-ubuntu-14.04.2-console-armhf-2015-02-19-2gb.img.xz
    unxz bone-ubuntu-14.04.2-console-armhf-2015-02-19-2gb.img.xz

Write the image to an SD card (Be sure to use the correct device and file name) e.g.:

    sudo dd if=./bone-ubuntu-14.04.2-console-armhf-2015-02-19-2gb.img of=/dev/sdd

Put the SD card in the BBB and connect network and power. Login with password `temppwd` and write image to eMMC:

    ssh ubuntu@arm.local
    sudo /opt/scripts/tools/eMMC/bbb-eMMC-flasher-eewiki-ext4.sh

Remove The SD card and reboot. Login and update/install software:

    sudo apt-get update
    sudo apt-get upgrade
    sudo apt-get install espeak mpg123 mongodb alsa-base alsa-utils alsa-tools libasound2-dev libasound2-plugins

Add a new user e.g.:

    sudo adduser hendrik
    sudo adduser hendrik sudo

Remove `ubuntu` user:

    sudo deluser --remove-home ubuntu

Exit and copy your public key to the BBB e.g.:

    exit
    ssh-copy-id hendrik@arm.local


### Install node.js

Go to [nodejs.org](https://nodejs.org/download/) and get the link to the current source and install e.g.:

    cd /tmp
    wget http://nodejs.org/dist/v0.12.2/node-v0.12.2.tar.gz
    tar xzf node-v0.12.2.tar.gz
    cd node-v0.12.2
    ./configure
    make
    sudo make install

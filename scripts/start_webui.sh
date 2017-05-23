#!/bin/bash

cd $HOME/companion/br-webui/
node index.js 2>&1 | tee -a /tmp/webui.log

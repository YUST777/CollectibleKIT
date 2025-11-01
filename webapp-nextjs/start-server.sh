#!/bin/bash
cd /root/01studio/CollectibleKIT/webapp-nextjs
pkill -f https-server.js
sleep 2
nohup node https-server.js > server.log 2>&1 &


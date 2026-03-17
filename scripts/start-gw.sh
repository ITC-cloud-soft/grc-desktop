#!/bin/bash
export HOME=/home/daytona
winclaw gateway > /tmp/gateway.log 2>&1 &
echo "gateway started with pid $!"

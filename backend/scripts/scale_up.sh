#!/usr/bin/env bash

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "[$TIMESTAMP] [SCALE_UP] Scaling up..." 

pm2 scale shim +1

echo "[$TIMESTAMP] [SCALE_UP] Done"
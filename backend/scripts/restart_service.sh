#!/usr/bin/env bash

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "[$TIMESTAMP] [RESTART] Restarting service..."

pm2 restart shim

echo "[$TIMESTAMP] [RESTART] Done"
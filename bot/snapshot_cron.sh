#!/bin/bash
# Daily portfolio snapshot cron job
# Run this daily at midnight UTC

cd /root/01studio/CollectibleKIT
python3 bot/create_portfolio_snapshot.py --all-users >> /root/01studio/CollectibleKIT/logs/snapshot.log 2>&1


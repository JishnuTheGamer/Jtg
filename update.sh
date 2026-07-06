#!/bin/bash

echo "====================================="
echo "       JTG Panel Auto-Updater        "
echo "====================================="

echo "[1/4] Pulling latest changes from GitHub..."
git stash
git pull

echo ""
echo "[2/4] Installing dependencies..."
npm install

echo ""
echo "[3/4] Building the panel..."
npm run build

echo ""
echo "[4/4] Restarting the panel process..."
# Start or restart using the ecosystem file
pm2 restart ecosystem.config.cjs || pm2 start ecosystem.config.cjs

echo ""
echo "====================================="
echo "           Update Complete!          "
echo "====================================="

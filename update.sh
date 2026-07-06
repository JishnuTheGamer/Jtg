#!/bin/bash

echo "====================================="
echo "       JTG Panel Auto-Updater        "
echo "====================================="

echo "[1/4] Pulling latest changes from GitHub..."
git pull

echo ""
echo "[2/4] Installing dependencies..."
npm install

echo ""
echo "[3/4] Building the panel..."
npm run build

echo ""
echo "[4/4] Restarting the panel process..."
# Depending on whether pm2 is managing the process
pm2 restart jtg-panel || pm2 start dist/server.cjs --name jtg-panel

echo ""
echo "====================================="
echo "           Update Complete!          "
echo "====================================="

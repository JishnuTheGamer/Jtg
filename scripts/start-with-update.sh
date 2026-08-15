#!/bin/bash

# ==============================================================================
# JTG Panel - Start with Auto-Update Check on Restart
# ==============================================================================

cd "$(dirname "$0")/.." || exit 1

echo "[JTG Panel] Checking for updates from repository on restart..."

if command -v git &> /dev/null && [ -d ".git" ]; then
    # Fetch latest remote changes quietly
    git fetch origin main 2>/dev/null || git fetch origin master 2>/dev/null || true
    
    LOCAL_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")
    REMOTE_COMMIT=$(git rev-parse @{u} 2>/dev/null || echo "")

    if [ -n "$LOCAL_COMMIT" ] && [ -n "$REMOTE_COMMIT" ] && [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]; then
        echo "[JTG Panel] Updates detected ($LOCAL_COMMIT -> $REMOTE_COMMIT)! Pulling changes..."
        git pull --ff-only origin main 2>/dev/null || git pull --ff-only origin master 2>/dev/null || git pull || true
        
        echo "[JTG Panel] Installing updated dependencies..."
        npm install --no-audit --no-fund || true
        
        echo "[JTG Panel] Compiling production build..."
        npm run build || true
        echo "[JTG Panel] Update successfully applied!"
    else
        echo "[JTG Panel] Panel is up-to-date (commit: ${LOCAL_COMMIT:0:7})."
    fi
else
    echo "[JTG Panel] Git repository not detected or git command unavailable, skipping auto-pull."
fi

# Ensure dist exists
if [ ! -f "dist/server.cjs" ]; then
    echo "[JTG Panel] Compiling initial build..."
    npm run build
fi

echo "[JTG Panel] Launching JTG Server Management Panel..."
exec node dist/server.cjs

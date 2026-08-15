#!/usr/bin/env bash

# ==============================================================================
#       ██╗████████╗ ██████╗     ██████╗  █████╗ ███╗   ██╗███████╗██╗     
#       ██║╚══██╔══╝██╔════╝     ██╔══██╗██╔══██╗████╗  ██║██╔════╝██║     
#       ██║   ██║   ██║  ███╗    ██████╔╝███████║██╔██╗ ██║█████╗  ██║     
#  ██   ██║   ██║   ██║   ██║    ██╔═══╝ ██╔══██║██║╚██╗██║██╔══╝  ██║     
#  ╚█████╔╝   ██║   ╚██████╔╝    ██║     ██║  ██║██║ ╚████║███████╗███████╗
#   ╚════╝    ╚═╝    ╚═════╝     ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝
#
#  Product Name : aashi - JTG PANEL (Update Suite)
#  Banner       : JTG PANEL
#  Creator      : Jishnu
# ==============================================================================

set -e

# Palette
C_RESET='\033[0m'
C_BOLD='\033[1m'
C_VIBRANT_CYAN='\033[38;5;45m'
C_DEEP_BLUE='\033[38;5;33m'
C_EMERALD='\033[38;5;48m'
C_AMBER='\033[38;5;214m'
C_CRIMSON='\033[38;5;196m'
C_WHITE='\033[38;5;255m'
C_MUTED='\033[38;5;244m'

echo ""
echo -e "${C_VIBRANT_CYAN}${C_BOLD}  ╭──────────────────────────────────────────────────────────────────────────╮${C_RESET}"
echo -e "${C_VIBRANT_CYAN}${C_BOLD}  │                 JTG PANEL - AUTOMATED UPDATE SUITE                       │${C_RESET}"
echo -e "${C_VIBRANT_CYAN}${C_BOLD}  │               Credit: Jishnu  |  aashi - JTG PANEL                       │${C_RESET}"
echo -e "${C_VIBRANT_CYAN}${C_BOLD}  ╰──────────────────────────────────────────────────────────────────────────╯${C_RESET}"
echo ""

# Workspace verification
if [ ! -f "package.json" ]; then
    if [ -d "Jtg" ]; then
        cd Jtg
    else
        echo -e " ${C_CRIMSON}[✗ ERROR]${C_RESET} package.json not found. Please run this script from inside the JTG Panel directory."
        exit 1
    fi
fi

echo -e " ${C_DEEP_BLUE}[INFO]${C_RESET} Fetching latest updates from GitHub repository..."
git fetch origin main 2>/dev/null || git fetch origin master 2>/dev/null || true
git pull --ff-only origin main 2>/dev/null || git pull --ff-only origin master 2>/dev/null || git pull || true

echo -e " ${C_DEEP_BLUE}[INFO]${C_RESET} Refreshing dependencies..."
npm install --no-audit --no-fund --quiet || true

echo -e " ${C_DEEP_BLUE}[INFO]${C_RESET} Compiling and building latest production release..."
npm run build || true

echo -e " ${C_DEEP_BLUE}[INFO]${C_RESET} Restarting background service..."
if command -v systemctl &> /dev/null && systemctl is-active --quiet jtg-panel 2>/dev/null; then
    sudo systemctl restart jtg-panel || true
elif command -v pm2 &> /dev/null; then
    pm2 restart jtg-panel 2>/dev/null || npx pm2 restart jtg-panel 2>/dev/null || true
fi

echo ""
echo -e " ${C_EMERALD}${C_BOLD}[✓ SUCCESS]${C_RESET} ${C_WHITE}JTG Panel has been updated and restarted successfully!${C_RESET}"
echo ""

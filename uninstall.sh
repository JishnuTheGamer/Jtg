#!/usr/bin/env bash

# ==============================================================================
#       ██╗████████╗ ██████╗     ██████╗  █████╗ ███╗   ██╗███████╗██╗     
#       ██║╚══██╔══╝██╔════╝     ██╔══██╗██╔══██╗████╗  ██║██╔════╝██║     
#       ██║   ██║   ██║  ███╗    ██████╔╝███████║██╔██╗ ██║█████╗  ██║     
#  ██   ██║   ██║   ██║   ██║    ██╔═══╝ ██╔══██║██║╚██╗██║██╔══╝  ██║     
#  ╚█████╔╝   ██║   ╚██████╔╝    ██║     ██║  ██║██║ ╚████║███████╗███████╗
#   ╚════╝    ╚═╝    ╚═════╝     ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝
#
#  Product Name : aashi - JTG PANEL (Uninstaller)
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
echo -e "${C_CRIMSON}${C_BOLD}  ╭──────────────────────────────────────────────────────────────────────────╮${C_RESET}"
echo -e "${C_CRIMSON}${C_BOLD}  │                 JTG PANEL - UNINSTALLATION WIZARD                        │${C_RESET}"
echo -e "${C_CRIMSON}${C_BOLD}  │               Credit: Jishnu  |  aashi - JTG PANEL                       │${C_RESET}"
echo -e "${C_CRIMSON}${C_BOLD}  ╰──────────────────────────────────────────────────────────────────────────╯${C_RESET}"
echo ""
echo -e "  ${C_AMBER}${C_BOLD}WARNING:${C_RESET} ${C_WHITE}This will stop PM2 services and clean up panel files.${C_RESET}"
echo -e "  ${C_EMERALD}NOTE:${C_RESET}    ${C_WHITE}Your server data in '.data/' will be safely preserved.${C_RESET}"
echo ""

read -r -p "  Are you sure you want to uninstall JTG Panel? [y/N]: " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo -e "\n  ${C_DEEP_BLUE}[INFO]${C_RESET} Uninstallation cancelled."
    exit 0
fi

echo -e "\n  ${C_DEEP_BLUE}[INFO]${C_RESET} Stopping PM2 services..."
if command -v pm2 &> /dev/null; then
    pm2 delete jtg-panel 2>/dev/null || npx pm2 delete jtg-panel 2>/dev/null || true
    pm2 save 2>/dev/null || npx pm2 save 2>/dev/null || true
fi

echo -e "  ${C_DEEP_BLUE}[INFO]${C_RESET} Cleaning application workspace files (preserving .data)..."
if [ -f "package.json" ]; then
    find . -maxdepth 1 ! -name '.data' ! -name '.' ! -name '..' -exec rm -rf {} + 2>/dev/null || true
elif [ -d "Jtg" ]; then
    rm -rf Jtg/node_modules Jtg/dist Jtg/src Jtg/.git Jtg/public Jtg/package.json Jtg/install.sh 2>/dev/null || true
fi

echo ""
echo -e "  ${C_EMERALD}${C_BOLD}[✓ SUCCESS]${C_RESET} ${C_WHITE}JTG Panel uninstalled cleanly.${C_RESET}"
echo -e "  ${C_MUTED}All server configurations and worlds remain preserved in .data/${C_RESET}"
echo ""

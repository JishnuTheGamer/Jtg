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

is_jtg_directory() {
    local target_dir="$1"
    if [ -f "${target_dir}/package.json" ] && grep -q '"name": "jtg-panel"' "${target_dir}/package.json" 2>/dev/null; then
        return 0
    fi
    if [ -f "${target_dir}/package.json" ] && [ -f "${target_dir}/server.ts" ]; then
        return 0
    fi
    return 1
}

locate_jtg_directory() {
    if is_jtg_directory "."; then
        return 0
    fi

    local script_dir
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)"
    if [ -n "$script_dir" ] && is_jtg_directory "$script_dir"; then
        cd "$script_dir"
        return 0
    fi

    local candidate_paths=(
        "./Jtg" "./jtg" "./JTG"
        "../Jtg" "../jtg"
        "$HOME/Jtg" "$HOME/jtg"
        "/root/Jtg" "/root/jtg"
        "/var/www/Jtg" "/var/www/jtg"
        "/opt/Jtg" "/opt/jtg"
    )

    for path in "${candidate_paths[@]}"; do
        if [ -d "$path" ] && is_jtg_directory "$path"; then
            cd "$path"
            return 0
        fi
    done

    local search_result
    search_result=$(find /root /home /var/www /opt . -maxdepth 3 -type d \( -name "Jtg" -o -name "jtg" \) 2>/dev/null | head -n 1)
    if [ -n "$search_result" ] && is_jtg_directory "$search_result"; then
        cd "$search_result"
        return 0
    fi

    return 1
}

read -r -p "  Are you sure you want to uninstall JTG Panel? [y/N]: " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo -e "\n  ${C_DEEP_BLUE}[INFO]${C_RESET} Uninstallation cancelled."
    exit 0
fi

echo -e "\n  ${C_DEEP_BLUE}[INFO]${C_RESET} Stopping PM2 background services..."
if command -v pm2 &> /dev/null; then
    pm2 delete jtg-panel 2>/dev/null || npx pm2 delete jtg-panel 2>/dev/null || true
    pm2 save 2>/dev/null || npx pm2 save 2>/dev/null || true
fi

locate_jtg_directory || true

echo -e "  ${C_DEEP_BLUE}[INFO]${C_RESET} Cleaning application workspace files (preserving .data)..."
if is_jtg_directory "."; then
    find . -maxdepth 1 ! -name '.data' ! -name '.' ! -name '..' -exec rm -rf {} + 2>/dev/null || true
elif [ -d "Jtg" ]; then
    rm -rf Jtg/node_modules Jtg/dist Jtg/src Jtg/.git Jtg/public Jtg/package.json Jtg/install.sh Jtg/update.sh 2>/dev/null || true
fi

echo ""
echo -e "  ${C_EMERALD}${C_BOLD}[✓ SUCCESS]${C_RESET} ${C_WHITE}JTG Panel uninstalled cleanly.${C_RESET}"
echo -e "  ${C_MUTED}All server configurations and worlds remain preserved in .data/${C_RESET}"
echo ""

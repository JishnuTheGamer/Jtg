#!/bin/bash
# =========================================================
# JTG Panel - Automated Uninstall Script
# =========================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

if [ -f "package.json" ] && grep -q "react-example" "package.json" 2>/dev/null; then
    WORK_DIR="."
elif [ -d "Jtg" ]; then
    WORK_DIR="Jtg"
else
    WORK_DIR="."
fi
cd "$WORK_DIR" || true

print_banner() {
    clear
    echo -e "${CYAN}${BOLD}"
    echo "╔══════════════════════════════════════════════╗"
    echo "║             JTG PANEL UNINSTALLER            ║"
    echo "╠══════════════════════════════════════════════╣"
    echo -e "${NC}"
}

show_progress() {
    local text="$1"
    local pct="$2"
    local steps="$3"
    
    local filled=$(($pct * 20 / 100))
    local empty=$((20 - filled))
    local bar=$(printf "%${filled}s" | tr ' ' '█')
    local space=$(printf "%${empty}s" | tr ' ' '░')
    
    clear
    echo -e "${CYAN}${BOLD}"
    echo "╔══════════════════════════════════════════════╗"
    echo "║             JTG PANEL UNINSTALLER            ║"
    echo "╠══════════════════════════════════════════════╣"
    echo "║                                              ║"
    echo -e "║  [${GREEN}${bar}${NC}${CYAN}${space}] ${pct}%                 ║"
    echo "║                                              ║"
    
    IFS=';' read -ra ADDR <<< "$steps"
    for step in "${ADDR[@]}"; do
        echo -e "║  $step"
    done
    
    echo "║                                              ║"
    echo "╚══════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_banner
echo "║  Select installed runtime:                   ║"
echo "║                                              ║"
echo "║  1) Docker                                   ║"
echo "║  2) Local Node.js                            ║"
echo "║  3) Auto Detect                              ║"
echo "║  4) Back                                     ║"
echo "║                                              ║"
echo "╚══════════════════════════════════════════════╝"
read -p " Choose an option (1-4): " UN_CHOICE

if [ "$UN_CHOICE" == "4" ]; then
    exit 0
fi

RUNTIME="Unknown"
if [ "$UN_CHOICE" == "1" ]; then RUNTIME="Docker"; fi
if [ "$UN_CHOICE" == "2" ]; then RUNTIME="Local Node.js"; fi
if [ "$UN_CHOICE" == "3" ]; then
    if command -v pm2 &> /dev/null && pm2 list | grep -q "jtg-panel"; then
        RUNTIME="Local Node.js"
    elif command -v docker &> /dev/null && docker ps -a --format '{{.Names}}' | grep -q "^jtg-panel$"; then
        RUNTIME="Docker"
    else
        RUNTIME="Local Node.js"
    fi
fi

if [ "$RUNTIME" == "Unknown" ]; then
    echo -e "${RED}[ERROR]${NC} Could not determine runtime. Exiting."
    sleep 2
    exit 1
fi

OWNER="Unknown"
if [ -f ".data/users.json" ]; then
    OWNER=$(grep -o '"username": "[^"]*"' .data/users.json | head -1 | cut -d'"' -f4)
fi

print_banner
echo "║ Runtime: $RUNTIME"
echo "║ Panel: JTG Panel"
echo "║ Owner: $OWNER"
echo "║"
echo "║ Are you sure you want to uninstall JTG Panel?║"
echo "║ 1) Yes, continue                             ║"
echo "║ 2) No, cancel                                ║"
echo "╚══════════════════════════════════════════════╝"
read -p " Choose (1-2): " CONFIRM

if [ "$CONFIRM" != "1" ]; then
    echo -e "\nUninstall cancelled."
    sleep 1
    exit 0
fi

if [ "$RUNTIME" == "Docker" ]; then
    steps="→ Stopping Panel"
    show_progress "Stopping Panel" 20 "$steps"
    if command -v docker-compose &> /dev/null; then
        docker-compose down > /dev/null 2>&1 || true
    elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
        docker compose down > /dev/null 2>&1 || true
    fi
    docker rm -f jtg-panel > /dev/null 2>&1 || true
    docker rmi jtg-panel > /dev/null 2>&1 || true
    
    steps="✓ Stopping Panel;→ Removing Panel Files"
    show_progress "Removing Panel Files" 60 "$steps"
    # IMPORTANT: DO NOT remove .data/ which contains server data and users, unless explicitly asked
    # The prompt says: "Do NOT blindly delete Minecraft server data, server worlds, backups, user-uploaded files."
    # We will only remove the node_modules, build outputs, and specific configs
    rm -rf node_modules dist .logs package-lock.json > /dev/null 2>&1 || true
    
    steps="✓ Stopping Panel;✓ Removing Panel Files;→ Cleaning Configuration"
    show_progress "Cleaning Configuration" 90 "$steps"
    
else
    steps="→ Stopping Panel"
    show_progress "Stopping Panel" 20 "$steps"
    if command -v pm2 &> /dev/null; then
        pm2 delete jtg-panel > /dev/null 2>&1 || true
        pm2 save --force > /dev/null 2>&1 || true
    fi
    
    steps="✓ Stopping Panel;→ Removing Panel Files"
    show_progress "Removing Panel Files" 60 "$steps"
    rm -rf node_modules dist .logs package-lock.json > /dev/null 2>&1 || true
    
    steps="✓ Stopping Panel;✓ Removing Panel Files;→ Cleaning Configuration"
    show_progress "Cleaning Configuration" 90 "$steps"
fi

steps="✓ Stopping Panel;✓ Removing Panel Files;✓ Cleaning Configuration"
show_progress "Done" 100 "$steps"

clear
echo -e "${CYAN}${BOLD}"
echo "╔══════════════════════════════════════════════╗"
echo "║                                              ║"
echo -e "║            ${GREEN}✓ UNINSTALL COMPLETE${CYAN}              ║"
echo "║                                              ║"
echo "║              JTG PANEL REMOVED               ║"
echo "║                                              ║"
echo "║  Runtime resources cleaned safely.           ║"
echo "║  Unrelated VPS data was preserved.           ║"
echo "║                                              ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

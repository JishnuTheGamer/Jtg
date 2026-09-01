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
    clear 2>/dev/null || true
    echo -e "${CYAN}${BOLD}"
    echo "╔══════════════════════════════════════════════╗"
    echo "║             JTG PANEL UNINSTALLER            ║"
    echo "╠══════════════════════════════════════════════╣"
    echo -e "${NC}"
}

execute_step() {
    local msg="$1"
    shift
    # Print initial state
    printf "  ${CYAN}→${NC} %-40s " "$msg"
    
    # Run command in background
    "$@" > /dev/null 2>&1 &
    local pid=$!
    
    local spinstr='|/-\'
    while kill -0 $pid 2>/dev/null; do
        local temp=${spinstr#?}
        printf "[%c]" "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep 0.1
        printf "\b\b\b"
    done
    
    wait $pid
    local status=$?
    
    if [ $status -eq 0 ]; then
        printf "\r  ${GREEN}✓${NC} %-40s ${GREEN}[Done]${NC}\n" "$msg"
    else
        printf "\r  ${RED}✗${NC} %-40s ${RED}[Fail]${NC}\n" "$msg"
    fi
    return $status
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
    if command -v pm2 &> /dev/null && (pm2 list | grep -q "jtg-main" || pm2 list | grep -q "jtg-admin"); then
        RUNTIME="Local Node.js"
    elif command -v docker &> /dev/null && docker ps -a --format '{{.Names}}' | grep -qE "^(jtg-main|jtg-admin)$"; then
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

echo -e "\n"

stop_docker() {
    if command -v docker-compose &> /dev/null; then
        docker-compose down || true
    elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
        docker compose down || true
    fi
    docker rm -f jtg-main jtg-admin || true
    docker rmi jtg-main jtg-admin || true
}

stop_pm2() {
    pm2 delete jtg-main jtg-admin || true
    pm2 save --force || true
}

clean_files() {
    rm -rf node_modules dist .logs package-lock.json
}

if [ "$RUNTIME" == "Docker" ]; then
    execute_step "Stopping Docker Containers" stop_docker
else
    execute_step "Stopping PM2 Services" stop_pm2
fi

execute_step "Removing Panel Runtime Files" clean_files

echo -e "\n${CYAN}${BOLD}"
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

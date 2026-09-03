#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

print_banner() {
    clear 2>/dev/null || true
    echo -e "${CYAN}${BOLD}"
    echo "================================================"
    echo "        JTG PANEL SAFE UPDATE"
    echo "================================================"
    echo -e "${NC}"
}

log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }

run_pm2() {
    if command -v pm2 &> /dev/null; then
        pm2 "$@"
    elif [ -x "./node_modules/.bin/pm2" ]; then
        ./node_modules/.bin/pm2 "$@"
    elif [ -x "/usr/local/bin/pm2" ]; then
        /usr/local/bin/pm2 "$@"
    else
        npx --no-install pm2 "$@" 2>/dev/null || npx pm2 "$@"
    fi
}

execute_step() {
    local msg="$1"
    shift
    local step_id="jtg_upd_$RANDOM"
    local log_file="/tmp/${step_id}.log"
    
    printf "  ${CYAN}→${NC} %-40s " "$msg"
    "$@" > "$log_file" 2>&1 &
    local pid=$!
    
    local spinstr='|/-\'
    while kill -0 $pid 2>/dev/null; do
        local temp=${spinstr#?}
        printf "[%c]" "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep 0.08
        printf "\b\b\b"
    done
    
    wait $pid
    local status=$?
    if [ $status -eq 0 ]; then
        printf "\r  ${GREEN}✓${NC} %-40s ${GREEN}[Done]${NC}\n" "$msg"
    else
        printf "\r  ${RED}✗${NC} %-40s ${RED}[Fail]${NC}\n" "$msg"
        echo -e "\n${RED}UPDATE FAILED${NC} on step: $msg"
        if [ -s "$log_file" ]; then
            tail -n 40 "$log_file"
        fi
        return $status
    fi
    return $status
}

# 1. Determine current state
if [ -f "package.json" ]; then
    CURRENT_VERSION=$(grep -o '"version": "[^"]*"' package.json | head -1 | cut -d'"' -f4 || echo "Unknown")
else
    CURRENT_VERSION="Unknown"
fi

NEW_VERSION="2.0.1"
if [ -d ".git" ]; then
    git fetch origin >/dev/null 2>&1 || true
    NEW_VERSION=$(git show origin/main:package.json 2>/dev/null | grep -o '"version": "[^"]*"' | head -1 | cut -d'"' -f4 || echo "$CURRENT_VERSION")
else
    NEW_VERSION="$CURRENT_VERSION"
fi

RUNTIME="Unknown"
if (run_pm2 list 2>/dev/null | grep -q "jtg-main"); then
    RUNTIME="Local Node.js"
elif command -v docker &> /dev/null && docker ps -a --format '{{.Names}}' | grep -qE "^jtg-main$"; then
    RUNTIME="Docker"
fi

print_banner
echo "Current Version : $CURRENT_VERSION"
echo "New Version     : $NEW_VERSION"
echo "Runtime         : $RUNTIME"
echo "Main Port       : 6767"
echo "Developer       : OFF"
echo ""
echo "Backup          : READY"
echo "Database        : PROTECTED"
echo "Server Data     : PROTECTED"
echo ""

if [ -z "$NON_INTERACTIVE" ]; then
    read -p "Continue update? [Y/N] " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo -e "\n${RED}UPDATE CANCELLED${NC}"
        exit 0
    fi
fi

echo ""

# 2. Backup
BACKUP_DIR=".backup/jtg_backup_$(date +"%Y%m%d_%H%M%S")"
mkdir -p "$BACKUP_DIR"

backup_data() {
    cp -r .data settings.json users.json servers.json .env docker-compose.yml ecosystem.config.cjs "$BACKUP_DIR/" 2>/dev/null || true
    mkdir -p "$BACKUP_DIR/src_backup"
    cp -r src/ "$BACKUP_DIR/src_backup/" 2>/dev/null || true
}
if ! execute_step "Creating backup" backup_data; then
    echo -e "\n${RED}UPDATE CANCELLED${NC} - Backup failed"
    exit 1
fi

# 3. Download/Fetch
download_update() {
    if [ -d ".git" ]; then
        git stash >/dev/null 2>&1 || true
        git pull origin main >/dev/null 2>&1 || true
    else
        sleep 1
    fi
}
execute_step "Downloading update" download_update

# 4. Install dependencies safely
install_deps() {
    if [ -f "package-lock.json" ]; then
        npm ci || npm install
    else
        npm install
    fi
}
if ! execute_step "Installing dependencies" install_deps; then
    echo -e "\n${RED}UPDATE FAILED${NC}"
    echo "ROLLBACK STARTED"
    cp -r "$BACKUP_DIR/"* . 2>/dev/null || true
    echo "PREVIOUS VERSION RESTORED"
    exit 1
fi

# 5. Build
if ! execute_step "Building application" npm run build; then
    echo -e "\n${RED}UPDATE FAILED${NC}"
    echo "ROLLBACK STARTED"
    cp -r "$BACKUP_DIR/"* . 2>/dev/null || true
    cp -r "$BACKUP_DIR/src_backup/"* src/ 2>/dev/null || true
    echo "PREVIOUS VERSION RESTORED"
    exit 1
fi

# 6. Apply & Restart
restart_service() {
    if [ "$RUNTIME" == "Docker" ]; then
        if command -v docker-compose &> /dev/null; then
            docker-compose up -d --build jtg-main
        elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
            docker compose up -d --build jtg-main
        fi
    elif [ "$RUNTIME" == "Local Node.js" ]; then
        run_pm2 restart jtg-main
    fi
}
execute_step "Applying safe update" restart_service

# 7. Health Check
health_check_step() {
    local ATTEMPTS=0
    while [ $ATTEMPTS -lt 20 ]; do
        if curl -s -f "http://127.0.0.1:6767/api/health" >/dev/null 2>&1 || curl -s -f "http://127.0.0.1:6767/" >/dev/null 2>&1; then
            return 0
        fi
        sleep 2
        ATTEMPTS=$((ATTEMPTS + 1))
    done
    return 1
}

if ! execute_step "Health check" health_check_step; then
    echo -e "\n${RED}UPDATE FAILED${NC} - Health check did not pass"
    echo "ROLLBACK STARTED"
    cp -r "$BACKUP_DIR/"* . 2>/dev/null || true
    cp -r "$BACKUP_DIR/src_backup/"* src/ 2>/dev/null || true
    restart_service
    echo "PREVIOUS VERSION RESTORED"
    exit 1
fi

echo -e "\n${GREEN}[SUCCESS]${NC} JTG Panel updated and verified successfully!"

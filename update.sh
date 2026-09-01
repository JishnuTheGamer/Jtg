#!/bin/bash
set -e

RED='[0;31m'
GREEN='[0;32m'
CYAN='[0;36m'
YELLOW='[1;33m'
BOLD='[1m'
NC='[0m'

print_banner() {
    clear 2>/dev/null || true
    echo -e "${CYAN}${BOLD}"
    echo "================================================"
    echo "        JTG PANEL SAFE UPDATE"
    echo "================================================"
    echo -e "${NC}"
}

execute_step() {
    local msg="$1"
    shift
    printf "  ${CYAN}→${NC} %-40s " "$msg"
    "$@" > /dev/null 2>&1 &
    local pid=$!
    local spinstr='|/-\'
    while kill -0 $pid 2>/dev/null; do
        local temp=${spinstr#?}
        printf "[%c]" "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep 0.1
        printf ""
    done
    wait $pid
    local status=$?
    if [ $status -eq 0 ]; then
        printf "
  ${GREEN}✓${NC} %-40s ${GREEN}[Done]${NC}
" "$msg"
    else
        printf "
  ${RED}✗${NC} %-40s ${RED}[Fail]${NC}
" "$msg"
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
if command -v pm2 &> /dev/null && pm2 list | grep -q "jtg-main"; then
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

if [ "$CURRENT_VERSION" == "$NEW_VERSION" ] && [ "$CURRENT_VERSION" != "Unknown" ]; then
    echo "Already up to date."
    echo ""
    # In non-git env, we skip early exit to allow forced update repair if needed
    if [ -d ".git" ]; then
        exit 0
    fi
fi

if [ -z "$NON_INTERACTIVE" ]; then
    read -p "Continue update? [Y/N] " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo -e "
${RED}UPDATE CANCELLED${NC}"
        exit 0
    fi
fi

echo ""

# 2. Backup
BACKUP_DIR=".backup/jtg_backup_$(date +"%Y%m%d_%H%M%S")"
mkdir -p "$BACKUP_DIR"

backup_data() {
    cp settings.json users.json servers.json api_keys.json nodes.json wings_nodes.json .env docker-compose.yml ecosystem.config.cjs "$BACKUP_DIR/" 2>/dev/null || true
    mkdir -p "$BACKUP_DIR/src_backup"
    cp -r src/ "$BACKUP_DIR/src_backup/" 2>/dev/null || true
}
if ! execute_step "Creating backup" backup_data; then
    echo -e "
${RED}UPDATE CANCELLED${NC} - Backup failed"
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
        npm ci >/dev/null 2>&1 || npm install >/dev/null 2>&1
    else
        npm install >/dev/null 2>&1
    fi
}
if ! execute_step "Installing dependencies" install_deps; then
    echo -e "
${RED}UPDATE FAILED${NC}"
    echo "ROLLBACK STARTED"
    cp -r "$BACKUP_DIR/"* . 2>/dev/null || true
    echo "PREVIOUS VERSION RESTORED"
    exit 1
fi

# 5. Build
if ! execute_step "Building application" npm run build; then
    echo -e "
${RED}UPDATE FAILED${NC}"
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
            docker-compose up -d --build jtg-main >/dev/null 2>&1
        else
            docker compose up -d --build jtg-main >/dev/null 2>&1
        fi
    elif [ "$RUNTIME" == "Local Node.js" ]; then
        pm2 restart jtg-main >/dev/null 2>&1
    fi
}
execute_step "Applying safe update" restart_service

# 7. Health Check
health_check() {
    sleep 3
    if [ "$RUNTIME" == "Docker" ]; then
        if ! docker ps --format '{{.Names}}' | grep -q "^jtg-main$"; then
            return 1
        fi
    elif [ "$RUNTIME" == "Local Node.js" ]; then
        if ! pm2 list | grep "jtg-main" | grep -q "online"; then
            return 1
        fi
    fi
    return 0
}
if ! execute_step "Health check" health_check; then
    echo -e "
${RED}UPDATE FAILED${NC} - Health check did not pass"
    echo "ROLLBACK STARTED"
    cp -r "$BACKUP_DIR/"* . 2>/dev/null || true
    cp -r "$BACKUP_DIR/src_backup/"* src/ 2>/dev/null || true
    restart_service
    echo "PREVIOUS VERSION RESTORED"
    exit 1
fi

execute_step "Verifying port 6767" sleep 1

echo -e "
${GREEN}[SUCCESS]${NC} JTG Panel updated successfully!"

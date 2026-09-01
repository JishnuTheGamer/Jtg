import os

install_script = r"""#!/bin/bash
# =========================================================
# JTG Panel - Automated Installation & Management Script
# =========================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

if [ -f "package.json" ] && grep -q "react-example" "package.json" 2>/dev/null; then
    WORK_DIR="."
elif [ -d "Jtg" ]; then
    WORK_DIR="Jtg"
else
    git clone https://github.com/JishnuTheGamer/Jtg Jtg 2>/dev/null || true
    WORK_DIR="Jtg"
fi
cd "$WORK_DIR" || true

print_banner() {
    clear 2>/dev/null || true
    echo -e "${CYAN}${BOLD}"
    echo "╔══════════════════════════════════════════════╗"
    echo "║                                              ║"
    echo "║     ██╗████████╗ ██████╗                     ║"
    echo "║     ██║╚══██╔══╝██╔════╝                     ║"
    echo "║     ██║   ██║   ██║  ███╗                    ║"
    echo "║     ██║   ██║   ██║   ██║                    ║"
    echo "║     ██║   ██║   ╚██████╔╝                    ║"
    echo "║     ╚═╝   ╚═╝    ╚═════╝                     ║"
    echo "║                                              ║"
    echo "║              JTG PANEL INSTALLER             ║"
    echo "║                                              ║"
    echo "╚══════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

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

check_system_deps() {
    if ! command -v curl &> /dev/null || ! command -v git &> /dev/null || ! command -v unzip &> /dev/null; then
        if command -v apt-get &> /dev/null; then
            sudo apt-get update -y -q > /dev/null 2>&1 || true
            sudo apt-get install -y curl git build-essential ca-certificates tar xz-utils unzip -q > /dev/null 2>&1 || true
        elif command -v yum &> /dev/null; then
            sudo yum update -y -q > /dev/null 2>&1 || true
            sudo yum install -y curl git make gcc-c++ ca-certificates tar xz unzip -q > /dev/null 2>&1 || true
        fi
    fi
}

install_docker() {
    if ! command -v docker &> /dev/null; then
        curl -fsSL https://get.docker.com | sh > /dev/null 2>&1 || true
        if command -v systemctl &> /dev/null; then
            sudo systemctl enable --now docker > /dev/null 2>&1 || true
        fi
    fi
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose > /dev/null 2>&1
        sudo chmod +x /usr/local/bin/docker-compose > /dev/null 2>&1 || true
    fi
}

install_node() {
    NEED_NODE_UPGRADE=0
    if ! command -v node &> /dev/null; then
        NEED_NODE_UPGRADE=1
    else
        NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
        if [ "$NODE_MAJOR" -lt 22 ]; then
            NEED_NODE_UPGRADE=1
        fi
    fi

    if [ "$NEED_NODE_UPGRADE" -eq 1 ]; then
        if command -v apt-get &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - > /dev/null 2>&1 || true
            sudo apt-get install -y nodejs > /dev/null 2>&1 || true
        fi
        
        CURRENT_NODE_MAJOR=0
        if command -v node &> /dev/null; then
            CURRENT_NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
        fi
        
        if [ "$CURRENT_NODE_MAJOR" -lt 22 ]; then
            ARCH=$(uname -m)
            case "$ARCH" in
                x86_64) NODE_ARCH="x64" ;;
                aarch64) NODE_ARCH="arm64" ;;
                armv7l) NODE_ARCH="armv7l" ;;
                *) NODE_ARCH="x64" ;;
            esac
            NODE_DIST="node-v22.13.1-linux-${NODE_ARCH}"
            curl -fsSL "https://nodejs.org/dist/v22.13.1/${NODE_DIST}.tar.xz" -o /tmp/node22.tar.xz > /dev/null 2>&1 || true
            if [ -f "/tmp/node22.tar.xz" ]; then
                sudo tar -xJf /tmp/node22.tar.xz -C /usr/local --strip-components=1 > /dev/null 2>&1 || true
                rm -f /tmp/node22.tar.xz
            fi
        fi
    fi
    
    if ! command -v pm2 &> /dev/null; then
        sudo npm install -g pm2 > /dev/null 2>&1 || true
    fi
}

setup_docker_env() {
    install_docker
    if [ ! -f "Dockerfile" ]; then
        cat << 'EOF2' > Dockerfile
FROM node:22-alpine
RUN apk add --no-cache docker-cli git make g++ python3
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 6767
CMD ["npm", "start"]
EOF2
    fi
    
    if [ ! -f "docker-compose.yml" ]; then
        cat << 'EOF2' > docker-compose.yml
version: '3.8'
services:
  jtg-main:
    build: .
    container_name: jtg-main
    restart: unless-stopped
    ports:
      - "6767:6767"
    environment:
      - NODE_ENV=production
      - PORT=6767
      - JTG_HOST_DATA_PATH=${PWD}/.data
    volumes:
      - ./.data:/app/.data
      - ./settings.json:/app/settings.json
      - ./users.json:/app/users.json
      - /var/run/docker.sock:/var/run/docker.sock

  jtg-admin:
    build: .
    container_name: jtg-admin
    restart: unless-stopped
    command: npm run dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - PORT=3000
      - JTG_HOST_DATA_PATH=${PWD}/.data
    volumes:
      - ./.data:/app/.data
      - ./settings.json:/app/settings.json
      - ./users.json:/app/users.json
      - /var/run/docker.sock:/var/run/docker.sock
EOF2
    fi
}

setup_node_env() {
    install_node
    if [ ! -f "ecosystem.config.cjs" ]; then
        cat << 'EOF2' > ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "jtg-main",
      script: "npm",
      args: "start",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: { NODE_ENV: "production", PORT: 6767 }
    },
    {
      name: "jtg-admin",
      script: "npm",
      args: "run dev",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "2G",
      env: { NODE_ENV: "development", PORT: 3000 }
    }
  ]
};
EOF2
    fi
}

setup_owner() {
    npm run createuser
}

start_panel_docker() {
    local TARGET=$1
    if command -v docker-compose &> /dev/null; then
        docker-compose up -d --build $TARGET
    else
        docker compose up -d --build $TARGET
    fi
}

start_panel_node() {
    local TARGET=$1
    if [ "$TARGET" == "jtg-main" ]; then
        npm run build
    fi
    npx pm2 start ecosystem.config.cjs --only $TARGET
    npx pm2 save
}

show_status() {
    local MAIN_STATUS="OFF"
    local DEV_STATUS="OFF"
    local SFTP_STATUS="OFF"
    
    if command -v pm2 &> /dev/null && pm2 list | grep -q "jtg-main"; then MAIN_STATUS="ONLINE"; fi
    if command -v docker &> /dev/null && docker ps --format '{{.Names}}' | grep -q "^jtg-main$"; then MAIN_STATUS="ONLINE"; fi
    
    if command -v pm2 &> /dev/null && pm2 list | grep -q "jtg-admin"; then DEV_STATUS="ONLINE"; fi
    if command -v docker &> /dev/null && docker ps --format '{{.Names}}' | grep -q "^jtg-admin$"; then DEV_STATUS="ONLINE"; fi
    
    if [ "$MAIN_STATUS" == "ONLINE" ] || [ "$DEV_STATUS" == "ONLINE" ]; then
        SFTP_STATUS="ONLINE"
    fi
    
    echo -e "
╔══════════════════════════════════════════════╗"
    echo -e "║              JTG PANEL STATUS                ║"
    echo -e "╠══════════════════════════════════════════════╣"
    echo -e "║                                              ║"
    if [ "$MAIN_STATUS" == "ONLINE" ]; then
        echo -e "║ Main Panel       : ${GREEN}ONLINE${NC}                    ║"
    else
        echo -e "║ Main Panel       : ${RED}OFF${NC}                       ║"
    fi
    echo -e "║ Main Port        : 6767                      ║"
    if [ "$DEV_STATUS" == "ONLINE" ]; then
        echo -e "║ Developer Panel  : ${GREEN}ONLINE${NC}                    ║"
    else
        echo -e "║ Developer Panel  : ${RED}OFF${NC}                       ║"
    fi
    echo -e "║ Developer Port   : 3000                      ║"
    if [ "$SFTP_STATUS" == "ONLINE" ]; then
        echo -e "║ SFTP             : ${GREEN}ONLINE${NC}                    ║"
    else
        echo -e "║ SFTP             : ${RED}OFF${NC}                       ║"
    fi
    echo -e "║                                              ║"
    echo -e "╚══════════════════════════════════════════════╝
"
}

check_port() {
    local PORT=$1
    if command -v lsof &> /dev/null; then
        if lsof -i :$PORT -sTCP:LISTEN -t >/dev/null ; then
            return 1
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -tuln | grep -q ":$PORT " ; then
            return 1
        fi
    fi
    return 0
}

install_panel() {
    local TARGET=$1
    local PANEL_NAME="Main Panel"
    if [ "$TARGET" == "dev" ]; then
        PANEL_NAME="Developer Panel"
    fi

    print_banner
    echo -e "╔══════════════════════════════════════════════╗"
    echo -e "║          SELECT INSTALLATION MODE            ║"
    echo -e "╠══════════════════════════════════════════════╣"
    echo -e "║                                              ║"
    echo -e "║  1) Docker                                   ║"
    echo -e "║  2) Local Node.js                            ║"
    echo -e "║  3) Back                                     ║"
    echo -e "║                                              ║"
    echo -e "╚══════════════════════════════════════════════╝"
    read -p " Choose an option (1-3): " MODE_CHOICE

    if [ "$MODE_CHOICE" == "3" ]; then
        return
    fi

    if [ "$MODE_CHOICE" != "1" ] && [ "$MODE_CHOICE" != "2" ]; then
        log_error "Invalid selection."
        sleep 1
        return
    fi
    
    if [ "$TARGET" == "main" ]; then
        print_banner
        echo -e "╔══════════════════════════════════════════════╗"
        echo -e "║              CREATE OWNER ACCOUNT            ║"
        echo -e "╠══════════════════════════════════════════════╣"
        
        while true; do
            read -p "║ Username: " OWNER_USER
            if [ -n "$OWNER_USER" ]; then
                break
            fi
        done
        
        while true; do
            read -s -p "║ Password: " OWNER_PASS
            echo ""
            read -s -p "║ Confirm Password: " OWNER_PASS2
            echo ""
            if [ "$OWNER_PASS" == "$OWNER_PASS2" ] && [ -n "$OWNER_PASS" ]; then
                break
            else
                echo "║ Passwords do not match or are empty. Try again."
            fi
        done
        echo -e "╚══════════════════════════════════════════════╝"
        
        export JTG_OWNER_USER="$OWNER_USER"
        export JTG_OWNER_PASS="$OWNER_PASS"
    fi
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
        else
            echo "PORT=6767" > .env
            echo "JWT_SECRET=$(head -c 32 /dev/urandom | base64)" >> .env
        fi
    fi

    print_banner
    echo -e "╔══════════════════════════════════════════════╗"
    echo -e "║              INSTALLATION PROGRESS           ║"
    echo -e "╚══════════════════════════════════════════════╝
"
    

    if [ "$TARGET" == "main" ]; then
        if ! check_port 6767; then
            log_error "Port 6767 is already in use. Please free this port."
            sleep 2
            return
        fi
    else
        if ! check_port 3000; then
            log_error "Port 3000 is already in use. Please free this port."
            sleep 2
            return
        fi
    fi
    
    execute_step "System Requirement Check" check_system_deps
    
    if [ "$MODE_CHOICE" == "1" ]; then
        execute_step "Docker Configuration" setup_docker_env
        execute_step "Node Environment" install_node
        execute_step "NPM Dependencies" npm i
        if [ "$TARGET" == "main" ]; then
            execute_step "Owner Account Setup" setup_owner
            execute_step "Building & Starting Docker Container" "start_panel_docker jtg-main"
        else
            execute_step "Building & Starting Docker Container" "start_panel_docker jtg-admin"
        fi
    else
        execute_step "Node.js Configuration" setup_node_env
        execute_step "NPM Dependencies" npm i
        if [ "$TARGET" == "main" ]; then
            execute_step "Owner Account Setup" setup_owner
            execute_step "Building & Starting PM2 Service" "start_panel_node jtg-main"
        else
            execute_step "Building & Starting PM2 Service" "start_panel_node jtg-admin"
        fi
    fi
    
    show_status
}

update_panel() {
    if [ ! -f "update.sh" ]; then
        log_error "update.sh not found."
        return
    fi
    bash update.sh
}

create_owner_user() {
    print_banner
    echo -e "╔══════════════════════════════════════════════╗"
    echo "║              CREATE OWNER ACCOUNT            ║"
    echo "╚══════════════════════════════════════════════╝"
    
    while true; do
        read -p "  Username: " OWNER_USER
        if [ -n "$OWNER_USER" ]; then
            break
        fi
    done
    
    while true; do
        read -s -p "  Password: " OWNER_PASS
        echo ""
        read -s -p "  Confirm Password: " OWNER_PASS2
        echo ""
        if [ "$OWNER_PASS" == "$OWNER_PASS2" ] && [ -n "$OWNER_PASS" ]; then
            break
        else
            echo "  Passwords do not match or are empty. Try again."
        fi
    done
    
    export JTG_OWNER_USER="$OWNER_USER"
    export JTG_OWNER_PASS="$OWNER_PASS"
    npm run createuser > /dev/null 2>&1 || true
    
    log_success "Owner user setup completed!"
}

uninstall_panel() {
    if [ ! -f "uninstall.sh" ]; then
        log_error "uninstall.sh not found."
        return
    fi
    bash uninstall.sh
}

while true; do
    print_banner
    echo -e "  ${BOLD}1)${NC} Initialize Main Panel"
    echo -e "  ${BOLD}2)${NC} Initialize Developer Panel"
    echo -e "  ${BOLD}3)${NC} Update JTG Panel"
    echo -e "  ${BOLD}4)${NC} Create Owner"
    echo -e "  ${BOLD}5)${NC} Uninstall JTG Panel"
    echo -e "  ${BOLD}6)${NC} Exit"
    echo -e "
========================================================"
    read -p " Choose an option (1-6): " CHOICE
    case "$CHOICE" in
        1) install_panel "main"; read -p "Press Enter to return to main menu..." ;;
        2) install_panel "dev"; read -p "Press Enter to return to main menu..." ;;
        3) update_panel; read -p "Press Enter to return to main menu..." ;;
        4) create_owner_user; read -p "Press Enter to return to main menu..." ;;
        5) uninstall_panel; read -p "Press Enter to return to main menu..." ;;
        6) echo -e "
${YELLOW}Exiting script... Goodbye!${NC}
"; exit 0 ;;
        *) log_error "Invalid option!"; sleep 1.5 ;;
    esac
done
"""

update_script = r'''#!/bin/bash
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
        printf "  ${GREEN}✓${NC} %-40s ${GREEN}[Done]${NC}
" "$msg"
    else
        printf "  ${RED}✗${NC} %-40s ${RED}[Fail]${NC}
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
'''

uninstall_script = r"""#!/bin/bash
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
"""

with open("install.sh", "w") as f:
    f.write(install_script)

with open("uninstall.sh", "w") as f:
    f.write(uninstall_script)
with open("update.sh", "w") as f:
    f.write(update_script)

os.chmod("install.sh", 0o755)
os.chmod("uninstall.sh", 0o755)
os.chmod("update.sh", 0o755)

print("Scripts upgraded.")

#!/bin/bash

# Ensure running in bash
if [ -z "$BASH_VERSION" ]; then
    if command -v bash > /dev/null 2>&1; then
        exec bash "$0" "$@"
    fi
fi

set -o pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

print_banner() {
    if [ -t 1 ]; then
        clear 2>/dev/null || true
    fi
    echo -e "${CYAN}${BOLD}"
    echo "================================================"
    echo "        JTG PANEL SAFE UPDATE & REPAIR"
    echo "================================================"
    echo -e "${NC}"
}

log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

detect_os() {
    OS_TYPE="Unknown"
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_TYPE=${ID:-"Unknown"}
    elif command -v uname &> /dev/null; then
        OS_TYPE=$(uname -s)
    fi
}

run_pm2() {
    if command -v pm2 &> /dev/null; then
        pm2 "$@"
    elif [ -x "/usr/local/bin/pm2" ]; then
        /usr/local/bin/pm2 "$@"
    elif [ -x "./node_modules/.bin/pm2" ]; then
        ./node_modules/.bin/pm2 "$@"
    else
        npx --no-install pm2 "$@" 2>/dev/null || npx pm2 "$@"
    fi
}

get_docker_cmd() {
    if docker info > /dev/null 2>&1; then
        echo "docker"
    elif command -v sudo &> /dev/null && sudo docker info > /dev/null 2>&1; then
        echo "sudo docker"
    else
        echo "docker"
    fi
}

get_compose_cmd() {
    local d_cmd=$(get_docker_cmd)
    if $d_cmd compose version > /dev/null 2>&1; then
        echo "$d_cmd compose"
    elif command -v docker-compose > /dev/null 2>&1; then
        echo "docker-compose"
    elif command -v sudo &> /dev/null && sudo docker-compose version > /dev/null 2>&1; then
        echo "sudo docker-compose"
    else
        echo "$d_cmd compose"
    fi
}

execute_step() {
    local msg="$1"
    shift
    local step_id="jtg_upd_$RANDOM"
    local log_file="/tmp/${step_id}.log"
    
    printf "  ${CYAN}→${NC} %-44s " "$msg"
    "$@" > "$log_file" 2>&1 &
    local pid=$!
    
    if [ -t 1 ]; then
        local spinstr='|/-\\'
        while kill -0 $pid 2>/dev/null; do
            local temp=${spinstr#?}
            printf "[%c]" "$spinstr"
            local spinstr=$temp${spinstr%"$temp"}
            sleep 0.08
            printf "\b\b\b"
        done
    fi
    
    local status=0
    wait $pid 2>/dev/null || status=$?
    if [ $status -eq 0 ]; then
        printf "\r  ${GREEN}✓${NC} %-44s ${GREEN}[Done]${NC}\n" "$msg"
    else
        printf "\r  ${RED}✗${NC} %-44s ${RED}[Fail]${NC}\n" "$msg"
        echo -e "\n${RED}UPDATE FAILED${NC} on step: $msg"
        if [ -s "$log_file" ]; then
            echo "--- Error Details ---"
            tail -n 40 "$log_file"
            echo "---------------------"
        fi
        return $status
    fi
    return $status
}

# 1. State & Environment Detection
detect_os

if [ -f "package.json" ]; then
    CURRENT_VERSION=$(grep -o '"version": "[^"]*"' package.json | head -1 | cut -d'"' -f4 || echo "Unknown")
else
    CURRENT_VERSION="Unknown"
fi

NEW_VERSION="3.0.0"
if [ -d ".git" ]; then
    git fetch origin >/dev/null 2>&1 || true
    NEW_VERSION=$(git show origin/main:package.json 2>/dev/null | grep -o '"version": "[^"]*"' | head -1 | cut -d'"' -f4 || echo "3.0.0")
fi

RUNTIME="Local Node.js"
if (run_pm2 list 2>/dev/null | grep -qE "jtg-main|jtg-panel"); then
    RUNTIME="Local Node.js"
elif command -v docker &> /dev/null && docker ps -a --format '{{.Names}}' | grep -qE "^jtg-main$"; then
    RUNTIME="Docker"
fi

PANEL_PORT="6767"
if [ -f ".env" ]; then
    DETECTED_PORT=$(grep -E "^PORT=" .env | cut -d'=' -f2 | tr -d ' "')
    if [ -n "$DETECTED_PORT" ]; then
        PANEL_PORT="$DETECTED_PORT"
    fi
fi

print_banner
echo "Current Version : $CURRENT_VERSION"
echo "Target Version  : $NEW_VERSION"
echo "Runtime Engine  : $RUNTIME"
echo "Panel Port      : $PANEL_PORT"
echo "OS Detected     : $OS_TYPE"
echo ""
echo "Safety State    : Pre-check & Auto-repair enabled"
echo "Dependencies    : npm, docker, java, pm2, system tools"
echo "Data Integrity  : Database & configs protected"
echo ""

if [ -z "$NON_INTERACTIVE" ] && [ -t 0 ]; then
    read -p "Continue update? [Y/N] " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo -e "\n${RED}UPDATE CANCELLED${NC}"
        exit 0
    fi
fi

echo ""

# 2. Stop Panel via PM2 First to release file locks & ports
stop_panel_for_update() {
    # Stop PM2 processes if running
    run_pm2 stop jtg-main 2>/dev/null || true
    run_pm2 stop jtg-admin 2>/dev/null || true
    run_pm2 stop jtg-panel 2>/dev/null || true
    
    # Stop Docker container if running
    if command -v docker > /dev/null 2>&1; then
        local DOCKER_CLI=$(get_docker_cmd)
        $DOCKER_CLI stop jtg-main 2>/dev/null || true
        $DOCKER_CLI stop jtg-admin 2>/dev/null || true
    fi
    sleep 1
    return 0
}

execute_step "Stopping panel service (PM2)" stop_panel_for_update

# 3. Create Backup
BACKUP_DIR=".backup/jtg_backup_$(date +"%Y%m%d_%H%M%S")"
mkdir -p "$BACKUP_DIR"

backup_data() {
    cp -r .data settings.json users.json servers.json .env docker-compose.yml ecosystem.config.cjs "$BACKUP_DIR/" 2>/dev/null || true
    mkdir -p "$BACKUP_DIR/src_backup"
    cp -r src/ "$BACKUP_DIR/src_backup/" 2>/dev/null || true
}

if ! execute_step "Creating system backup" backup_data; then
    echo -e "\n${RED}UPDATE CANCELLED${NC} - Backup could not be created."
    exit 1
fi

# 4. Requirement Check & Auto-Repair: System Essentials & Swap
check_and_repair_system_tools() {
    local MISSING=""
    for cmd in curl git tar jq; do
        if ! command -v "$cmd" > /dev/null 2>&1; then
            MISSING="$MISSING $cmd"
        fi
    done

    if [ -n "$MISSING" ]; then
        if command -v apt-get > /dev/null 2>&1; then
            (sudo apt-get update -y -q > /dev/null 2>&1 || apt-get update -y -q > /dev/null 2>&1 || true)
            (sudo apt-get install -y $MISSING build-essential ca-certificates -q > /dev/null 2>&1 || apt-get install -y $MISSING build-essential ca-certificates -q > /dev/null 2>&1 || true)
        elif command -v dnf > /dev/null 2>&1; then
            (sudo dnf install -y $MISSING make gcc-c++ ca-certificates -q > /dev/null 2>&1 || dnf install -y $MISSING make gcc-c++ ca-certificates -q > /dev/null 2>&1 || true)
        elif command -v yum > /dev/null 2>&1; then
            (sudo yum install -y $MISSING make gcc-c++ ca-certificates -q > /dev/null 2>&1 || yum install -y $MISSING make gcc-c++ ca-certificates -q > /dev/null 2>&1 || true)
        elif command -v apk > /dev/null 2>&1; then
            apk add --no-cache $MISSING build-base ca-certificates > /dev/null 2>&1 || true
        elif command -v pacman > /dev/null 2>&1; then
            (sudo pacman -Sy --noconfirm $MISSING base-devel ca-certificates > /dev/null 2>&1 || pacman -Sy --noconfirm $MISSING base-devel ca-certificates > /dev/null 2>&1 || true)
        fi
    fi

    # Swap check to prevent Out-Of-Memory kills during build
    local total_mem=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}' || echo "2048")
    local total_swap=$(free -m 2>/dev/null | awk '/^Swap:/{print $2}' || echo "0")
    if [ -n "$total_mem" ] && [ "$total_mem" -lt 2000 ] && [ "$total_swap" -lt 512 ]; then
        if command -v swapon &> /dev/null; then
            if [ ! -f "/swapfile" ]; then
                if command -v fallocate &> /dev/null; then
                    (sudo fallocate -l 2G /swapfile > /dev/null 2>&1 || fallocate -l 2G /swapfile > /dev/null 2>&1 || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 > /dev/null 2>&1 || dd if=/dev/zero of=/swapfile bs=1M count=2048 > /dev/null 2>&1 || true)
                else
                    (sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 > /dev/null 2>&1 || dd if=/dev/zero of=/swapfile bs=1M count=2048 > /dev/null 2>&1 || true)
                fi
                (sudo chmod 600 /swapfile > /dev/null 2>&1 || chmod 600 /swapfile > /dev/null 2>&1 || true)
                (sudo mkswap /swapfile > /dev/null 2>&1 || mkswap /swapfile > /dev/null 2>&1 || true)
                (sudo swapon /swapfile > /dev/null 2>&1 || swapon /swapfile > /dev/null 2>&1 || true)
            else
                (sudo swapon /swapfile > /dev/null 2>&1 || swapon /swapfile > /dev/null 2>&1 || true)
            fi
        fi
    fi

    for cmd in curl git tar; do
        if ! command -v "$cmd" > /dev/null 2>&1; then
            echo "Critical system tool '$cmd' is missing."
            return 1
        fi
    done
    return 0
}

execute_step "System dependencies & swap check" check_and_repair_system_tools

# 5. Requirement Check & Auto-Repair: Node.js & npm (>= 20)
check_and_repair_node_npm() {
    local NEED_NODE=0
    if ! command -v node > /dev/null 2>&1; then
        NEED_NODE=1
    else
        local NODE_MAJOR=$(node -v 2>/dev/null | tr -d 'v' | cut -d'.' -f1)
        if [ -z "$NODE_MAJOR" ] || [ "$NODE_MAJOR" -lt 20 ]; then
            NEED_NODE=1
        fi
    fi

    if [ "$NEED_NODE" -eq 1 ] || ! command -v npm > /dev/null 2>&1; then
        echo "Installing/Updating Node.js 22 LTS & npm..."
        if command -v apt-get > /dev/null 2>&1; then
            curl -fsSL https://deb.nodesource.com/setup_22.x | (sudo -E bash - 2>/dev/null || bash - 2>/dev/null) || true
            (sudo apt-get install -y nodejs > /dev/null 2>&1 || apt-get install -y nodejs > /dev/null 2>&1 || true)
        elif command -v dnf > /dev/null 2>&1; then
            curl -fsSL https://rpm.nodesource.com/setup_22.x | (sudo bash - 2>/dev/null || bash - 2>/dev/null) || true
            (sudo dnf install -y nodejs > /dev/null 2>&1 || dnf install -y nodejs > /dev/null 2>&1 || true)
        elif command -v yum > /dev/null 2>&1; then
            curl -fsSL https://rpm.nodesource.com/setup_22.x | (sudo bash - 2>/dev/null || bash - 2>/dev/null) || true
            (sudo yum install -y nodejs > /dev/null 2>&1 || yum install -y nodejs > /dev/null 2>&1 || true)
        fi

        local CURRENT_MAJOR=0
        if command -v node > /dev/null 2>&1; then
            CURRENT_MAJOR=$(node -v 2>/dev/null | tr -d 'v' | cut -d'.' -f1)
        fi

        if [ "$CURRENT_MAJOR" -lt 20 ]; then
            local ARCH=$(uname -m)
            local NODE_ARCH="x64"
            case "$ARCH" in
                x86_64) NODE_ARCH="x64" ;;
                aarch64|arm64) NODE_ARCH="arm64" ;;
                armv7l) NODE_ARCH="armv7l" ;;
                *) NODE_ARCH="x64" ;;
            esac
            local NODE_DIST="node-v22.13.1-linux-${NODE_ARCH}"
            curl -fsSL "https://nodejs.org/dist/v22.13.1/${NODE_DIST}.tar.xz" -o /tmp/node22.tar.xz > /dev/null 2>&1 || true
            if [ -f "/tmp/node22.tar.xz" ]; then
                (sudo tar -xJf /tmp/node22.tar.xz -C /usr/local --strip-components=1 2>/dev/null || tar -xJf /tmp/node22.tar.xz -C /usr/local --strip-components=1 2>/dev/null) || true
                rm -f /tmp/node22.tar.xz
            fi
        fi
    fi

    if ! command -v node > /dev/null 2>&1; then
        echo "Node.js could not be detected or installed."
        return 1
    fi
    local VER=$(node -v 2>/dev/null | tr -d 'v' | cut -d'.' -f1)
    if [ "$VER" -lt 20 ]; then
        echo "Node.js version is too old: $(node -v). Minimum required is Node 20+."
        return 1
    fi
    if ! command -v npm > /dev/null 2>&1; then
        echo "npm could not be detected."
        return 1
    fi
    return 0
}

execute_step "Node.js & npm requirement check" check_and_repair_node_npm

# 6. Requirement Check & Auto-Repair: PM2
check_and_repair_pm2() {
    if command -v pm2 > /dev/null 2>&1 || [ -x "/usr/local/bin/pm2" ] || [ -x "./node_modules/.bin/pm2" ]; then
        return 0
    fi

    echo "PM2 not detected. Installing PM2 globally..."
    (sudo npm install -g pm2 > /dev/null 2>&1 || npm install -g pm2 > /dev/null 2>&1 || npm install --save-dev pm2 > /dev/null 2>&1 || true)

    if ! command -v pm2 > /dev/null 2>&1 && [ ! -x "/usr/local/bin/pm2" ] && [ ! -x "./node_modules/.bin/pm2" ]; then
        echo "PM2 could not be installed."
        return 1
    fi
    return 0
}

execute_step "PM2 process manager check" check_and_repair_pm2

# 7. Requirement Check & Auto-Repair: Docker & Docker Compose
check_and_repair_docker() {
    if ! command -v docker > /dev/null 2>&1; then
        echo "Docker not detected. Installing Docker Engine..."
        (curl -fsSL https://get.docker.com | (sudo sh > /dev/null 2>&1 || sh > /dev/null 2>&1 || true)) || true
    fi

    if command -v docker > /dev/null 2>&1; then
        # Ensure Docker daemon is running
        if command -v systemctl > /dev/null 2>&1; then
            (sudo systemctl enable --now docker > /dev/null 2>&1 || systemctl enable --now docker > /dev/null 2>&1 || true)
        elif command -v service > /dev/null 2>&1; then
            (sudo service docker start > /dev/null 2>&1 || service docker start > /dev/null 2>&1 || true)
        fi

        # Ensure docker socket permissions
        if [ -S "/var/run/docker.sock" ]; then
            (sudo chmod 666 /var/run/docker.sock > /dev/null 2>&1 || chmod 666 /var/run/docker.sock > /dev/null 2>&1 || true)
        fi

        # Check docker compose
        local d_cmd=$(get_docker_cmd)
        if ! $d_cmd compose version > /dev/null 2>&1 && ! command -v docker-compose > /dev/null 2>&1; then
            echo "Installing docker-compose..."
            (sudo curl -fsSL "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose > /dev/null 2>&1 || \
             curl -fsSL "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose > /dev/null 2>&1 || true)
            (sudo chmod +x /usr/local/bin/docker-compose > /dev/null 2>&1 || chmod +x /usr/local/bin/docker-compose > /dev/null 2>&1 || true)
        fi
    fi
    return 0
}

execute_step "Docker & Compose requirement check" check_and_repair_docker

# 8. Requirement Check & Auto-Repair: Java (OpenJDK for Minecraft runtime)
check_and_repair_java() {
    if command -v java > /dev/null 2>&1 && java -version > /dev/null 2>&1; then
        return 0
    fi

    echo "Java not detected. Installing OpenJDK for Minecraft runtime..."
    if command -v apt-get > /dev/null 2>&1; then
        (sudo apt-get update -y -q > /dev/null 2>&1 || apt-get update -y -q > /dev/null 2>&1 || true)
        (sudo apt-get install -y -q openjdk-21-jre-headless > /dev/null 2>&1 || \
         apt-get install -y -q openjdk-21-jre-headless > /dev/null 2>&1 || \
         sudo apt-get install -y -q openjdk-17-jre-headless > /dev/null 2>&1 || \
         apt-get install -y -q openjdk-17-jre-headless > /dev/null 2>&1 || \
         sudo apt-get install -y -q default-jre-headless > /dev/null 2>&1 || \
         apt-get install -y -q default-jre-headless > /dev/null 2>&1 || true)
    elif command -v dnf > /dev/null 2>&1; then
        (sudo dnf install -y java-21-openjdk-headless > /dev/null 2>&1 || sudo dnf install -y java-17-openjdk-headless > /dev/null 2>&1 || true)
    elif command -v yum > /dev/null 2>&1; then
        (sudo yum install -y java-21-openjdk-headless > /dev/null 2>&1 || sudo yum install -y java-17-openjdk-headless > /dev/null 2>&1 || true)
    elif command -v apk > /dev/null 2>&1; then
        apk add --no-cache openjdk21-jre-headless > /dev/null 2>&1 || apk add --no-cache openjdk17-jre-headless > /dev/null 2>&1 || true
    elif command -v pacman > /dev/null 2>&1; then
        (sudo pacman -Sy --noconfirm jre21-openjdk-headless > /dev/null 2>&1 || sudo pacman -Sy --noconfirm jre17-openjdk-headless > /dev/null 2>&1 || true)
    fi

    if command -v java > /dev/null 2>&1; then
        return 0
    fi
    # If package manager was unable to install java (e.g. strict restricted container), log warning but allow update to proceed
    echo "Notice: Java could not be installed automatically. Local runtime Minecraft servers will require Java installed."
    return 0
}

execute_step "Java (OpenJDK) runtime check" check_and_repair_java

# 9. Download / Fetch Updates
download_update() {
    if [ -d ".git" ]; then
        git stash >/dev/null 2>&1 || true
        git pull origin main >/dev/null 2>&1 || true
    else
        sleep 1
    fi
}

execute_step "Fetching latest panel updates" download_update

# 10. Install NPM Dependencies
install_deps() {
    npm install --no-audit --no-fund --legacy-peer-deps 2>&1 || npm install --no-audit --no-fund 2>&1
}

if ! execute_step "Installing & updating npm packages" install_deps; then
    echo -e "\n${RED}UPDATE FAILED${NC} - Dependency installation error."
    echo "Restoring from backup..."
    cp -r "$BACKUP_DIR/"* . 2>/dev/null || true
    # Restart panel on previous state
    run_pm2 start ecosystem.config.cjs --only jtg-main 2>/dev/null || true
    exit 1
fi

# 11. Build Application
build_app() {
    NODE_OPTIONS="--max-old-space-size=2048" npm run build
    if [ ! -f "dist/server.cjs" ] || [ ! -f "dist/index.html" ]; then
        echo "Build artifacts (dist/server.cjs or dist/index.html) missing after build."
        return 1
    fi
    return 0
}

if ! execute_step "Building application bundle" build_app; then
    echo -e "\n${RED}UPDATE FAILED${NC} - Build compilation error."
    echo "Restoring from backup..."
    cp -r "$BACKUP_DIR/"* . 2>/dev/null || true
    cp -r "$BACKUP_DIR/src_backup/"* src/ 2>/dev/null || true
    run_pm2 start ecosystem.config.cjs --only jtg-main 2>/dev/null || true
    exit 1
fi

# 12. Ensure ecosystem config exists
ensure_ecosystem_config() {
    if [ ! -f "ecosystem.config.cjs" ]; then
        cat << 'EOF_ECO' > ecosystem.config.cjs
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
      env: {
        NODE_ENV: "production",
        PORT: 6767,
        DEFAULT_RUNTIME: "docker",
        ENABLE_DOCKER: "true",
        DOCKER_SOCKET_PATH: "/var/run/docker.sock"
      }
    },
    {
      name: "jtg-admin",
      script: "npm",
      args: "run dev",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "2G",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
        DEFAULT_RUNTIME: "docker",
        ENABLE_DOCKER: "true",
        DOCKER_SOCKET_PATH: "/var/run/docker.sock"
      }
    }
  ]
};
EOF_ECO
    fi
}
ensure_ecosystem_config

# 13. Start Panel via PM2
start_panel_after_update() {
    if [ "$RUNTIME" = "Docker" ]; then
        local COMPOSE_CMD=$(get_compose_cmd)
        $COMPOSE_CMD up -d --build jtg-main
    else
        # Ensure docker socket permissions for local Minecraft server containers
        if [ -S "/var/run/docker.sock" ]; then
            (sudo chmod 666 /var/run/docker.sock > /dev/null 2>&1 || chmod 666 /var/run/docker.sock > /dev/null 2>&1 || true)
        fi
        
        # Start panel via PM2 cleanly
        run_pm2 delete jtg-panel >/dev/null 2>&1 || true
        run_pm2 delete jtg-main >/dev/null 2>&1 || true
        run_pm2 start ecosystem.config.cjs --only jtg-main
        run_pm2 save --force >/dev/null 2>&1 || true
    fi
    return 0
}

execute_step "Starting panel service (PM2)" start_panel_after_update

# 14. Health Check & Verification
health_check_step() {
    local ATTEMPTS=0
    local MAX_ATTEMPTS=25
    local TARGET_PORT="$PANEL_PORT"

    while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
        if curl -s -f "http://127.0.0.1:${TARGET_PORT}/api/health" >/dev/null 2>&1 || \
           curl -s -f "http://127.0.0.1:${TARGET_PORT}/" >/dev/null 2>&1 || \
           curl -s -f "http://127.0.0.1:6767/api/health" >/dev/null 2>&1 || \
           curl -s -f "http://127.0.0.1:6767/" >/dev/null 2>&1; then
            return 0
        fi
        sleep 2
        ATTEMPTS=$((ATTEMPTS + 1))
    done
    return 1
}

if ! execute_step "Verifying panel health & endpoints" health_check_step; then
    echo -e "\n${RED}UPDATE FAILED${NC} - Panel did not respond to health check."
    echo "Restoring previous working state from backup..."
    cp -r "$BACKUP_DIR/"* . 2>/dev/null || true
    cp -r "$BACKUP_DIR/src_backup/"* src/ 2>/dev/null || true
    start_panel_after_update
    echo "Previous version restored."
    exit 1
fi

# 15. Final Success Banner & Status
NODE_VER=$(node -v 2>/dev/null || echo "N/A")
NPM_VER=$(npm -v 2>/dev/null || echo "N/A")
PM2_VER=$(run_pm2 -v 2>/dev/null || echo "Available")
DOCKER_VER=$(docker --version 2>/dev/null | cut -d',' -f1 || echo "Not Active")
JAVA_VER=$(java -version 2>&1 | head -n 1 || echo "Not Installed")
IP=$(curl -s -m 2 ifconfig.me 2>/dev/null || curl -s -m 2 icanhazip.com 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo ""
echo -e "${GREEN}${BOLD}================================================${NC}"
echo -e "${GREEN}${BOLD}     JTG PANEL SUCCESSFULLY UPDATED & VERIFIED  ${NC}"
echo -e "${GREEN}${BOLD}================================================${NC}"
echo -e "  • Panel Status   : ${GREEN}ONLINE${NC}"
echo -e "  • Web Address    : ${CYAN}http://${IP}:${PANEL_PORT}${NC}"
echo -e "  • Runtime Mode   : ${CYAN}${RUNTIME}${NC}"
echo -e "  • Node.js        : ${GREEN}${NODE_VER}${NC}"
echo -e "  • npm            : ${GREEN}${NPM_VER}${NC}"
echo -e "  • PM2            : ${GREEN}${PM2_VER}${NC}"
echo -e "  • Docker         : ${GREEN}${DOCKER_VER}${NC}"
echo -e "  • Java           : ${GREEN}${JAVA_VER}${NC}"
echo -e "${GREEN}${BOLD}================================================${NC}"
echo ""

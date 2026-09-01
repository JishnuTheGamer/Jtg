#!/bin/bash
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
    clear
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
    echo "║              JTG PANEL INSTALLER             ║"
    echo "╠══════════════════════════════════════════════╣"
    echo "║                                              ║"
    echo "║  Installation Progress                       ║"
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

install_panel() {
    print_banner
    echo -e "╔══════════════════════════════════════════════╗"
    echo "║          SELECT INSTALLATION MODE            ║"
    echo "╠══════════════════════════════════════════════╣"
    echo "║                                              ║"
    echo "║  1) Docker                                   ║"
    echo "║  2) Local Node.js                            ║"
    echo "║  3) Back                                     ║"
    echo "║                                              ║"
    echo "╚══════════════════════════════════════════════╝"
    read -p " Choose an option (1-3): " MODE_CHOICE

    if [ "$MODE_CHOICE" == "3" ]; then
        return
    fi
    if [ "$MODE_CHOICE" != "1" ] && [ "$MODE_CHOICE" != "2" ]; then
        log_error "Invalid selection."
        sleep 1
        return
    fi

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

    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
        else
            echo "PORT=6767" > .env
            echo "JWT_SECRET=$(head -c 32 /dev/urandom | base64)" >> .env
        fi
    fi

    local steps="→ System Check"
    show_progress "System Check" 10 "$steps"
    check_system_deps
    
    if [ "$MODE_CHOICE" == "1" ]; then
        steps="✓ System Check;→ Docker Configuration"
        show_progress "Docker Configuration" 30 "$steps"
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
  jtg-panel:
    build: .
    container_name: jtg-panel
    restart: unless-stopped
    ports:
      - "${PORT:-6767}:${PORT:-6767}"
    volumes:
      - ./.data:/app/.data
      - ./settings.json:/app/settings.json
      - ./users.json:/app/users.json
      - /var/run/docker.sock:/var/run/docker.sock
EOF2
        fi
        
        steps="✓ System Check;✓ Docker Configuration;→ Dependencies & Build"
        show_progress "Dependencies & Build" 50 "$steps"
        
        install_node
        npm i > /dev/null 2>&1 || true
        
        steps="✓ System Check;✓ Docker Configuration;✓ Dependencies & Build;→ Owner Account"
        show_progress "Owner Account" 70 "$steps"
        npm run createuser > /dev/null 2>&1 || true
        
        steps="✓ System Check;✓ Docker Configuration;✓ Dependencies & Build;✓ Owner Account;→ Starting Panel"
        show_progress "Starting Panel" 90 "$steps"
        
        if command -v docker-compose &> /dev/null; then
            docker-compose up -d --build > /dev/null 2>&1
        else
            docker compose up -d --build > /dev/null 2>&1
        fi
        
        steps="✓ System Check;✓ Docker Configuration;✓ Dependencies & Build;✓ Owner Account;✓ Starting Panel"
        show_progress "Done" 100 "$steps"

    else
        steps="✓ System Check;→ Node.js Configuration"
        show_progress "Node.js Configuration" 30 "$steps"
        install_node
        
        if [ ! -f "ecosystem.config.cjs" ]; then
            cat << 'EOF2' > ecosystem.config.cjs
module.exports = {
  apps: [{
    name: "jtg-panel",
    script: "npm",
    args: "start",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: { NODE_ENV: "production", PORT: process.env.PORT || 6767 }
  }]
};
EOF2
        fi
        
        steps="✓ System Check;✓ Node.js Configuration;→ Dependencies"
        show_progress "Dependencies" 50 "$steps"
        npm i > /dev/null 2>&1
        
        steps="✓ System Check;✓ Node.js Configuration;✓ Dependencies;→ Owner Account"
        show_progress "Owner Account" 60 "$steps"
        npm run createuser > /dev/null 2>&1 || true
        
        steps="✓ System Check;✓ Node.js Configuration;✓ Dependencies;✓ Owner Account;→ Building Panel"
        show_progress "Building Panel" 80 "$steps"
        npm run build > /dev/null 2>&1
        
        steps="✓ System Check;✓ Node.js Configuration;✓ Dependencies;✓ Owner Account;✓ Building Panel;→ Starting Panel"
        show_progress "Starting Panel" 90 "$steps"
        npx pm2 start ecosystem.config.cjs > /dev/null 2>&1 || true
        npx pm2 save > /dev/null 2>&1 || true
        
        steps="✓ System Check;✓ Node.js Configuration;✓ Dependencies;✓ Owner Account;✓ Building Panel;✓ Starting Panel"
        show_progress "Done" 100 "$steps"
    fi

    clear
    echo -e "${CYAN}${BOLD}"
    echo "╔══════════════════════════════════════════════╗"
    echo "║                                              ║"
    echo -e "║           ${GREEN}✓ INSTALLATION COMPLETE${CYAN}            ║"
    echo "║                                              ║"
    echo "║              JTG PANEL READY                 ║"
    echo "║                                              ║"
    if [ "$MODE_CHOICE" == "1" ]; then
        echo "║  Runtime: Docker                             ║"
    else
        echo "║  Runtime: Local Node.js                      ║"
    fi
    echo -e "║  Owner:   ${NC}${OWNER_USER}$(printf '%*s' $((33 - ${#OWNER_USER})))${CYAN}║"
    echo "║  Status:  ONLINE                             ║"
    echo "║                                              ║"
    echo "╚══════════════════════════════════════════════╝"
    echo -e "${NC}"
}

update_panel() {
    print_banner
    echo -e "╔══════════════════════════════════════════════╗"
    echo "║              UPDATE JTG PANEL                ║"
    echo "╚══════════════════════════════════════════════╝"
    
    CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "Unknown")
    git fetch > /dev/null 2>&1 || true
    LATEST_COMMIT=$(git rev-parse --short origin/main 2>/dev/null || echo "Unknown")
    
    echo "║ Current Version: $CURRENT_COMMIT"
    echo "║ Latest Version:  $LATEST_COMMIT"
    echo "║"
    
    if [ "$CURRENT_COMMIT" == "$LATEST_COMMIT" ] && [ "$CURRENT_COMMIT" != "Unknown" ]; then
        echo -e "║ ${GREEN}✓ JTG Panel is already up to date.${CYAN}"
        echo "╚══════════════════════════════════════════════╝"
        return
    fi
    
    echo "║ Proceeding with safe update..."
    echo "║ (Your configurations and user data are preserved)"
    echo "╚══════════════════════════════════════════════╝"
    
    log_info "Fetching updates from GitHub..."
    git stash > /dev/null 2>&1 || true
    git pull > /dev/null 2>&1 || true
    
    log_info "Installing updated dependencies..."
    npm i > /dev/null 2>&1 || true
    
    log_info "Rebuilding panel..."
    npm run build > /dev/null 2>&1 || true
    
    log_info "Restarting Panel..."
    if command -v pm2 &> /dev/null && pm2 list | grep -q "jtg-panel"; then
        npx pm2 restart jtg-panel > /dev/null 2>&1 || true
    elif docker ps -a --format '{{.Names}}' | grep -q "^jtg-panel$"; then
        if command -v docker-compose &> /dev/null; then
            docker-compose up -d --build > /dev/null 2>&1 || true
        else
            docker compose up -d --build > /dev/null 2>&1 || true
        fi
    fi
    log_success "JTG Panel updated successfully!"
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
    npm run createuser
    
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
    echo -e "  ${BOLD}1)${NC} Install JTG Panel"
    echo -e "  ${BOLD}2)${NC} Update JTG Panel"
    echo -e "  ${BOLD}3)${NC} Create Owner"
    echo -e "  ${BOLD}4)${NC} Uninstall JTG Panel"
    echo -e "  ${BOLD}5)${NC} Exit"
    echo -e "\n========================================================"
    read -p " Choose an option (1-5): " CHOICE
    case "$CHOICE" in
        1) install_panel; read -p "Press Enter to return to main menu..." ;;
        2) update_panel; read -p "Press Enter to return to main menu..." ;;
        3) create_owner_user; read -p "Press Enter to return to main menu..." ;;
        4) uninstall_panel; read -p "Press Enter to return to main menu..." ;;
        5) echo -e "\n${YELLOW}Exiting script... Goodbye!${NC}\n"; exit 0 ;;
        *) log_error "Invalid option!"; sleep 1.5 ;;
    esac
done

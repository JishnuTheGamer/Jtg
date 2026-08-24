#!/bin/bash

# =========================================================
# JTG Panel - Automated Installation & Management Script
# Repository: https://github.com/JishnuTheGamer/Jtg
# =========================================================

set -e

# Colors for UI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

print_banner() {
    clear
    echo -e "${CYAN}${BOLD}"
    echo "  ========================================================"
    echo "   _____ _____ _____   _____                  _           "
    echo "  |_   _|_   _/ ____| |  __ \                | |          "
    echo "    | |   | | | |  __ | |__) |__ _ n  ___| |          "
    echo "    | |   | | | | |_ ||  ___/ _ \ ' \/ _ \ |          "
    echo "   _| |_  | | | |__| || |  |  __/ | | |  __/ |          "
    echo "  |_____| |_|  \____||_|   \___|_| |_|\___|_|          "
    echo "                                                          "
    echo "            JTG PANEL MANAGEMENT & INSTALLER              "
    echo "            Main Panel Default Port: 6767                 "
    echo "  ========================================================"
    echo -e "${NC}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_warning "This script is recommended to be run as root or with sudo."
    fi
}

install_panel() {
    print_banner
    echo -e "${BOLD}--- [1] Full Panel Installation ---${NC}\n"

    check_root
    log_info "Checking system environment and repairing package manager if needed..."

    # Auto-repair broken dpkg / apt state if apt exists
    if command -v apt-get &> /dev/null; then
        sudo dpkg --configure -a 2>/dev/null || true
        sudo apt-get install -f -y 2>/dev/null || true
        sudo apt-get update -y || true
        sudo apt-get install -y curl git build-essential ca-certificates tar xz-utils || log_warning "Some system packages failed to install, continuing..."
    elif command -v yum &> /dev/null; then
        sudo yum update -y || true
        sudo yum install -y curl git make gcc-c++ ca-certificates tar xz || log_warning "Some system packages failed to install, continuing..."
    fi

    # Ensure Node.js is installed and version is >= 22 (or >= 20.19)
    NEED_NODE_UPGRADE=0
    if ! command -v node &> /dev/null; then
        NEED_NODE_UPGRADE=1
    else
        NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
        NODE_MINOR=$(node -v | cut -d'.' -f2)
        if [ "$NODE_MAJOR" -lt 22 ]; then
            if [ "$NODE_MAJOR" -lt 20 ] || [ "$NODE_MINOR" -lt 19 ]; then
                NEED_NODE_UPGRADE=1
            fi
        fi
    fi

    if [ "$NEED_NODE_UPGRADE" -eq 1 ]; then
        log_info "Installing / Upgrading to Node.js 22.x..."
        
        # Try Nodesource first
        if command -v apt-get &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - 2>/dev/null || true
            sudo apt-get install -y nodejs 2>/dev/null || true
        fi

        # Check if node upgraded properly
        CURRENT_NODE_MAJOR=0
        if command -v node &> /dev/null; then
            CURRENT_NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
        fi

        # Fallback to direct Node.js v22 binary installation if apt/nodesource failed
        if [ "$CURRENT_NODE_MAJOR" -lt 22 ]; then
            log_info "Installing Node.js 22.13.1 directly from binary tarball..."
            ARCH=$(uname -m)
            case "$ARCH" in
                x86_64) NODE_ARCH="x64" ;;
                aarch64) NODE_ARCH="arm64" ;;
                armv7l) NODE_ARCH="armv7l" ;;
                *) NODE_ARCH="x64" ;;
            esac
            
            NODE_DIST="node-v22.13.1-linux-${NODE_ARCH}"
            curl -fsSL "https://nodejs.org/dist/v22.13.1/${NODE_DIST}.tar.xz" -o /tmp/node22.tar.xz || true
            if [ -f "/tmp/node22.tar.xz" ]; then
                sudo tar -xJf /tmp/node22.tar.xz -C /usr/local --strip-components=1 2>/dev/null || tar -xJf /tmp/node22.tar.xz -C /usr/local --strip-components=1 2>/dev/null || true
                rm -f /tmp/node22.tar.xz
            fi
        fi
    fi

    if command -v node &> /dev/null; then
        log_success "Node.js $(node -v) is ready."
    else
        log_error "Node.js installation could not be completed automatically."
    fi
    
    # Install PM2 globally
    if ! command -v pm2 &> /dev/null; then
        log_info "Installing PM2 locally and globally..."
        sudo npm install -g pm2 || true
        npm install pm2 -D
    else
        log_success "PM2 is already installed."
    fi

    # Docker Setup
    log_info "Installing Docker..."
    if ! command -v docker &> /dev/null; then
        curl -fsSL https://get.docker.com | sh || true
        if command -v systemctl &> /dev/null; then
            sudo systemctl enable --now docker || true
        fi
    else
        log_success "Docker is already installed."
    fi


    log_info "Downloading and setting up the JTG Panel..."
    
    # Check if we are already in the Jtg directory
    if [ -f "package.json" ] && grep -q "react-example" "package.json" 2>/dev/null; then
        log_info "Running setup in current directory..."
        WORK_DIR="."
    elif [ -d "Jtg" ]; then
        log_info "The 'Jtg' folder already exists. Running setup inside it..."
        WORK_DIR="Jtg"
    else
        log_info "Cloning from GitHub..."
        git clone https://github.com/JishnuTheGamer/Jtg
        WORK_DIR="Jtg"
    fi
    
    # Navigate into the directory
    cd "$WORK_DIR" || { log_error "Failed to enter the directory!"; return; }
    
    # Ensure .env exists
    if [ ! -f ".env" ]; then
        log_info "Setting up .env file..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
        else
            echo "PORT=6767" > .env
            echo "JWT_SECRET=$(head -c 32 /dev/urandom | base64)" >> .env
        fi
    fi
    

    
    # Ensure ecosystem.config.cjs exists for PM2
    if [ ! -f "ecosystem.config.cjs" ]; then
        log_info "Creating PM2 ecosystem file..."
cat << 'EOF' > ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "jtg-panel",
      script: "npm",
      args: "start",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 6767
      }
    }
  ]
};
EOF
    fi

    log_info "Installing Node.js dependencies..."
    npm i 
    
    log_info "Building panel..."
    npm run build
    
    log_info "Creating admin user..."
    npm run createuser
    
    log_info "Starting panel with PM2..."
    npx pm2 start ecosystem.config.cjs
    npx pm2 save || true
    
    log_success "=========================================="
    log_success " Panel successfully installed and started!"
    log_success " Access URL: http://<YOUR-SERVER-IP>:6767"
    log_success "=========================================="
    
    # Return to the main directory
    if [ "$WORK_DIR" = "Jtg" ]; then
        cd ..
    fi
}

update_panel() {
    print_banner
    echo -e "${BOLD}--- [2] Update JTG Panel ---${NC}\n"
    
    if [ -f "package.json" ] && grep -q "react-example" "package.json" 2>/dev/null; then
        WORK_DIR="."
    elif [ -d "Jtg" ]; then
        WORK_DIR="Jtg"
    else
        log_error "'Jtg' directory not found! Please install the panel first (Option 1)."
        return
    fi
    
    cd "$WORK_DIR" || { log_error "Failed to enter the directory!"; return; }
        
    log_info "Fetching updates from GitHub..."
    git stash || true
    git pull
    
    log_info "Installing updated dependencies..."
    npm i 
    
    log_info "Rebuilding panel..."
    npm run build 
    
    log_info "Restarting PM2 process..."
    npx pm2 restart jtg-panel || npx pm2 restart all
    
    log_success "Panel successfully updated and restarted!"
    
    if [ "$WORK_DIR" = "Jtg" ]; then
        cd ..
    fi
}

create_admin_user() {
    print_banner
    echo -e "${BOLD}--- [3] Create Admin User ---${NC}\n"
    
    if [ -f "package.json" ] && grep -q "react-example" "package.json" 2>/dev/null; then
        WORK_DIR="."
    elif [ -d "Jtg" ]; then
        WORK_DIR="Jtg"
    else
        log_error "'Jtg' directory not found!"
        return
    fi
    
    cd "$WORK_DIR" || { log_error "Failed to enter the directory!"; return; }
    
    log_info "Running admin creation script..."
    npm run createuser
    
    if [ "$WORK_DIR" = "Jtg" ]; then
        cd ..
    fi
    log_success "Admin user created!"
}

restart_panel() {
    print_banner
    echo -e "${BOLD}--- [4] Restart JTG Panel ---${NC}\n"
    
    log_info "Restarting panel..."
    if command -v pm2 &> /dev/null || npx pm2 -v &> /dev/null; then
        npx pm2 restart jtg-panel || npx pm2 restart all
        log_success "Panel restarted successfully!"
    else
        log_error "PM2 is not installed. Panel cannot be restarted via PM2."
    fi
}

# Main menu loop
while true; do
    print_banner
    echo -e "  ${BOLD}1)${NC} Install Panel (Auto Setup - Port 6767)"
    echo -e "  ${BOLD}2)${NC} Update Panel"
    echo -e "  ${BOLD}3)${NC} Create Admin User"
    echo -e "  ${BOLD}4)${NC} Restart Panel"
    echo -e "  ${BOLD}5)${NC} Exit"
    echo -e "\n========================================================"
    read -p " Choose an option (1-5): " CHOICE

    case "$CHOICE" in
        1)
            install_panel
            read -p "Press Enter to return to main menu..."
            ;;
        2)
            update_panel
            read -p "Press Enter to return to main menu..."
            ;;
        3)
            create_admin_user
            read -p "Press Enter to return to main menu..."
            ;;
        4)
            restart_panel
            read -p "Press Enter to return to main menu..."
            ;;
        5)
            echo -e "\n${YELLOW}Exiting script... Goodbye!${NC}\n"
            exit 0
            ;;
        *)
            log_error "Invalid option! Please enter 1, 2, 3, 4, or 5."
            sleep 1.5
            ;;
    esac
done

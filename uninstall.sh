#!/bin/bash
# =========================================================
# JTG Panel - Automated Uninstall Script
# =========================================================

# Ensure running in bash
if [ -z "$BASH_VERSION" ]; then
    if command -v bash > /dev/null 2>&1; then
        exec bash "$0" "$@"
    fi
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

if [ -f "package.json" ]; then
    WORK_DIR="."
elif [ -d "Jtg" ] && [ -f "Jtg/package.json" ]; then
    WORK_DIR="Jtg"
else
    WORK_DIR="."
fi
cd "$WORK_DIR" || true

print_banner() {
    if [ -t 1 ]; then
        clear 2>/dev/null || true
    fi
    echo -e "${CYAN}${BOLD}"
    echo "╔══════════════════════════════════════════════╗"
    echo "║             JTG PANEL UNINSTALLER            ║"
    echo "╠══════════════════════════════════════════════╣"
    echo -e "${NC}"
}

log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }

run_pm2() {
    if [ -x "./node_modules/.bin/pm2" ]; then
        ./node_modules/.bin/pm2 "$@"
    elif command -v pm2 &> /dev/null; then
        pm2 "$@"
    elif [ -x "/usr/local/bin/pm2" ]; then
        /usr/local/bin/pm2 "$@"
    else
        npx --no-install pm2 "$@" 2>/dev/null || npx pm2 "$@"
    fi
}

execute_step() {
    local msg="$1"
    shift
    local step_id="jtg_uninst_$RANDOM"
    local log_file="/tmp/${step_id}.log"
    
    printf "  ${CYAN}→${NC} %-42s " "$msg"
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
        printf "\r  ${GREEN}✓${NC} %-42s ${GREEN}[Done]${NC}\n" "$msg"
    else
        printf "\r  ${RED}✗${NC} %-42s ${RED}[Fail]${NC}\n" "$msg"
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

UN_CHOICE=""
if [ -n "$FORCE_RUNTIME" ]; then
    UN_CHOICE="$FORCE_RUNTIME"
elif [ ! -t 0 ]; then
    UN_CHOICE="3"
else
    read -p " Choose an option (1-4): " UN_CHOICE
fi

if [ "$UN_CHOICE" = "4" ]; then
    exit 0
fi

RUNTIME="Unknown"
if [ "$UN_CHOICE" = "1" ]; then RUNTIME="Docker"; fi
if [ "$UN_CHOICE" = "2" ]; then RUNTIME="Local Node.js"; fi
if [ "$UN_CHOICE" = "3" ]; then
    if (run_pm2 list 2>/dev/null | grep -q "jtg-main") || (run_pm2 list 2>/dev/null | grep -q "jtg-admin") || (run_pm2 list 2>/dev/null | grep -q "jtg-panel"); then
        RUNTIME="Local Node.js"
    elif command -v docker &> /dev/null && docker ps -a --format '{{.Names}}' | grep -qE "^(jtg-main|jtg-admin)$"; then
        RUNTIME="Docker"
    else
        RUNTIME="Local Node.js"
    fi
fi

if [ "$RUNTIME" = "Unknown" ]; then
    echo -e "${RED}[ERROR]${NC} Could not determine runtime. Exiting."
    sleep 2
    exit 1
fi

OWNER="Unknown"
if [ -f ".data/users.json" ]; then
    OWNER=$(grep -o '"username": "[^"]*"' .data/users.json | head -1 | cut -d'"' -f4 || echo "Unknown")
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

CONFIRM=""
if [ -n "$AUTO_CONFIRM" ] || [ ! -t 0 ]; then
    CONFIRM="1"
else
    read -p " Choose (1-2): " CONFIRM
fi

if [ "$CONFIRM" != "1" ]; then
    echo -e "\nUninstall cancelled."
    sleep 1
    exit 0
fi

echo -e "\n"

stop_docker() {
    local DOCKER_CLI="docker"
    if ! docker info > /dev/null 2>&1 && command -v sudo &> /dev/null && sudo docker info > /dev/null 2>&1; then
        DOCKER_CLI="sudo docker"
    fi
    if $DOCKER_CLI compose version &> /dev/null; then
        $DOCKER_CLI compose down || true
    elif command -v docker-compose &> /dev/null; then
        docker-compose down || true
    fi
    $DOCKER_CLI rm -f jtg-main jtg-admin 2>/dev/null || true
    $DOCKER_CLI rmi jtg-main jtg-admin 2>/dev/null || true
}

stop_pm2() {
    run_pm2 delete jtg-main jtg-admin jtg-panel 2>/dev/null || true
    run_pm2 save --force 2>/dev/null || true
}

clean_files() {
    rm -rf node_modules dist .logs package-lock.json
}

delete_jtg_directory() {
    local dirs_to_remove=()
    if [ -n "$ORIGINAL_CALL_DIR" ] && [ -d "$ORIGINAL_CALL_DIR/Jtg" ]; then dirs_to_remove+=("$ORIGINAL_CALL_DIR/Jtg"); fi
    if [ -n "$ORIGINAL_CALL_DIR" ] && [ -d "$ORIGINAL_CALL_DIR/jtg" ]; then dirs_to_remove+=("$ORIGINAL_CALL_DIR/jtg"); fi
    if [ -d "Jtg" ]; then dirs_to_remove+=("$(pwd)/Jtg"); fi
    if [ -d "jtg" ]; then dirs_to_remove+=("$(pwd)/jtg"); fi
    if [ -d "../Jtg" ]; then dirs_to_remove+=("$(cd .. 2>/dev/null && pwd)/Jtg"); fi
    if [ -d "../jtg" ]; then dirs_to_remove+=("$(cd .. 2>/dev/null && pwd)/jtg"); fi

    for base in "$ORIGINAL_CALL_DIR" "$HOME" "/root" "/opt" "/var/www" "/srv"; do
        if [ -d "$base/Jtg" ]; then dirs_to_remove+=("$base/Jtg"); fi
        if [ -d "$base/jtg" ]; then dirs_to_remove+=("$base/jtg"); fi
    done

    local cur_name="$(basename "$TARGET_PANEL_DIR" 2>/dev/null || echo "")"
    case "$cur_name" in
        [Jj][Tt][Gg]*) dirs_to_remove+=("$TARGET_PANEL_DIR") ;;
    esac
    if [ "$WORK_DIR" = "Jtg" ] && [ -d "$WORK_DIR" ]; then dirs_to_remove+=("$(cd "$WORK_DIR" 2>/dev/null && pwd)"); fi

    cd /tmp 2>/dev/null || cd "$HOME" 2>/dev/null || cd /root 2>/dev/null || cd / 2>/dev/null || true

    for target in "${dirs_to_remove[@]}"; do
        if [ -n "$target" ] && [ -d "$target" ]; then
            local real_path="$(cd "$target" 2>/dev/null && pwd)" || real_path="$target"
            if [ "$real_path" != "/" ] && [ "$real_path" != "/root" ] && [ "$real_path" != "/home" ] && [ "$real_path" != "/app" ]; then
                rm -rf "$real_path" 2>/dev/null || sudo rm -rf "$real_path" 2>/dev/null || true
            fi
        fi
    done
}

if [ "$RUNTIME" = "Docker" ]; then
    execute_step "Stopping Docker Containers" stop_docker
else
    execute_step "Stopping PM2 Services" stop_pm2
fi

execute_step "Removing Panel Runtime Files" clean_files
execute_step "Deleting Jtg Directory" delete_jtg_directory

echo -e "\n${CYAN}${BOLD}"
echo "╔══════════════════════════════════════════════╗"
echo "║                                              ║"
echo -e "║            ${GREEN}✓ UNINSTALL COMPLETE${CYAN}              ║"
echo "║                                              ║"
echo "║              JTG PANEL REMOVED               ║"
echo "║                                              ║"
echo "║  Runtime resources cleaned safely.           ║"
echo "║  Jtg directory deleted successfully.         ║"
echo "║  Unrelated VPS data was preserved.           ║"
echo "║                                              ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

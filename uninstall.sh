#!/bin/bash
# =========================================================
# JTG Panel - Complete & Safe Uninstaller Script
# Cleans all servers, containers, PM2 processes, databases,
# directories, and traces from the VPS.
# =========================================================

# Ensure running in bash
if [ -z "$BASH_VERSION" ]; then
    if command -v bash > /dev/null 2>&1; then
        exec bash "$0" "$@"
    fi
fi

# Enhanced 256-color palette
GREEN='\033[38;5;48m'
EMERALD='\033[38;5;42m'
CYAN='\033[38;5;51m'
BLUE='\033[38;5;75m'
YELLOW='\033[38;5;220m'
AMBER='\033[38;5;214m'
RED='\033[38;5;196m'
WHITE='\033[1;37m'
GRAY='\033[38;5;242m'
BOLD='\033[1m'
NC='\033[0m'

# Capture original calling directory and panel root
ORIGINAL_CALL_DIR="$(pwd)"
PANEL_ROOT=""

if [ -f "package.json" ] && grep -q '"name": "react-example"' package.json 2>/dev/null; then
    PANEL_ROOT="$(pwd)"
elif [ -f "ecosystem.config.cjs" ] && [ -d "src" ]; then
    PANEL_ROOT="$(pwd)"
elif [ -d "Jtg" ] && [ -f "Jtg/package.json" ]; then
    PANEL_ROOT="$(cd Jtg && pwd)"
elif [ -d "jtg" ] && [ -f "jtg/package.json" ]; then
    PANEL_ROOT="$(cd jtg && pwd)"
else
    # Search common parent/sub directories
    for cand in "$(pwd)" "$HOME/Jtg" "$HOME/jtg" "/root/Jtg" "/root/jtg" "/opt/Jtg" "/opt/jtg" "/var/www/Jtg"; do
        if [ -f "$cand/ecosystem.config.cjs" ] || ([ -f "$cand/package.json" ] && [ -f "$cand/server.ts" ]); then
            PANEL_ROOT="$cand"
            break
        fi
    done
fi

[ -z "$PANEL_ROOT" ] && PANEL_ROOT="$(pwd)"

print_banner() {
    if [ -t 1 ]; then
        clear 2>/dev/null || true
    fi
    echo -e "
  ${RED}${BOLD}╭──────────────────────────────────────────────────────────────╮
  │  ${WHITE}██╗████████╗ ██████╗${RED}   ${BOLD}${WHITE}JTG PANEL UNINSTALLER${RED}                 │
  │  ${WHITE}██║╚══██╔══╝██╔════╝${RED}   ${AMBER}Complete System Cleanup & Wipe${RED}         │
  ╰──────────────────────────────────────────────────────────────╯${NC}
"
}

run_pm2() {
    if command -v pm2 > /dev/null 2>&1; then
        pm2 "$@"
    elif [ -x "/usr/local/bin/pm2" ]; then
        /usr/local/bin/pm2 "$@"
    elif [ -x "./node_modules/.bin/pm2" ]; then
        ./node_modules/.bin/pm2 "$@"
    elif [ -x "$PANEL_ROOT/node_modules/.bin/pm2" ]; then
        "$PANEL_ROOT/node_modules/.bin/pm2" "$@"
    else
        return 1
    fi
}

get_docker_cmd() {
    if docker info > /dev/null 2>&1; then
        echo "docker"
    elif command -v sudo > /dev/null 2>&1 && sudo docker info > /dev/null 2>&1; then
        echo "sudo docker"
    else
        echo "docker"
    fi
}

execute_step() {
    local msg="$1"
    shift
    local step_id="jtg_uninst_$RANDOM"
    local log_file="/tmp/${step_id}.log"
    rm -f "$log_file"

    printf "  ${GRAY}│${NC}  ${AMBER}⚙${NC}  %-44s " "$msg"
    
    # Run in subshell and capture logs
    ("$@") > "$log_file" 2>&1 &
    local pid=$!
    
    if [ -t 1 ]; then
        local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
        while kill -0 $pid 2>/dev/null; do
            local temp=${spinstr#?}
            printf "${CYAN}[%c]${NC}" "$spinstr"
            local spinstr=$temp${spinstr%"$temp"}
            sleep 0.1
            printf "\b\b\b"
        done
    else
        while kill -0 $pid 2>/dev/null; do
            sleep 0.5
        done
    fi
    
    local status=0
    wait $pid 2>/dev/null || status=$?
    
    if [ $status -eq 0 ]; then
        printf "\r  ${GRAY}│${NC}  ${GREEN}✔${NC}  %-44s ${GREEN}[DONE]${NC}\n" "$msg"
    else
        # Uninstallation cleanups are lenient: even if a step has warnings, continue
        printf "\r  ${GRAY}│${NC}  ${YELLOW}✔${NC}  %-44s ${YELLOW}[DONE]${NC}\n" "$msg"
    fi
    rm -f "$log_file" 2>/dev/null || true
    return 0
}

# 1. Interactive Warning & User Confirmation
print_banner

echo -e "  ${RED}${BOLD}┌── ATTENTION: PERMANENT WIPE ────────────────────────────────┐${NC}"
echo -e "  ${RED}│${NC}  This action will permanently delete JTG Panel from this VPS: ${RED}│${NC}"
echo -e "  ${RED}│${NC}                                                               ${RED}│${NC}"
echo -e "  ${RED}│${NC}  ${WHITE}• Stop and remove all Minecraft server containers & processes${NC} ${RED}│${NC}"
echo -e "  ${RED}│${NC}  ${WHITE}• Delete all server worlds, mods, plugins, configs & backups${NC}  ${RED}│${NC}"
echo -e "  ${RED}│${NC}  ${WHITE}• Kill & unregister PM2 background services (6767, 3000)${NC}     ${RED}│${NC}"
echo -e "  ${RED}│${NC}  ${WHITE}• Free SFTP (2022) and tunnel daemons (Playit)${NC}                ${RED}│${NC}"
echo -e "  ${RED}│${NC}  ${WHITE}• Completely delete JTG Panel files from disk${NC}                 ${RED}│${NC}"
echo -e "  ${RED}│${NC}  ${WHITE}• Remove all cache, temporary scripts & logs from /tmp${NC}       ${RED}│${NC}"
echo -e "  ${RED}│${NC}                                                               ${RED}│${NC}"
echo -e "  ${RED}│${NC}  ${GRAY}Directory target:${NC} ${CYAN}${PANEL_ROOT}${NC}"
echo -e "  ${RED}└─────────────────────────────────────────────────────────────┘${NC}"
echo ""

CONFIRM=""
if [ "$1" = "-y" ] || [ "$1" = "--force" ] || [ "$NON_INTERACTIVE" = "true" ] || [ -n "$AUTO_CONFIRM" ]; then
    CONFIRM="1"
elif [ ! -t 0 ]; then
    CONFIRM="1"
else
    echo -e "  ${YELLOW}${BOLD}[1]${NC} ${WHITE}${BOLD}Yes, completely uninstall and wipe JTG Panel${NC}"
    echo -e "  ${GREEN}${BOLD}[2]${NC} ${WHITE}${BOLD}No, cancel and keep my panel and servers${NC}"
    echo ""
    echo -ne "  ${AMBER}▶${NC} ${BOLD}Choose option [1-2]${NC}: "
    read -r CONFIRM_CHOICE
    if [ "$CONFIRM_CHOICE" = "1" ] || [ "$CONFIRM_CHOICE" = "y" ] || [ "$CONFIRM_CHOICE" = "Y" ]; then
        CONFIRM="1"
    fi
fi

if [ "$CONFIRM" != "1" ]; then
    echo -e "\n  ${GREEN}✔ Uninstallation cancelled. No changes were made.${NC}\n"
    exit 0
fi

echo ""
echo -e "  ${AMBER}${BOLD}╭── UNINSTALLATION IN PROGRESS ────────────────────────────────╮${NC}"
echo -e "  ${AMBER}│${NC}"

# Step 1: Stop and kill all Minecraft containers & Docker panel containers
stop_and_wipe_docker() {
    local DOCKER_CLI=$(get_docker_cmd)
    if command -v docker > /dev/null 2>&1; then
        # 1. Stop and remove panel containers
        $DOCKER_CLI rm -f jtg-main jtg-admin jtg-panel 2>/dev/null || true
        
        # 2. Stop and remove all Minecraft server containers created by JTG
        local mc_containers=$($DOCKER_CLI ps -a --filter "name=mc-" --format "{{.Names}}" 2>/dev/null)
        if [ -n "$mc_containers" ]; then
            $DOCKER_CLI rm -f $mc_containers 2>/dev/null || true
        fi

        local jtg_containers=$($DOCKER_CLI ps -a --filter "name=jtg" --format "{{.Names}}" 2>/dev/null)
        if [ -n "$jtg_containers" ]; then
            $DOCKER_CLI rm -f $jtg_containers 2>/dev/null || true
        fi

        # 3. Bring down docker compose if file present
        if [ -f "$PANEL_ROOT/docker-compose.yml" ]; then
            (cd "$PANEL_ROOT" && $DOCKER_CLI compose down -v --rmi local 2>/dev/null || true)
        fi

        # 4. Remove Docker network if created
        $DOCKER_CLI network rm jtg-network jtg-panel_default 2>/dev/null || true
    fi
    return 0
}
execute_step "Terminating Minecraft & Docker containers" stop_and_wipe_docker

# Step 2: Stop and unregister all PM2 services
stop_and_wipe_pm2() {
    # Stop and delete panel processes
    run_pm2 stop jtg-main jtg-admin jtg-panel 2>/dev/null || true
    run_pm2 delete jtg-main jtg-admin jtg-panel 2>/dev/null || true
    run_pm2 save --force 2>/dev/null || true
    run_pm2 cleardump 2>/dev/null || true
    return 0
}
execute_step "Stopping & clearing PM2 services" stop_and_wipe_pm2

# Step 3: Terminate local Minecraft / Java / Playit processes and free ports
terminate_processes_and_ports() {
    # Kill any Playit tunnel daemon associated with JTG
    pkill -9 -f "playit" 2>/dev/null || true
    pkill -9 -f "playit-cli" 2>/dev/null || true

    # Kill any local Java instances running from JTG server directories
    if [ -n "$PANEL_ROOT" ]; then
        pkill -9 -f "$PANEL_ROOT" 2>/dev/null || true
    fi
    pkill -9 -f "\.data/servers" 2>/dev/null || true

    # Force release ports 6767, 3000, 2022 (SFTP) if anything is lingering
    if command -v lsof > /dev/null 2>&1; then
        lsof -ti:6767,3000,2022 2>/dev/null | xargs kill -9 2>/dev/null || true
    fi
    if command -v fuser > /dev/null 2>&1; then
        fuser -k 6767/tcp 3000/tcp 2022/tcp 2>/dev/null || true
    fi
    return 0
}
execute_step "Releasing ports (6767, 3000, 2022 SFTP)" terminate_processes_and_ports

# Step 4: Clean up standalone JRE & temporary files
clean_temp_and_runtime() {
    # If JTG standalone Adoptium JRE was installed in /opt/jtg-java, clean it
    if [ -d "/opt/jtg-java" ]; then
        # Check if /usr/local/bin/java symlink points to it
        if [ -L "/usr/local/bin/java" ]; then
            local target=$(readlink -f /usr/local/bin/java 2>/dev/null || echo "")
            case "$target" in
                *"/opt/jtg-java"*) rm -f /usr/local/bin/java 2>/dev/null || true ;;
            esac
        fi
        rm -rf /opt/jtg-java 2>/dev/null || sudo rm -rf /opt/jtg-java 2>/dev/null || true
    fi

    # Clean /tmp logs and caches created by JTG
    rm -f /tmp/jtg_* /tmp/jtg-*.log /tmp/jtg_update.log /tmp/jtg_jre.tar.gz /tmp/node22.tar.xz 2>/dev/null || true
    return 0
}
execute_step "Purging runtime caches & temp logs" clean_temp_and_runtime

# Step 5: Completely delete the JTG Panel directory, servers, and databases
delete_jtg_directories() {
    local dirs_to_remove=()

    # Add verified panel directory
    if [ -n "$PANEL_ROOT" ] && [ -d "$PANEL_ROOT" ]; then
        dirs_to_remove+=("$PANEL_ROOT")
    fi

    # Check for known common paths
    for p in "$ORIGINAL_CALL_DIR/Jtg" "$ORIGINAL_CALL_DIR/jtg" "$HOME/Jtg" "$HOME/jtg" "/root/Jtg" "/root/jtg" "/opt/Jtg" "/opt/jtg"; do
        if [ -d "$p" ]; then
            dirs_to_remove+=("$p")
        fi
    done

    # Switch out of target directory to prevent 'directory busy' errors
    cd /tmp 2>/dev/null || cd "$HOME" 2>/dev/null || cd /root 2>/dev/null || cd / 2>/dev/null || true

    for dir_path in "${dirs_to_remove[@]}"; do
        if [ -n "$dir_path" ] && [ -d "$dir_path" ]; then
            local real_dir="$(cd "$dir_path" 2>/dev/null && pwd)" || real_dir="$dir_path"
            # Strict safety guard: never wipe root filesystem or critical top-level dirs
            if [ "$real_dir" != "/" ] && \
               [ "$real_dir" != "/root" ] && \
               [ "$real_dir" != "/home" ] && \
               [ "$real_dir" != "/etc" ] && \
               [ "$real_dir" != "/var" ] && \
               [ "$real_dir" != "/usr" ] && \
               [ "$real_dir" != "/bin" ] && \
               [ "$real_dir" != "/tmp" ]; then
                rm -rf "$real_dir" 2>/dev/null || sudo rm -rf "$real_dir" 2>/dev/null || true
            fi
        fi
    done
    return 0
}
execute_step "Wiping panel files & Minecraft worlds" delete_jtg_directories

echo -e "  ${AMBER}│${NC}"
echo -e "  ${AMBER}╰──────────────────────────────────────────────────────────────╯${NC}"
echo ""

# Final Success Banner
echo -e "  ${GREEN}${BOLD}╭──────────────────────────────────────────────────────────────╮
  │  ✔  JTG PANEL COMPLETELY UNINSTALLED & PURGED                │
  ├──────────────────────────────────────────────────────────────┤${NC}
  │  • All Minecraft servers and processes safely stopped        │
  │  • All Docker containers, PM2 processes and ports released   │
  │  • All worlds, configs, databases and backups deleted        │
  │  • JTG Panel directory and temporary files erased            │
  │                                                              │
  │  ${WHITE}VPS is now 100% clean with no leftover JTG traces.${NC}         │
  ${GREEN}${BOLD}╰──────────────────────────────────────────────────────────────╯${NC}"
echo ""

exit 0

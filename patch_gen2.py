import re

with open("generate_scripts.py", "r") as f:
    content = f.read()

# Replace install_panel
install_pattern = r"install_panel\(\) \{.*?(?=\nupdate_panel\(\) \{)"
install_new = r"""show_status() {
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
    
    echo -e "\n╔══════════════════════════════════════════════╗"
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
    echo -e "╚══════════════════════════════════════════════╝\n"
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
    echo -e "╚══════════════════════════════════════════════╝\n"
    
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
"""

content = re.sub(install_pattern, install_new, content, flags=re.DOTALL)


# Replace start_panel_docker
docker_old = r"start_panel_docker\(\) \{\n    if command -v docker-compose &> /dev/null; then\n        docker-compose up -d --build\n    else\n        docker compose up -d --build\n    fi\n\}"

docker_new = r"""start_panel_docker() {
    local TARGET=$1
    if command -v docker-compose &> /dev/null; then
        docker-compose up -d --build $TARGET
    else
        docker compose up -d --build $TARGET
    fi
}"""
content = re.sub(docker_old, docker_new, content)

# Replace start_panel_node
node_old = r"start_panel_node\(\) \{\n    npm run build\n    npx pm2 start ecosystem\.config\.cjs\n    npx pm2 save\n\}"
node_new = r"""start_panel_node() {
    local TARGET=$1
    if [ "$TARGET" == "jtg-main" ]; then
        npm run build
    fi
    npx pm2 start ecosystem.config.cjs --only $TARGET
    npx pm2 save
}"""
content = re.sub(node_old, node_new, content)

with open("generate_scripts.py", "w") as f:
    f.write(content)

print("Patch 2 applied successfully.")

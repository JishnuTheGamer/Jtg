import re

with open("generate_scripts.py", "r") as f:
    content = f.read()

# Replace main menu
menu_old = r"""while true; do
    print_banner
    echo -e "  \$\{BOLD\}1\)\$\{NC\} Install JTG Panel"
    echo -e "  \$\{BOLD\}2\)\$\{NC\} Update JTG Panel"
    echo -e "  \$\{BOLD\}3\)\$\{NC\} Create Owner"
    echo -e "  \$\{BOLD\}4\)\$\{NC\} Uninstall JTG Panel"
    echo -e "  \$\{BOLD\}5\)\$\{NC\} Exit"
    echo -e "\\n========================================================"
    read -p " Choose an option \(1-5\): " CHOICE
    case "\$CHOICE" in
        1\) install_panel; read -p "Press Enter to return to main menu\.\.\." ;;
        2\) update_panel; read -p "Press Enter to return to main menu\.\.\." ;;
        3\) create_owner_user; read -p "Press Enter to return to main menu\.\.\." ;;
        4\) uninstall_panel; read -p "Press Enter to return to main menu\.\.\." ;;
        5\) echo -e "\\n\$\{YELLOW\}Exiting script\.\.\. Goodbye!\$\{NC\}\\n"; exit 0 ;;
        \*\) log_error "Invalid option!"; sleep 1\.5 ;;
    esac
done"""

menu_new = r"""while true; do
    print_banner
    echo -e "  ${BOLD}1)${NC} Initialize Main Panel"
    echo -e "  ${BOLD}2)${NC} Initialize Developer Panel"
    echo -e "  ${BOLD}3)${NC} Update JTG Panel"
    echo -e "  ${BOLD}4)${NC} Create Owner"
    echo -e "  ${BOLD}5)${NC} Uninstall JTG Panel"
    echo -e "  ${BOLD}6)${NC} Exit"
    echo -e "\n========================================================"
    read -p " Choose an option (1-6): " CHOICE
    case "$CHOICE" in
        1) install_panel "main"; read -p "Press Enter to return to main menu..." ;;
        2) install_panel "dev"; read -p "Press Enter to return to main menu..." ;;
        3) update_panel; read -p "Press Enter to return to main menu..." ;;
        4) create_owner_user; read -p "Press Enter to return to main menu..." ;;
        5) uninstall_panel; read -p "Press Enter to return to main menu..." ;;
        6) echo -e "\n${YELLOW}Exiting script... Goodbye!${NC}\n"; exit 0 ;;
        *) log_error "Invalid option!"; sleep 1.5 ;;
    esac
done"""

content = re.sub(menu_old, menu_new, content)


# Replace start_panel_docker
docker_old = r"""start_panel_docker\(\) \{
    if command -v docker-compose &> /dev/null; then
        docker-compose up -d --build
    else
        docker compose up -d --build
    fi
\}"""

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
node_old = r"""start_panel_node\(\) \{
    npm run build
    npx pm2 start ecosystem\.config\.cjs
    npx pm2 save
\}"""

node_new = r"""start_panel_node() {
    local TARGET=$1
    if [ "$TARGET" == "jtg-main" ]; then
        npm run build
    fi
    npx pm2 start ecosystem.config.cjs --only $TARGET
    npx pm2 save
}"""

content = re.sub(node_old, node_new, content)


# Replace restart_active_panel
restart_old = r"""restart_active_panel\(\) \{
    if command -v pm2 &> /dev/null && \(pm2 list \| grep -q "jtg-main" \|\| pm2 list \| grep -q "jtg-admin"\); then
        npx pm2 restart jtg-main jtg-admin \|\| true
    elif docker ps --format '\{\{\.Names\}\}' \| grep -qE "\^\(jtg-main\|jtg-admin\)\$"; then
        if command -v docker-compose &> /dev/null; then
            docker-compose up -d --build
        else
            docker compose up -d --build
        fi
    fi
\}"""

restart_new = r"""restart_active_panel() {
    local TARGETS=""
    if command -v pm2 &> /dev/null; then
        if pm2 list | grep -q "jtg-main"; then TARGETS="$TARGETS jtg-main"; fi
        if pm2 list | grep -q "jtg-admin"; then TARGETS="$TARGETS jtg-admin"; fi
        if [ -n "$TARGETS" ]; then
            npx pm2 restart $TARGETS || true
        fi
    fi
    local DOCKER_TARGETS=""
    if docker ps --format '{{.Names}}' | grep -q "^jtg-main$"; then DOCKER_TARGETS="$DOCKER_TARGETS jtg-main"; fi
    if docker ps --format '{{.Names}}' | grep -q "^jtg-admin$"; then DOCKER_TARGETS="$DOCKER_TARGETS jtg-admin"; fi
    
    if [ -n "$DOCKER_TARGETS" ]; then
        if command -v docker-compose &> /dev/null; then
            docker-compose up -d --build $DOCKER_TARGETS
        else
            docker compose up -d --build $DOCKER_TARGETS
        fi
    fi
}"""

content = re.sub(restart_old, restart_new, content)


# Replace install_panel
install_old = r"""install_panel\(\) \{
    print_banner
    echo "║  Select installed runtime:                   ║"
    echo "║                                              ║"
    echo "║  1\) Docker                                   ║"
    echo "║  2\) Local Node\.js                            ║"
    echo "║  3\) Back                                     ║"
    echo "║                                              ║"
    echo "╚══════════════════════════════════════════════╝"
    read -p " Choose an option \(1-3\): " INSTALL_CHOICE

    if \[ "\$INSTALL_CHOICE" == "3" \]; then
        return
    fi
    
    if \[ "\$INSTALL_CHOICE" == "1" \]; then
        echo -e "\\nInitializing JTG Panel via Docker\.\.\.\\n"
        execute_step "Docker Configuration" setup_docker_env
        execute_step "Node Environment" install_node
        execute_step "NPM Dependencies" npm i
        execute_step "Owner Account Setup" setup_owner
        execute_step "Building & Starting Docker Container" start_panel_docker
    elif \[ "\$INSTALL_CHOICE" == "2" \]; then
        echo -e "\\nInitializing JTG Panel via Local Node\.js\.\.\.\\n"
        execute_step "Node Environment" install_node
        execute_step "NPM Dependencies" npm i
        execute_step "Owner Account Setup" setup_owner
        execute_step "Building & Starting Node Service" start_panel_node
    else
        log_error "Invalid selection\."
        return
    fi

    echo -e "\\n\$\{CYAN\}\$\{BOLD\}"
    echo "╔══════════════════════════════════════════════╗"
    echo "║                                              ║"
    echo -e "║             \$\{GREEN\}✓ INSTALL COMPLETE\$\{CYAN\}               ║"
    echo "║                                              ║"
    echo "║              JTG PANEL ONLINE                ║"
    echo "║                                              ║"
    echo "║  Access Panel:  http://YOUR_VPS_IP:6767      ║"
    echo "║                                              ║"
    echo "╚══════════════════════════════════════════════╝"
    echo -e "\$\{NC\}"
\}"""

install_new = r"""show_status() {
    local MAIN_STATUS="OFF"
    local DEV_STATUS="OFF"
    local SFTP_STATUS="OFF"
    
    if command -v pm2 &> /dev/null && pm2 list | grep -q "jtg-main"; then MAIN_STATUS="ONLINE"; fi
    if docker ps --format '{{.Names}}' | grep -q "^jtg-main$"; then MAIN_STATUS="ONLINE"; fi
    
    if command -v pm2 &> /dev/null && pm2 list | grep -q "jtg-admin"; then DEV_STATUS="ONLINE"; fi
    if docker ps --format '{{.Names}}' | grep -q "^jtg-admin$"; then DEV_STATUS="ONLINE"; fi
    
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
    echo "║  Initialize: $PANEL_NAME"
    echo "║                                              ║"
    echo "║  Select runtime:                             ║"
    echo "║                                              ║"
    echo "║  1) Docker                                   ║"
    echo "║  2) Local Node.js                            ║"
    echo "║  3) Back                                     ║"
    echo "║                                              ║"
    echo "╚══════════════════════════════════════════════╝"
    read -p " Choose an option (1-3): " INSTALL_CHOICE

    if [ "$INSTALL_CHOICE" == "3" ]; then
        return
    fi
    
    if [ "$INSTALL_CHOICE" == "1" ]; then
        echo -e "\nInitializing $PANEL_NAME via Docker...\n"
        execute_step "Docker Configuration" setup_docker_env
        execute_step "Node Environment" install_node
        execute_step "NPM Dependencies" npm i
        if [ "$TARGET" == "main" ]; then
            execute_step "Owner Account Setup" setup_owner
            execute_step "Building & Starting Docker Container" "start_panel_docker jtg-main"
        else
            execute_step "Building & Starting Docker Container" "start_panel_docker jtg-admin"
        fi
        show_status
    elif [ "$INSTALL_CHOICE" == "2" ]; then
        echo -e "\nInitializing $PANEL_NAME via Local Node.js...\n"
        execute_step "Node Environment" install_node
        execute_step "NPM Dependencies" npm i
        if [ "$TARGET" == "main" ]; then
            execute_step "Owner Account Setup" setup_owner
            setup_node_env
            execute_step "Building & Starting Node Service" "start_panel_node jtg-main"
        else
            setup_node_env
            execute_step "Building & Starting Node Service" "start_panel_node jtg-admin"
        fi
        show_status
    else
        log_error "Invalid selection."
        return
    fi
}"""

content = re.sub(install_old, install_new, content)


with open("generate_scripts.py", "w") as f:
    f.write(content)

print("Patch applied successfully.")

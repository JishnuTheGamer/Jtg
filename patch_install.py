import re

with open("generate_scripts.py", "r") as f:
    content = f.read()

# 1. We replace the execute_step inside install.sh
old_execute = r"""execute_step\(\) \{.*?return \$status\n\}"""

new_execute = r"""execute_step() {
    local msg="$1"
    shift
    local log_file="/tmp/jtg_install_step.log"
    printf "  ${CYAN}→${NC} %-40s " "$msg"
    
    "$@" > "$log_file" 2>&1 &
    local pid=$!
    
    local spinstr='|/-\\'
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
        echo -e "\n================================================"
        echo -e "${RED}INSTALLATION FAILED${NC}"
        echo -e "================================================"
        echo -e "Step: $msg"
        echo -e "Exit Code: $status"
        echo -e "\nReason / Output:"
        tail -n 50 "$log_file"
        echo -e "================================================\n"
        exit 1
    fi
    return $status
}"""

# Replace the first occurrence (which is inside install_script)
content = re.sub(old_execute, new_execute, content, count=1, flags=re.DOTALL)


# 2. Add health_check function before show_status
new_health_check = r"""health_check() {
    local port=$1
    local type=$2
    local attempts=0
    local max_attempts=30
    
    while [ $attempts -lt $max_attempts ]; do
        if curl -s http://localhost:$port/ > /dev/null; then
            return 0
        fi
        sleep 2
        attempts=$((attempts + 1))
    done
    
    echo "Health check failed for $type on port $port"
    if [ "$type" == "docker" ]; then
        docker logs jtg-main --tail 50 || true
        docker logs jtg-admin --tail 50 || true
    else
        pm2 logs jtg-main --lines 50 --nostream || true
        pm2 logs jtg-admin --lines 50 --nostream || true
    fi
    return 1
}

"""

# Inject before start_panel_docker
content = re.sub(r"start_panel_docker\(\) \{", new_health_check + r"start_panel_docker() {", content)

# 3. Update the install_panel function to wait for the health check
old_install_flow = r"""        if \[ "\$TARGET" == "main" \]; then\n            execute_step "Owner Account Setup" setup_owner\n            execute_step "Building & Starting Docker Container" "start_panel_docker jtg-main"\n        else\n            execute_step "Building & Starting Docker Container" "start_panel_docker jtg-admin"\n        fi\n    else\n        execute_step "Node\.js Configuration" setup_node_env\n        execute_step "NPM Dependencies" npm i\n        if \[ "\$TARGET" == "main" \]; then\n            execute_step "Owner Account Setup" setup_owner\n            execute_step "Building & Starting PM2 Service" "start_panel_node jtg-main"\n        else\n            execute_step "Building & Starting PM2 Service" "start_panel_node jtg-admin"\n        fi\n    fi\n    \n    show_status"""

new_install_flow = r"""        if [ "$TARGET" == "main" ]; then
            execute_step "Owner Account Setup" setup_owner
            execute_step "Building & Starting Docker Container" "start_panel_docker jtg-main"
            execute_step "Waiting for Application & Port 6767" "health_check 6767 docker"
        else
            execute_step "Building & Starting Docker Container" "start_panel_docker jtg-admin"
            execute_step "Waiting for Application & Port 3000" "health_check 3000 docker"
        fi
    else
        execute_step "Node.js Configuration" setup_node_env
        execute_step "NPM Dependencies" npm ci
        if [ "$TARGET" == "main" ]; then
            execute_step "Owner Account Setup" setup_owner
            execute_step "Building Application" npm run build
            execute_step "Starting PM2 Service" "start_panel_node jtg-main"
            execute_step "Waiting for Application & Port 6767" "health_check 6767 pm2"
        else
            execute_step "Building Application" npm run build
            execute_step "Starting PM2 Service" "start_panel_node jtg-admin"
            execute_step "Waiting for Application & Port 3000" "health_check 3000 pm2"
        fi
    fi
    
    show_status"""

content = re.sub(old_install_flow, new_install_flow, content, flags=re.DOTALL)

# 4. In setup_node_env, ensure npm install inside it doesn't fail silently
content = content.replace("npm i", "npm ci")

with open("generate_scripts.py", "w") as f:
    f.write(content)


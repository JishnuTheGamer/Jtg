import re

with open("generate_scripts.py", "r") as f:
    content = f.read()

install_pattern = r"install_panel\(\) \{.*?(?=\nupdate_panel\(\) \{)"

# We will modify the new install_panel that I already inserted.
# I will fetch it using regex and modify it.

def replacer(match):
    original = match.group(0)
    
    # insert check_port function inside install_panel or globally. Let's make it global just above install_panel.
    check_port_code = r"""check_port() {
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

"""
    # Insert check inside install_panel, before check_system_deps
    port_check = r"""
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
    
    execute_step "System Requirement Check" check_system_deps"""
    
    original = original.replace('    execute_step "System Requirement Check" check_system_deps', port_check)
    
    return check_port_code + original

content = re.sub(install_pattern, replacer, content, flags=re.DOTALL)

with open("generate_scripts.py", "w") as f:
    f.write(content)
print("Patch 3 applied successfully.")

execute_step() {
    local msg="$1"
    shift
    "$@" > /dev/null 2>&1 &
    local pid=$!
    wait $pid
    local status=$?
    echo "Status: $status"
}
start_panel_docker() {
    echo "Starting docker $1"
}
execute_step "Test" "start_panel_docker jtg-main"

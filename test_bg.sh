execute_step() {
    local msg="$1"
    shift
    "$@" > /dev/null 2>&1 &
    local pid=$!
    wait $pid
    local status=$?
    if [ $status -eq 0 ]; then
        echo "Done"
    else
        echo "Fail: $status"
    fi
}
start_panel_docker() {
    echo "test"
}
execute_step "Test" "start_panel_docker jtg-main"

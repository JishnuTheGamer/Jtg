test_func() {
    "non_existent_command" &
    local pid=$!
    wait $pid
    local status=$?
    echo "Status: $status"
}
test_func

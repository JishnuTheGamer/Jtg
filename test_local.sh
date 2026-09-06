test_func() {
    false
    local status=$?
    echo "Status: $status"
}
test_func

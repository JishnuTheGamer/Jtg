#!/bin/bash
execute_step() {
    local msg="$1"
    shift
    local log_file="/tmp/test_step.log"
    printf "  \033[0;36m→\033[0m %-40s " "$msg"
    
    "$@" > "$log_file" 2>&1 &
    local pid=$!
    
    local spinstr='|/-\'
    while kill -0 $pid 2>/dev/null; do
        local temp=${spinstr#?}
        printf "[%c]" "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep 0.05
        printf "\b\b\b"
    done
    
    wait $pid
    local status=$?
    
    if [ $status -eq 0 ]; then
        printf "\r  \033[0;32m✓\033[0m %-40s \033[0;32m[Done]\033[0m\n" "$msg"
    else
        printf "\r  \033[0;31m✗\033[0m %-40s \033[0;31m[Fail]\033[0m\n" "$msg"
        echo "Error output:"
        cat "$log_file"
        return $status
    fi
    return 0
}

my_func() {
    local arg1=$1
    echo "Running my_func with arg: $arg1"
    sleep 0.2
    return 0
}

my_fail_func() {
    echo "This step failed deliberately"
    return 1
}

execute_step "Test Step Success" my_func "hello-world"
execute_step "Test Step Failure" my_fail_func


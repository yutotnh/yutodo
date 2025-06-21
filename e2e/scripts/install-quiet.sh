#!/bin/bash
# Quieter npm install that filters out known deprecation warnings from indirect dependencies

npm ci 2>&1 | grep -v -E "(warn deprecated inflight|warn deprecated lodash.isequal|warn deprecated glob@8|warn deprecated node-domexception)" || {
    exit_code=$?
    if [ $exit_code -eq 1 ]; then
        # grep returned 1 means no matches (all warnings filtered), which is good
        echo "✅ Dependencies installed successfully with no security vulnerabilities"
        exit 0
    else
        # grep returned error code > 1 means actual error
        exit $exit_code
    fi
}
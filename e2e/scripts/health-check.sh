#!/bin/bash

# ======================================
# E2E Container Health Check Script
# ======================================

# Check if essential services are running

# Check if X server is running
if ! pgrep Xvfb > /dev/null; then
    echo "Xvfb not running"
    exit 1
fi

# Check if display is accessible
if ! xdpyinfo -display ${DISPLAY:-:99} >/dev/null 2>&1; then
    echo "Display not accessible"
    exit 1
fi

# Check if Node.js is available
if ! node --version >/dev/null 2>&1; then
    echo "Node.js not available"
    exit 1
fi

# Check if Rust/Cargo is available
if ! cargo --version >/dev/null 2>&1; then
    echo "Cargo not available"
    exit 1
fi

# Check if tauri-driver is available
if ! tauri-driver --version >/dev/null 2>&1; then
    echo "tauri-driver not available"
    exit 1
fi

# All checks passed
echo "E2E container healthy"
exit 0
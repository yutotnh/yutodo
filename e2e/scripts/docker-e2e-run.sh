#!/bin/bash

# ======================================
# Docker E2E Test Runner Script
# ======================================

set -e

echo "🚀 Running E2E tests in Docker environment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[E2E-RUN]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to cleanup on exit
cleanup() {
    local exit_code=$?
    log "Cleaning up test environment..."
    
    # Kill processes
    pkill -f tauri-driver || true
    pkill -f yutodo || true
    pkill Xvfb || true
    
    # Clean up PID files
    rm -f /tmp/*.pid
    
    if [ $exit_code -eq 0 ]; then
        info "E2E tests completed successfully! ✅"
    else
        error "E2E tests failed with exit code: $exit_code ❌"
    fi
    
    exit $exit_code
}

trap cleanup EXIT

# Parse command line arguments
TEST_PATTERN="${1:-**/*.spec.ts}"
HEADED="${HEADED:-false}"
PARALLEL="${E2E_PARALLEL:-false}"
MAX_INSTANCES="${E2E_MAX_INSTANCES:-1}"

log "Starting E2E test execution..."
info "Test pattern: $TEST_PATTERN"
info "Headed mode: $HEADED"
info "Parallel execution: $PARALLEL"

# Change to E2E directory
cd /workspace

# Run setup script
log "Running setup..."
/usr/local/bin/docker-e2e-setup.sh

# Set test environment variables
export NODE_ENV=test
export RUST_LOG=${RUST_LOG:-info}
export DISPLAY=${DISPLAY:-:99}

# Configure WebDriverIO based on environment
if [ "$HEADED" = "true" ]; then
    warn "Headed mode requested but running in Docker (headless environment)"
    warn "Tests will run headless regardless"
fi

if [ "$PARALLEL" = "true" ]; then
    info "Parallel execution enabled with $MAX_INSTANCES instances"
    export WDIO_MAX_INSTANCES=$MAX_INSTANCES
fi

# Start tauri-driver in background
log "Starting tauri-driver..."
tauri-driver --port 4444 &
TAURI_DRIVER_PID=$!
echo $TAURI_DRIVER_PID > /tmp/tauri-driver.pid

# Wait for tauri-driver to be ready
sleep 5

# Verify tauri-driver is running
if ! ps -p $TAURI_DRIVER_PID > /dev/null; then
    error "tauri-driver failed to start"
    exit 1
fi

info "tauri-driver started successfully (PID: $TAURI_DRIVER_PID)"

# Run the actual tests
log "Executing E2E tests..."
echo "----------------------------------------"

# Determine test command based on configuration
if [ "$PARALLEL" = "true" ]; then
    # Run tests in parallel
    npx wdio run wdio.conf.js --spec "tests/$TEST_PATTERN" --maxInstances $MAX_INSTANCES
else
    # Run tests sequentially
    npx wdio run wdio.conf.js --spec "tests/$TEST_PATTERN"
fi

TEST_EXIT_CODE=$?

echo "----------------------------------------"

# Generate test report
log "Generating test report..."
if [ -f "wdio.conf.js" ] && command -v npx &> /dev/null; then
    npx wdio-html-nice-reporter 2>/dev/null || true
fi

# Copy artifacts to output directory
log "Collecting test artifacts..."
mkdir -p /workspace/test-output

# Copy screenshots
if [ -d "screenshots" ] && [ "$(ls -A screenshots 2>/dev/null)" ]; then
    cp -r screenshots/* /workspace/test-output/ 2>/dev/null || true
    info "Screenshots copied to test-output/"
fi

# Copy logs
if [ -d "logs" ] && [ "$(ls -A logs 2>/dev/null)" ]; then
    cp -r logs/* /workspace/test-output/ 2>/dev/null || true
    info "Logs copied to test-output/"
fi

# Copy reports
if [ -d "reports" ] && [ "$(ls -A reports 2>/dev/null)" ]; then
    cp -r reports/* /workspace/test-output/ 2>/dev/null || true
    info "Reports copied to test-output/"
fi

# Summary
if [ $TEST_EXIT_CODE -eq 0 ]; then
    log "All E2E tests passed! 🎉"
else
    error "Some E2E tests failed. Check the output above for details."
fi

# Show test results summary
if [ -f "/workspace/test-output/report.html" ]; then
    info "Test report available at: /workspace/test-output/report.html"
fi

exit $TEST_EXIT_CODE
#!/bin/bash

# ======================================
# Docker E2E Test Setup Script
# ======================================

set -e

echo "🔧 Setting up E2E test environment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[E2E-SETUP]${NC} $1"
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

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    error "package.json not found. Make sure you're in the e2e directory."
    exit 1
fi

# Install E2E dependencies
log "Installing E2E test dependencies..."
npm ci

# Check for required binaries
log "Checking required binaries..."

if ! command -v cargo &> /dev/null; then
    error "Cargo not found. Make sure Rust is installed."
    exit 1
fi

if ! command -v node &> /dev/null; then
    error "Node.js not found."
    exit 1
fi

if ! command -v tauri-driver &> /dev/null; then
    warn "tauri-driver not found. Installing..."
    cargo install tauri-driver --locked
fi

# Check if the project is built
log "Checking if Tauri app is built..."
TAURI_BINARY="../src-tauri/target/release/yutodo"
if [ ! -f "$TAURI_BINARY" ]; then
    warn "Tauri binary not found. Building project..."
    cd ..
    npm run tauri build
    cd e2e
fi

# Start virtual display
log "Starting virtual display..."
if [ -z "$DISPLAY" ]; then
    export DISPLAY=:99
fi

# Kill any existing Xvfb processes
pkill Xvfb || true
sleep 1

# Start Xvfb with proper configuration
Xvfb $DISPLAY -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
XVFB_PID=$!
sleep 3

# Verify display is working
if ! xdpyinfo -display $DISPLAY &>/dev/null; then
    error "Failed to start virtual display"
    exit 1
fi

info "Virtual display started successfully on $DISPLAY"

# Save PIDs for cleanup
echo $XVFB_PID > /tmp/xvfb.pid

# Wait for server to be ready
log "Waiting for YuToDo server to be ready..."
SERVER_URL="${YUTODO_SERVER_URL:-http://localhost:3001}"
timeout 60 bash -c "
until curl -f $SERVER_URL &>/dev/null; do
    echo 'Waiting for server...'
    sleep 2
done
" || {
    error "Server not available at $SERVER_URL"
    exit 1
}

info "Server is ready at $SERVER_URL"

# Verify tauri-driver is accessible
log "Verifying tauri-driver..."
if ! tauri-driver --version &>/dev/null; then
    error "tauri-driver is not working properly"
    exit 1
fi

info "tauri-driver is ready"

# Create test output directories
log "Creating test output directories..."
mkdir -p reports screenshots logs

log "E2E test environment setup completed successfully! ✅"
echo ""
info "Environment information:"
echo "  Display: $DISPLAY"
echo "  Server: $SERVER_URL"
echo "  Tauri binary: $TAURI_BINARY"
echo "  Working directory: $(pwd)"
echo ""
info "Ready to run E2E tests!"
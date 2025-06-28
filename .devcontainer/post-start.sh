#!/bin/bash

# ======================================
# Development Container Post-Start Script
# Run every time the container starts
# ======================================

set -e

echo "🔄 Running YuToDo post-start setup..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[POST-START]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Set up display for GUI applications (if available)
if [ -n "${DISPLAY}" ]; then
    log "Setting up X11 display forwarding..."
    export DISPLAY=${DISPLAY}
    
    # Start virtual display if needed (for headless environments)
    if ! xset q &>/dev/null; then
        warn "No X11 display detected, starting virtual display..."
        Xvfb ${DISPLAY} -screen 0 1920x1080x24 &
        export XVFB_PID=$!
        sleep 2
    fi
    
    info "Display configured: ${DISPLAY}"
fi

# Ensure proper permissions for mounted volumes
log "Checking volume permissions..."
sudo chown -R vscode:vscode /workspace/.cargo 2>/dev/null || true
sudo chown -R vscode:vscode /workspace/src-tauri/target 2>/dev/null || true
info "Permissions updated"

# Start Docker daemon if Docker-in-Docker is available
if [ -S "/var/run/docker-host.sock" ]; then
    log "Docker-in-Docker detected, setting up Docker client..."
    
    # Create symbolic link for Docker socket
    sudo ln -sf /var/run/docker-host.sock /var/run/docker.sock 2>/dev/null || true
    
    # Test Docker connectivity
    if docker info &>/dev/null; then
        info "Docker client connected successfully"
    else
        warn "Docker client connection failed"
    fi
fi

# Update environment variables for the current session
log "Setting up environment variables..."

# Export useful development variables
export NODE_ENV=development
export RUST_LOG=debug
export YUTODO_DEV_MODE=true

# Add Cargo binaries to PATH if not already there
if [ -d "$HOME/.cargo/bin" ] && [[ ":$PATH:" != *":$HOME/.cargo/bin:"* ]]; then
    export PATH="$HOME/.cargo/bin:$PATH"
fi

# Add local npm binaries to PATH
if [ -d "node_modules/.bin" ]; then
    export PATH="./node_modules/.bin:$PATH"
fi

info "Environment variables configured"

# Check if the YuToDo server container is running
log "Checking YuToDo server status..."
if docker ps --format "table {{.Names}}" | grep -q "yutodo-server"; then
    info "YuToDo server container is running"
    
    # Wait for server to be ready
    echo "Waiting for server to be ready..."
    timeout 30 bash -c '
        until curl -f http://localhost:3001 &>/dev/null; do
            sleep 1
        done
    ' && info "Server is ready at http://localhost:3001" || warn "Server not responding on port 3001"
else
    warn "YuToDo server container is not running"
    info "Start it with: docker-compose up yutodo-server -d"
fi

# Display development status
log "🎯 Development environment status:"
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    info "Node.js: $(node --version)"
else
    warn "Node.js: Not found"
fi

# Check npm
if command -v npm &> /dev/null; then
    info "npm: $(npm --version)"
else
    warn "npm: Not found"
fi

# Check Rust
if command -v rustc &> /dev/null; then
    info "Rust: $(rustc --version)"
else
    warn "Rust: Not found"
fi

# Check Cargo
if command -v cargo &> /dev/null; then
    info "Cargo: $(cargo --version)"
else
    warn "Cargo: Not found"
fi

# Check Tauri CLI
if command -v cargo-tauri &> /dev/null; then
    info "Tauri CLI: $(cargo tauri --version 2>/dev/null || echo 'Available')"
else
    warn "Tauri CLI: Not found (install with: cargo install tauri-cli)"
fi

# Check Docker
if command -v docker &> /dev/null; then
    info "Docker: $(docker --version)"
else
    warn "Docker: Not found"
fi

echo ""
info "Ready for development! 🚀"
echo ""
info "Quick start commands:"
echo "  - Start server: yt-server"
echo "  - Start Tauri app: yt-dev"
echo "  - Run tests: yt-test"
echo "  - Docker utilities: yt-docker --help"
echo ""
#!/bin/bash

# ======================================
# Development Container Post-Create Script
# Run once when container is created
# ======================================

set -e

echo "🚀 Running YuToDo post-create setup..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[POST-CREATE]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Install frontend dependencies
log "Installing frontend dependencies..."
if [ -f "package.json" ]; then
    npm ci
    info "Frontend dependencies installed"
else
    warn "No package.json found, skipping frontend dependencies"
fi

# Install backend dependencies
log "Installing backend dependencies..."
if [ -f "server/package.json" ]; then
    cd server
    npm ci
    cd ..
    info "Backend dependencies installed"
else
    warn "No server/package.json found, skipping backend dependencies"
fi

# Install E2E test dependencies
log "Installing E2E test dependencies..."
if [ -f "e2e/package.json" ]; then
    cd e2e
    npm ci
    cd ..
    info "E2E test dependencies installed"
else
    warn "No e2e/package.json found, skipping E2E dependencies"
fi

# Update Rust toolchain and install additional tools
log "Setting up Rust development environment..."
if command -v rustup &> /dev/null; then
    rustup update
    rustup component add clippy rustfmt rust-analyzer
    
    # Install commonly used Rust tools
    cargo install cargo-edit cargo-audit cargo-outdated cargo-tree
    
    info "Rust environment configured"
else
    warn "Rust not found, skipping Rust setup"
fi

# Add Tauri CLI
log "Installing Tauri CLI..."
if command -v cargo &> /dev/null; then
    cargo install tauri-cli
    info "Tauri CLI installed"
else
    warn "Cargo not found, skipping Tauri CLI installation"
fi

# Build frontend once to verify setup
log "Building frontend to verify setup..."
if [ -f "package.json" ]; then
    npm run build
    info "Frontend build successful"
else
    warn "Skipping frontend build verification"
fi

# Build backend once to verify setup
log "Building backend to verify setup..."
if [ -f "server/package.json" ]; then
    cd server
    npm run build
    cd ..
    info "Backend build successful"
else
    warn "Skipping backend build verification"
fi

# Set up git hooks (if .git exists)
if [ -d ".git" ]; then
    log "Setting up git configuration..."
    git config --local core.autocrlf false
    git config --local core.eol lf
    
    # Set up commit message template (if it exists)
    if [ -f ".gitmessage" ]; then
        git config --local commit.template .gitmessage
    fi
    
    info "Git configuration completed"
fi

# Create useful development aliases
log "Setting up development aliases..."
cat >> ~/.bashrc << 'EOF'

# YuToDo Development Aliases
alias yt-dev='npm run tauri dev'
alias yt-build='npm run tauri build'
alias yt-server='cd server && npm run dev'
alias yt-test='npm test'
alias yt-test-server='cd server && npm test'
alias yt-test-e2e='npm run test:e2e'
alias yt-lint='npm run lint'
alias yt-docker='./scripts/docker-local.sh'

# Useful development shortcuts
alias dev-setup='npm ci && cd server && npm ci && cd ..'
alias dev-clean='rm -rf node_modules server/node_modules e2e/node_modules && npm cache clean --force'
alias dev-fresh='dev-clean && dev-setup'

# Git shortcuts
alias gst='git status'
alias gco='git checkout'
alias gcb='git checkout -b'
alias gpl='git pull'
alias gps='git push'
alias glog='git log --oneline --graph --decorate'

EOF

info "Development aliases added to ~/.bashrc"

# Create workspace-specific VS Code settings (if not exists)
mkdir -p .vscode

if [ ! -f ".vscode/settings.json" ]; then
    log "Creating workspace VS Code settings..."
    cat > .vscode/settings.json << 'EOF'
{
  "rust-analyzer.cargo.buildScripts.enable": true,
  "rust-analyzer.check.command": "cargo check",
  "rust-analyzer.procMacro.enable": true,
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "files.associations": {
    "*.toml": "toml"
  },
  "terminal.integrated.defaultProfile.linux": "bash"
}
EOF
    info "VS Code settings created"
fi

# Display helpful information
log "🎉 Post-create setup completed!"
echo ""
info "Useful commands:"
echo "  yt-dev         - Start Tauri development server"
echo "  yt-server      - Start backend server"
echo "  yt-test        - Run frontend tests"
echo "  yt-docker      - Docker development utilities"
echo ""
info "Development workflow:"
echo "  1. Start the server: yt-server"
echo "  2. Start the Tauri app: yt-dev"
echo "  3. Open VS Code: code ."
echo ""
info "The development environment is ready! 🚀"
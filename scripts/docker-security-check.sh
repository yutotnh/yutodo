#!/bin/bash

# Docker Security Check Script
# This script performs security checks on the Docker image
# and provides actionable recommendations

set -e

echo "🔒 Docker Security Check"
echo "========================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running in CI
if [ -n "$CI" ]; then
    echo "Running in CI environment"
fi

# Function to check Alpine version
check_alpine_version() {
    echo ""
    echo "📦 Checking Alpine version..."
    
    # Extract Alpine version from Dockerfile
    ALPINE_VERSION=$(grep -E "FROM.*alpine" server/Dockerfile | head -1 | grep -oE "alpine[0-9.]*" || echo "unknown")
    
    echo "Current Alpine version: $ALPINE_VERSION"
    
    # Check if using specific version
    if [[ "$ALPINE_VERSION" == *"alpine3."* ]]; then
        echo -e "${GREEN}✅ Using specific Alpine version (good practice)${NC}"
    else
        echo -e "${YELLOW}⚠️  Consider using specific Alpine version (e.g., alpine3.19)${NC}"
    fi
}

# Function to check Node.js version
check_node_version() {
    echo ""
    echo "📦 Checking Node.js version..."
    
    # Extract Node version from Dockerfile
    NODE_VERSION=$(grep -E "FROM.*node:" server/Dockerfile | head -1 | grep -oE "node:[0-9.]+" || echo "unknown")
    
    echo "Current Node.js version: $NODE_VERSION"
    
    # Check if using LTS version
    if [[ "$NODE_VERSION" == *"20."* ]]; then
        echo -e "${GREEN}✅ Using Node.js 20 LTS${NC}"
    else
        echo -e "${YELLOW}⚠️  Consider using Node.js 20 LTS${NC}"
    fi
}

# Function to check security practices
check_security_practices() {
    echo ""
    echo "🛡️  Checking security practices..."
    
    # Check for non-root user
    if grep -q "USER yutodo" server/Dockerfile; then
        echo -e "${GREEN}✅ Running as non-root user${NC}"
    else
        echo -e "${RED}❌ Not running as non-root user${NC}"
    fi
    
    # Check for security updates
    if grep -q "apk.*upgrade" server/Dockerfile; then
        echo -e "${GREEN}✅ Applying security updates${NC}"
    else
        echo -e "${YELLOW}⚠️  Consider adding 'apk upgrade' to apply security patches${NC}"
    fi
    
    # Check for dumb-init
    if grep -q "dumb-init" server/Dockerfile; then
        echo -e "${GREEN}✅ Using dumb-init for proper signal handling${NC}"
    else
        echo -e "${YELLOW}⚠️  Consider using dumb-init for proper signal handling${NC}"
    fi
    
    # Check for health check
    if grep -q "HEALTHCHECK" server/Dockerfile; then
        echo -e "${GREEN}✅ Health check configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Consider adding HEALTHCHECK${NC}"
    fi
}

# Function to check for known vulnerable packages
check_vulnerable_packages() {
    echo ""
    echo "🔍 Checking for commonly vulnerable packages..."
    
    # List of packages that often have vulnerabilities
    VULNERABLE_PACKAGES=("git" "curl" "wget" "openssh" "openssl1.1-compat")
    
    for pkg in "${VULNERABLE_PACKAGES[@]}"; do
        if grep -q "apk.*add.*$pkg" server/Dockerfile; then
            echo -e "${YELLOW}⚠️  Package '$pkg' is installed - ensure it's necessary and up-to-date${NC}"
        fi
    done
}

# Function to provide recommendations
provide_recommendations() {
    echo ""
    echo "📋 Security Recommendations:"
    echo "============================"
    
    cat << EOF
1. Use specific Alpine version tags (e.g., alpine3.19) instead of 'alpine:latest'
2. Pin Node.js to specific versions (e.g., node:20-alpine or node:20.18-alpine)
3. Run 'apk update && apk upgrade' to get latest security patches
4. Remove package manager caches after installation
5. Use multi-stage builds to minimize final image size
6. Run containers as non-root user
7. Use .dockerignore to exclude sensitive files
8. Scan images regularly with Trivy or similar tools
9. Consider using distroless images for even smaller attack surface
10. Review and update base images regularly

To scan for vulnerabilities locally:
- Install Trivy: https://aquasecurity.github.io/trivy/
- Run: trivy image yutodo-server:latest
EOF
}

# Run all checks
check_alpine_version
check_node_version
check_security_practices
check_vulnerable_packages
provide_recommendations

echo ""
echo "✅ Security check complete!"
echo ""
echo "Note: This is a basic security check. For comprehensive scanning,"
echo "use tools like Trivy, Snyk, or Docker Scout."
#!/bin/bash

# Script to scan Docker image for vulnerabilities using Trivy
# This helps identify specific CVEs that need to be addressed

echo "🔍 Docker Security Vulnerability Scanner"
echo "========================================"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not accessible"
    echo "Please install Docker or ensure Docker Desktop WSL integration is enabled"
    exit 1
fi

# Check if Trivy is available
if ! command -v trivy &> /dev/null; then
    echo "📦 Installing Trivy..."
    
    # Try to install Trivy based on the platform
    if command -v apt-get &> /dev/null; then
        # Ubuntu/Debian
        echo "Installing Trivy via apt..."
        sudo apt-get update
        sudo apt-get install -y wget apt-transport-https gnupg lsb-release
        wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
        echo deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main | sudo tee -a /etc/apt/sources.list.d/trivy.list
        sudo apt-get update
        sudo apt-get install -y trivy
    elif command -v brew &> /dev/null; then
        # macOS
        echo "Installing Trivy via Homebrew..."
        brew install aquasecurity/trivy/trivy
    else
        echo "❌ Unable to install Trivy automatically"
        echo "Please install Trivy manually: https://aquasecurity.github.io/trivy/"
        exit 1
    fi
fi

# Build the Docker image
echo ""
echo "🔨 Building Docker image..."
if docker build -t yutodo-server:security-scan .; then
    echo "✅ Docker image built successfully"
else
    echo "❌ Failed to build Docker image"
    exit 1
fi

# Run Trivy scan
echo ""
echo "🔍 Running Trivy vulnerability scan..."
echo "========================================"

# Scan for HIGH and CRITICAL vulnerabilities
trivy image --severity HIGH,CRITICAL yutodo-server:security-scan

echo ""
echo "📊 Detailed vulnerability report:"
echo "========================================"

# Generate detailed JSON report
trivy image --format json --output trivy-report.json yutodo-server:security-scan

# Extract summary from JSON
if command -v jq &> /dev/null; then
    echo ""
    echo "Summary of vulnerabilities by severity:"
    jq '.Results[]?.Vulnerabilities | group_by(.Severity) | map({severity: .[0].Severity, count: length})' trivy-report.json 2>/dev/null || echo "Unable to parse JSON report"
    
    echo ""
    echo "Top vulnerable packages:"
    jq '.Results[]?.Vulnerabilities | group_by(.PkgName) | map({package: .[0].PkgName, count: length}) | sort_by(.count) | reverse | .[0:5]' trivy-report.json 2>/dev/null || echo "Unable to parse packages"
fi

echo ""
echo "📄 Full report saved to: trivy-report.json"
echo ""
echo "💡 Tips for fixing vulnerabilities:"
echo "1. Update base images to latest versions"
echo "2. Run 'apk update && apk upgrade' in Dockerfile"
echo "3. Consider using distroless images for production"
echo "4. Add specific CVEs to .trivyignore only after careful review"
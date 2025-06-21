#!/bin/bash

# E2E Testing Setup Script for YuToDo

echo "🚀 Setting up E2E testing environment..."

# Check if we're on a supported platform
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "📱 Detected Linux - Setting up WebKit WebDriver"
    
    # Install webkit2gtk-driver if not present
    if ! command -v webkit2gtk-driver &> /dev/null; then
        echo "Installing webkit2gtk-driver..."
        sudo apt update
        sudo apt install -y webkit2gtk-driver
    else
        echo "✅ webkit2gtk-driver already installed"
    fi
    
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "🪟 Detected Windows - Edge WebDriver setup required"
    echo "Please download Edge WebDriver from: https://developer.microsoft.com/microsoft-edge/tools/webdriver/"
    echo "Make sure the version matches your Edge browser version"
    
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Detected macOS - WebDriver not supported for Tauri E2E tests"
    echo "E2E tests will not work on macOS due to lack of WKWebView driver support"
    exit 1
else
    echo "❌ Unsupported platform: $OSTYPE"
    exit 1
fi

# Install tauri-driver if not present
if ! command -v tauri-driver &> /dev/null; then
    echo "📦 Installing tauri-driver..."
    cargo install tauri-driver --locked
else
    echo "✅ tauri-driver already installed"
fi

# Install E2E dependencies
echo "📥 Installing E2E test dependencies..."
cd e2e
npm install

echo "✅ E2E testing environment setup complete!"
echo ""
echo "🧪 Available commands:"
echo "  npm run test:e2e        - Run E2E tests headlessly"
echo "  npm run test:e2e:headed - Run E2E tests with visible browser"
echo "  npm run test:e2e:ui     - Run E2E tests with UI (same as headed)"
echo ""
echo "📝 Note: Make sure to build the app first with 'npm run tauri build'"
# E2E Testing Setup Script for YuToDo (Windows)

Write-Host "🚀 Setting up E2E testing environment for Windows..." -ForegroundColor Green

# Check if tauri-driver is installed
if (-not (Get-Command "tauri-driver" -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Installing tauri-driver..." -ForegroundColor Yellow
    cargo install tauri-driver --locked
} else {
    Write-Host "✅ tauri-driver already installed" -ForegroundColor Green
}

# Check Edge version and suggest WebDriver download
try {
    $edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    if (Test-Path $edgePath) {
        $edgeVersion = (Get-Item $edgePath).VersionInfo.FileVersion
        Write-Host "📱 Detected Microsoft Edge version: $edgeVersion" -ForegroundColor Cyan
        
        $driverVersion = $edgeVersion.Split('.')[0..2] -join '.'
        $driverUrl = "https://msedgedriver.azureedge.net/$driverVersion/edgedriver_win64.zip"
        
        Write-Host "🔗 Download Edge WebDriver from:" -ForegroundColor Yellow
        Write-Host "   $driverUrl" -ForegroundColor White
        Write-Host "   Or visit: https://developer.microsoft.com/microsoft-edge/tools/webdriver/" -ForegroundColor White
        Write-Host ""
        Write-Host "📝 Extract the driver and place msedgedriver.exe in your PATH" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Microsoft Edge not found at expected location" -ForegroundColor Red
        Write-Host "   Please install Microsoft Edge or update the path in this script" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not detect Edge version: $_" -ForegroundColor Yellow
}

# Install E2E dependencies
Write-Host "📥 Installing E2E test dependencies..." -ForegroundColor Yellow
Set-Location "e2e"
npm install
Set-Location ".."

Write-Host "✅ E2E testing environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🧪 Available commands:" -ForegroundColor Cyan
Write-Host "  npm run test:e2e        - Run E2E tests headlessly" -ForegroundColor White
Write-Host "  npm run test:e2e:headed - Run E2E tests with visible browser" -ForegroundColor White
Write-Host "  npm run test:e2e:ui     - Run E2E tests with UI (same as headed)" -ForegroundColor White
Write-Host ""
Write-Host "📝 Note: Make sure to build the app first with 'npm run tauri build'" -ForegroundColor Yellow
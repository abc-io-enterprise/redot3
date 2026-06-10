#!/usr/bin/env powershell
<#
.SYNOPSIS
    ABC-IO v2.0 redot2 Mobile APK Build & Sign Script
    
.DESCRIPTION
    Builds, signs, and packages the mobile application as a production APK
    for distribution on Google Play Store or direct installation.
    
.PARAMETER BuildType
    Debug or Release build (default: Release)
    
.PARAMETER KeystorePath
    Path to signing keystore (default: redot2-release.jks)
    
.PARAMETER OutputPath
    Output directory for APK (default: ./build)
    
.EXAMPLE
    ./build-mobile-apk.ps1 -BuildType Release -OutputPath ./dist
#>

param(
    [string]$BuildType = "Release",
    [string]$KeystorePath = "redot2-release.jks",
    [string]$OutputPath = "./build",
    [switch]$SkipSigning
)

# Colors for output
$Success = @{ ForegroundColor = 'Green' }
$Warning = @{ ForegroundColor = 'Yellow' }
$Error = @{ ForegroundColor = 'Red' }

Write-Host "=== ABC-IO v2.0 Mobile APK Build ===" @Success

# Check prerequisites
Write-Host "Checking prerequisites..." @Warning

$checks = @{
    "Node.js" = { node --version }
    "npm" = { npm --version }
    "Android SDK" = { adb --version }
}

foreach ($check in $checks.GetEnumerator()) {
    try {
        $result = & $check.Value
        Write-Host "✓ $($check.Key): $($result.Split("`n")[0])" @Success
    } catch {
        Write-Host "✗ $($check.Key) NOT FOUND. Install it and retry." @Error
        exit 1
    }
}

# Resolve output path from repository root
$rootPath = (Get-Location).Path
$fullOutputPath = [System.IO.Path]::GetFullPath($OutputPath, $rootPath)

# Create output directory
if (!(Test-Path $fullOutputPath)) {
    New-Item -ItemType Directory -Path $fullOutputPath | Out-Null
    Write-Host "Created output directory: $fullOutputPath" @Success
}

# Navigate to mobile-gateway
Push-Location "./services/mobile-gateway"

# Install dependencies
Write-Host "Installing dependencies..." @Warning
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "npm install failed" @Error
    Pop-Location
    exit 1
}

Write-Host "Dependencies installed successfully" @Success

# Build APK
Write-Host "Building $BuildType APK..." @Warning

# For React Native / Expo projects:
if (Test-Path "eas.json") {
    # Use Expo
    Write-Host "Using Expo build system..." @Success
    eas build --platform android --$([char]::ConvertFromUtf32(0x2D))$(($BuildType -eq 'Release' ? 'release' : 'debug'))
} else {
    # Manual Android build
    Write-Host "Using Android Gradle build system..." @Success
    
    cd android
    
    if ($BuildType -eq "Release") {
        .\gradlew.bat bundleRelease
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Gradle build failed" @Error
            Pop-Location
            exit 1
        }
        Write-Host "Build complete: app/release/app-release.aab" @Success
    } else {
        .\gradlew.bat assembleDebug
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Gradle build failed" @Error
            Pop-Location
            exit 1
        }
        Write-Host "Build complete: app/debug/app-debug.apk" @Success
    }
    
    cd ..
}

# Sign APK (if not skipped)
if (!$SkipSigning -and $BuildType -eq "Release") {
    Write-Host "Signing APK..." @Warning
    
    # Check for keystore
    if (!(Test-Path $KeystorePath)) {
        Write-Host "Keystore not found at $KeystorePath" @Error
        Write-Host "Generate one with: keytool -genkey -v -keystore redot2-release.jks -alias redot2-key -keyalg RSA -keysize 2048 -validity 10950" @Warning
        Pop-Location
        exit 1
    }
    
    # Sign using jarsigner
    $keystorePassword = Read-Host "Enter keystore password" -AsSecureString
    $keyPassword = Read-Host "Enter key password" -AsSecureString
    
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($keystorePassword)
    $keystorePass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($keyPassword)
    $keyPass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    
    jarsigner -verbose `
        -sigalg SHA256withRSA `
        -digestalg SHA-256 `
        -keystore "$KeystorePath" `
        -storepass "$keystorePass" `
        -keypass "$keyPass" `
        "android/app/release/app-release.apk" `
        "redot2-key"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "APK signing failed" @Error
        Pop-Location
        exit 1
    }
    
    Write-Host "APK signed successfully" @Success
}

# Copy APK to output directory
Write-Host "Copying APK to output directory..." @Warning

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
if ($BuildType -eq "Release") {
    $artifactPath = "android/app/release/app-release.apk"
    $outputFile = Join-Path $fullOutputPath "redot2-Release-$timestamp.apk"
} else {
    $artifactPath = "android/app/debug/app-debug.apk"
    $outputFile = Join-Path $fullOutputPath "redot2-Debug-$timestamp.apk"
}

Copy-Item $artifactPath $outputFile -Force
Write-Host "APK copied to $outputFile" @Success

# Maintain a stable latest backup copy for local download
$stableFilePath = Join-Path $fullOutputPath 'redot2-latest.apk'
Copy-Item $outputFile $stableFilePath -Force
Write-Host "Stable APK copy created at: $stableFilePath" @Success

# Generate build report
$reportFile = "$OutputPath/BUILD_REPORT_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
@"
=== ABC-IO v2.0 Mobile APK Build Report ===
Date: $(Get-Date)
Build Type: $BuildType
Status: SUCCESS

Build Artifacts:
- Output Directory: $(Resolve-Path $OutputPath)
- Keystore: $KeystorePath
- Signed: $(if ($SkipSigning) { 'NO' } else { 'YES' })

Installation Instructions:
1. Connect Android device via USB
2. Run: adb install "$(Get-Item $OutputPath\*.apk | Select-Object -Last 1 -ExpandProperty Name)"
3. Launch app from device home screen

Configuration:
- API Backend: (will be configured on first app launch)
- Authentication: HMAC-SHA256
- Storage: Device local cache
- Permissions: Camera, Contacts, Location, Microphone

Support:
- Owner: cporreca@abc-io.com
- Mobile: 585-629-9120
"@ | Out-File $reportFile

Write-Host "Build report saved to: $reportFile" @Success

Pop-Location

Write-Host "=== Build Complete ===" @Success
Write-Host "APK ready at: $(Resolve-Path $OutputPath)" @Success

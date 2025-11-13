# Build script to create Zotero plugin XPI file
# Publication Rankings Plugin for Zotero 7
#
# Copyright (C) 2025 Ben Stephens
# Licensed under GNU General Public License v3.0 (GPLv3)
#
# XPI files are just ZIP files with a different extension

$pluginName = "publication-rankings"
$version = "0.1.0"
$outputFile = "$pluginName-$version.xpi"

# Remove old XPI if it exists
if (Test-Path $outputFile) {
    Remove-Item $outputFile
    Write-Host "Removed old $outputFile"
}

# Get the plugin directory
$pluginDir = $PSScriptRoot

# Create a temporary directory for building
$tempDir = Join-Path $env:TEMP "zotero-plugin-build"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy plugin files to temp directory
# Root files (required by Zotero)
$rootFiles = @(
    "manifest.json",
    "bootstrap.js",
    "prefs.js",
    "logo.svg",
    "preferences.xhtml"
)

# Source files (organized in subdirectories)
$sourceFiles = @(
    # Core
    "src\core\prefs-utils.js",
    "src\core\rankings.js",
    "src\core\hooks.js",
    # Data
    "src\data\data.js",
    # Databases
    "src\databases\database-registry.js",
    "src\databases\database-sjr.js",
    "src\databases\database-core.js",
    # Engine
    "src\engine\ranking-engine.js",
    "src\engine\matching.js",
    # UI
    "src\ui\column-manager.js",
    "src\ui\menu-manager.js",
    "src\ui\window-manager.js",
    "src\ui\ui-utils.js",
    # Actions
    "src\actions\ranking-actions.js",
    "src\actions\overrides.js"
)

# Copy root files
foreach ($file in $rootFiles) {
    $sourcePath = Join-Path $pluginDir $file
    $destPath = Join-Path $tempDir $file
    
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath $destPath
        Write-Host "Added: $file"
    } else {
        Write-Host "Warning: $file not found" -ForegroundColor Yellow
    }
}

# Copy source files (flattened to root of XPI)
foreach ($file in $sourceFiles) {
    $sourcePath = Join-Path $pluginDir $file
    $fileName = Split-Path $file -Leaf
    $destPath = Join-Path $tempDir $fileName
    
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath $destPath
        Write-Host "Added: $fileName (from $file)"
    } else {
        Write-Host "Warning: $file not found" -ForegroundColor Yellow
    }
}

# Create XPI file (ZIP archive with .xpi extension)
Write-Host "`nCreating XPI archive..."
$zipFile = $outputFile -replace '\.xpi$', '.zip'
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipFile -Force

# Rename ZIP to XPI
Rename-Item $zipFile $outputFile

# Clean up temp directory
Remove-Item $tempDir -Recurse -Force

# Show file size
$fileSize = (Get-Item $outputFile).Length / 1MB
Write-Host "`nSuccess! Created $outputFile ($([math]::Round($fileSize, 2)) MB)" -ForegroundColor Green
Write-Host "`nTo install:"
Write-Host "1. Open Zotero 7"
Write-Host "2. Go to Tools -> Add-ons"
Write-Host "3. Click the gear icon -> 'Install Add-on From File...'"
Write-Host "4. Select the $outputFile file"

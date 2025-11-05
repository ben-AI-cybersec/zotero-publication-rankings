# Build script to create Zotero plugin XPI file
# XPI files are just ZIP files with a different extension

$pluginName = "sjr-core-rankings"
$version = "1.1.1"
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
$filesToInclude = @(
    "manifest.json",
    "bootstrap.js",
    "logo.svg",
    "preferences.xhtml",
    "content\data.js",
    "content\rankings.js"
)

# Copy directories - removed since we're copying files individually
# $dirsToInclude = @("content")

foreach ($file in $filesToInclude) {
    $sourcePath = Join-Path $pluginDir $file
    $destPath = Join-Path $tempDir (Split-Path $file -Leaf)
    
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath $destPath
        Write-Host "Added: $file"
    } else {
        Write-Host "Warning: $file not found" -ForegroundColor Yellow
    }
}

# Removed directory copying since we copy files individually now
<#
foreach ($dir in $dirsToInclude) {
    $sourcePath = Join-Path $pluginDir $dir
    $destPath = Join-Path $tempDir $dir
    
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath $destPath -Recurse
        Write-Host "Added: $dir\"
    } else {
        Write-Host "Warning: $dir not found" -ForegroundColor Yellow
    }
}
#>

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

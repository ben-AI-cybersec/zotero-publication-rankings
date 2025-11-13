#!/bin/bash
# Build script to create Zotero plugin XPI file
# SJR & CORE Rankings Plugin for Zotero 7
#
# Copyright (C) 2025 Ben Stephens
# Licensed under GNU General Public License v3.0 (GPLv3)
#
# XPI files are just ZIP files with a different extension

pluginName="sjr-core-rankings"
version="1.1.4"
outputFile="${pluginName}-${version}.xpi"

# Remove old XPI if it exists
if [ -f "$outputFile" ]; then
    rm "$outputFile"
    echo "Removed old $outputFile"
fi

# Get the plugin directory
pluginDir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Create a temporary directory for building
tempDir=$(mktemp -d)
trap "rm -rf $tempDir" EXIT

# Root files (required by Zotero)
rootFiles=(
    "manifest.json"
    "bootstrap.js"
    "prefs.js"
    "logo.svg"
    "preferences.xhtml"
)

# Source files (organized in subdirectories)
sourceFiles=(
    # Core
    "src/core/prefs-utils.js"
    "src/core/rankings.js"
    "src/core/hooks.js"
    # Data
    "src/data/data.js"
    # Databases
    "src/databases/database-registry.js"
    "src/databases/database-sjr.js"
    "src/databases/database-core.js"
    # Engine
    "src/engine/ranking-engine.js"
    "src/engine/matching.js"
    # UI
    "src/ui/column-manager.js"
    "src/ui/menu-manager.js"
    "src/ui/window-manager.js"
    "src/ui/ui-utils.js"
    # Actions
    "src/actions/ranking-actions.js"
    "src/actions/overrides.js"
)

# Copy root files
for file in "${rootFiles[@]}"; do
    sourcePath="$pluginDir/$file"
    destPath="$tempDir/$file"
    
    if [ -f "$sourcePath" ]; then
        cp "$sourcePath" "$destPath"
        echo "Added: $file"
    else
        echo -e "\033[0;33mWarning: $file not found\033[0m"
    fi
done

# Copy source files (flattened to root of XPI)
for file in "${sourceFiles[@]}"; do
    sourcePath="$pluginDir/$file"
    fileName=$(basename "$file")
    destPath="$tempDir/$fileName"
    
    if [ -f "$sourcePath" ]; then
        cp "$sourcePath" "$destPath"
        echo "Added: $fileName (from $file)"
    else
        echo -e "\033[0;33mWarning: $file not found\033[0m"
    fi
done

# Create XPI file (ZIP archive with .xpi extension)
echo -e "\nCreating XPI archive..."
cd "$tempDir"

# Check if zip is available, otherwise use 7z or jar
if command -v zip &> /dev/null; then
    zip -q -r "$pluginDir/$outputFile" .
elif command -v 7z &> /dev/null; then
    7z a -tzip "$pluginDir/$outputFile" . > /dev/null
elif command -v jar &> /dev/null; then
    jar cf "$pluginDir/$outputFile" .
else
    echo -e "\033[0;31mError: No zip utility found. Please install zip, 7zip, or use Java's jar command.\033[0m"
    exit 1
fi

cd "$pluginDir"

# Show file size (WSL-compatible)
fileSize=$(stat -c%s "$outputFile" 2>/dev/null || stat --format=%s "$outputFile" 2>/dev/null || wc -c < "$outputFile")
fileSizeMB=$(awk "BEGIN {printf \"%.2f\", $fileSize/1024/1024}")
echo -e "\n\033[0;32mSuccess! Created $outputFile ($fileSizeMB MB)\033[0m"
echo -e "\nTo install:"
echo "1. Open Zotero 7"
echo "2. Go to Tools -> Add-ons"
echo "3. Click the gear icon -> 'Install Add-on From File...'"
echo "4. Select the $outputFile file"

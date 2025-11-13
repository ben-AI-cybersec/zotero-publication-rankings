# Changelog

All notable changes to the Publication Rankings plugin for Zotero will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-11-14

### Initial Release
Fresh start with renamed plugin architecture to support future expansion beyond SJR and CORE rankings.

### Features
- **Custom Ranking Column** - Dedicated "Ranking" column in Zotero item tree
  - Column can be shown/hidden, resized, and sorted
  - Rankings calculated dynamically on display
  - Zero modification to item metadata
- **SJR Journal Rankings** - Support for 30,818+ journals from SCImago Journal Rankings 2024
  - Displays quartile classifications (Q1-Q4) with SJR scores
  - Format: "Q1 18.288", "Q2 1.423", "Q3 0.628", "Q4 0.145"
- **CORE Conference Rankings** - Support for 2,107+ conferences from CORE 2023
  - Australian Computing Research rankings (A*, A, B, C)
  - Historical rankings with vintage years (e.g., "B [2018]")
  - Australasian and National classifications (Au A, Nat US, etc.)
- **Intelligent Matching Engine** - 8 fuzzy matching strategies
  - Exact title matching
  - Fuzzy matching (85%+ overlap with bidirectional validation)
  - Word overlap detection
  - Acronym matching with ambiguity detection
  - Conference proceedings title normalization
  - Handles ordinals and name variations
- **Manual Override System** - Context menu for correcting matches
  - "Set Manual Ranking..." to override automatic matches
  - "Clear Manual Ranking" to revert to automatic
  - Persistent storage across sessions
- **Debug Mode** - Developer tools for troubleshooting
  - "Debug Ranking Match" shows detailed matching algorithm output
  - Preference toggle for debug mode
  - Detailed logging in Zotero Debug Output
- **Extensible Database Architecture** - Plugin system for ranking sources
  - DatabaseRegistry for uniform interface across all ranking sources
  - Priority-based database selection
  - Easy addition of future databases (JCR, Qualis, ERA, etc.)
  - Zero core logic changes required for new databases

### User Interface
- **Preferences Panel** with three sections:
  - Ranking Databases: Enable/disable CORE rankings (SJR always enabled)
  - Automatic Updates: Toggle auto-ranking on item add/modify
  - Developer Options: Enable debug mode
- **Context Menu Actions**:
  - "Check Rankings for Selected Items" - Manual ranking refresh
  - "Set Manual Ranking..." - Override automatic match
  - "Clear Manual Ranking" - Remove override
  - "Debug Ranking Match" - Show matching details (debug mode only)
- **Progress Window** - Visual feedback for large selections
  - Shows item count and progress
  - Displays completion statistics
  - Auto-closes after 3 seconds

### Technical Architecture
- **Modular Source Organization**
  - `src/core/` - Main coordinator, lifecycle, preferences
  - `src/data/` - Ranking database data
  - `src/databases/` - Database plugin modules (registry, SJR, CORE)
  - `src/engine/` - Ranking engine and matching algorithms
  - `src/ui/` - UI components (column, menus, windows)
  - `src/actions/` - User actions and manual overrides
- **Zotero 7 API Compliance**
  - Modern Services API (no deprecated XPCOM)
  - Bootstrap.js lifecycle hooks pattern
  - ItemTreeManager for custom columns
  - Notifier API for item events
- **Build System**
  - PowerShell and Bash build scripts
  - Automated XPI packaging
  - Cross-platform support (Windows/Linux/WSL)

### Configuration
- `extensions.publication-rankings.autoUpdate` - Enable automatic ranking updates (default: true)
- `extensions.publication-rankings.enableCORE` - Enable CORE conference rankings (default: true)
- `extensions.publication-rankings.debugMode` - Enable debug mode (default: false)

### Display Formats
- **Journals**: Q1 18.288, Q2 1.423, Q3 0.628, Q4 0.145
- **Conferences**: A*, A, B, C, B [2018], C [2014]
- **Australasian**: Au A, Au B, Au C
- **National**: Nat US, Nat AU, etc.
- **Other**: TBR (To Be Ranked), Unranked as -

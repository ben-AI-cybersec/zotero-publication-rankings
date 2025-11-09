# Changelog

All notable changes to the SJR & CORE Rankings plugin for Zotero will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.4] - 2025-11-09

### Added
- **Database Registry System** - Extensible plugin architecture for multiple ranking databases
  - New `DatabaseRegistry` module provides uniform interface for all ranking sources
  - Database plugins register with priority, preference key, and matcher function
  - Adding new databases (JCR, Qualis, ERA) requires zero changes to core logic
  - Generic preference handling automatically supports new database toggles
- **Modular database plugins** - SJR and CORE extracted as independent plugins
  - `database-sjr.js` - SJR matching strategies (exact, fuzzy, word overlap)
  - `database-core.js` - CORE conference matching wrapper
  - Both databases treated uniformly via registry pattern
- **Organized directory structure** - Professional source code organization
  - `src/core/` - Main coordinator, lifecycle, preferences (3 files)
  - `src/data/` - Database rankings data (1 file)
  - `src/databases/` - Database plugins (registry, sjr, core) ⭐
  - `src/engine/` - Ranking engine and matching logic (2 files)
  - `src/ui/` - UI components (column, menus, windows, utilities - 4 files)
  - `src/actions/` - User actions and overrides (2 files)
  - Clean root directory with only Zotero-required files
- **Enhanced preferences UI** - New "Ranking Databases" section
  - SJR shown as always enabled (primary database)
  - CORE shown as toggleable option with clear description
  - Future-proof messaging about additional databases
  - Better hierarchy: Databases → Auto-update → Developer options
- **Debug mode preference** - New "Developer Options" section in preferences
  - Checkbox to enable/disable debug mode (default: disabled)
  - Controls visibility of "Debug Ranking Match" context menu item
  - Dynamic updates without restart - menu item appears/disappears immediately when toggled
  - Uses preference observer for real-time menu updates across all windows
- **Preference wrapper utility** - New `prefs-utils.js` module for cleaner preference access
  - Eliminates repetitive prefix concatenation (`extensions.sjr-core-rankings`)
  - Ensures consistent use of the `true` parameter for global preference storage
  - Provides helper functions: `getPref()`, `setPref()`, `registerPrefObserver()`, `unregisterPrefObserver()`, `clearPref()`
  - Improves code maintainability and readability (DRY principle)
- **Lifecycle hooks module** - New `hooks.js` module for cleaner architecture
  - Implements standard lifecycle event pattern from modern Zotero 7 plugins
  - Provides clean handlers: `onStartup()`, `onShutdown()`, `onMainWindowLoad()`, `onMainWindowUnload()`, `onInstall()`, `onUninstall()`
  - Bootstrap.js simplified to a minimal dispatcher (delegates all logic to hooks)
  - Better separation of concerns and easier to maintain
  - Comprehensive JSDoc documentation for all hook functions

### Changed
- **Architecture improvements** - Massive refactoring for extensibility and maintainability
  - `RankingEngine` simplified from 252 → 132 lines (120 lines removed)
  - Removed hardcoded SJR/CORE logic, now uses DatabaseRegistry
  - Generic `handleDatabaseChange()` replaces database-specific preference handlers
  - Automatic registration of preference observers for all database plugins
  - Module loading order optimized for new structure
- **Code quality improvements** - Refactored preference access across all modules
  - Updated `rankings.js` to use new preference wrapper utilities (6 call sites)
  - Updated `overrides.js` to use new preference wrapper utilities (3 call sites)
  - Cleaner, more maintainable code with single source of truth for preference prefix
- **Bootstrap modernization** - Following Zotero 7 best practices
  - Bootstrap.js simplified from 130+ lines to ~70 lines (cleaner dispatcher pattern)
  - Lifecycle logic moved from bootstrap.js into dedicated `hooks.js` module
  - Module loading centralized in `loadModules()` function with clear dependency order
  - Better code organization and easier future maintenance
- **Services API migration audit completed** - Verified full Zotero 7 API compliance
- **JSDoc compliant docs** - Added JSDoc strings with params to all functions

### Fixed
- **Column resizing** - Fixed issue where Ranking column had excessive minimum width
  - Shortened dataKey from 'sjr-core-ranking' to 'ranking' (Zotero uses dataKey length for minimum width)
  - Removed explicit width constraints that interfered with natural resizing behavior
  - Added 'ordinal' to zoteroPersist array for proper column position persistence
  - Column now resizes smoothly and naturally like built-in Zotero columns
- **CORE preference changes** - Fixed issue where disabling CORE rankings didn't clear existing CORE rankings
  - Added preference observer for `enableCORE` setting
  - Cache is now automatically cleared when CORE is enabled/disabled
  - Item tree refreshes immediately to show updated rankings
  - Ensures rankings reflect current preference state

### Technical
- **Extensibility**: Adding new databases now requires only:
  1. Create `src/databases/database-xxx.js` with matcher function
  2. Register with `DatabaseRegistry.register({ id, name, prefKey, priority, matcher })`
  3. Add preference to `prefs.js` and `preferences.xhtml` (if optional)
  4. Add to build script
  - **No changes to core logic required!**
- **Module count**: 15 source files organized in 6 logical directories
- **Build output**: 0.44 MB XPI (20 files total)


## [1.1.3] - 2025-11-09

### Added
- **Progress window** - visual feedback when checking rankings for large selections
  - Shows "Checking N items..." with spinner
  - Updates progress every 10 items
  - Displays final statistics with success icon
  - Auto-closes after 3 seconds

### Fixed
- **Manual ranking persistence** - Fixed bug where manual rankings weren't persisting across Zotero restarts
  - Added required third parameter `true` to `Zotero.Prefs.set()` for global preference storage
  - Added robust JSON parsing with fallback for corrupted preference data
  - Manual overrides now correctly saved and loaded on startup
- **Dialog prompt compatibility** - Fixed Zotero 7 compatibility issue with manual ranking dialog
  - Replaced deprecated XPCOM Components API with modern Services API
  - Dialog now displays correctly when setting manual rankings

## [1.1.2] - 2025-11-08

### Added
- **Debug matching mode** - detailed logging shows all matching strategies attempted
- **Manual ranking override** - right-click context menu to manually set rankings for mismatches
- **Column sorting** - rankings now sort correctly in item tree (best to worst)
- Context menu: "Debug Match for Selected Items" shows detailed algorithm output
- Context menu: "Set Manual Ranking..." allows correcting false positives
- Context menu: "Clear Manual Ranking" reverts to automatic matching

### Fixed
- Fixed global variable scope issue preventing plugin from loading
- Fixed menu item not appearing in Tools menu (now uses correct `menu_ToolsPopup` ID)
- Fixed `ZoteroPane is not defined` error when using "Check Rankings" menu item
- **Fixed false positive matches** where unrelated journals were incorrectly matched (e.g., "World Journal of Science and Technology" matching "Journal of Materials Science and Technology")
- **Fixed CORE acronym matching bug** - acronyms now used as last resort only, with safety checks:
  - Acronyms require 4+ characters to avoid ambiguous matches (CSR, AI, ML, IoT, etc.)
  - Detects ambiguous acronyms (multiple conferences with same acronym) and refuses to match
  - Strategy order: Exact → Substring → Word Overlap → Acronym (last)
- Added window tracking to prevent duplicate UI elements
- Column sorting now works correctly with zero-padded numeric prefixes

### Changed
- **Code modularization** - refactored into separate modules for maintainability:
  - `matching.js` - String normalization and ranking match algorithms (265 lines)
  - `overrides.js` - Manual override management with persistent storage (102 lines)
  - `ui-utils.js` - UI helpers for colors, sorting, formatting (147 lines)
  - `rankings.js` - Main plugin coordination and Zotero integration (808 lines, down from 1013)
- Removed unnecessary sandbox/context approach for simpler script loading
- Improved error handling and debug logging
- Menu item now correctly passes window context to ranking checker
- **Improved fuzzy matching algorithm** with stricter criteria:
  - Increased threshold from 70% to 85% overlap (SJR side)
  - Added 80% bidirectional overlap requirement (search side)
  - Increased minimum title length from 4 to 5 significant words
  - Reduces false positives while maintaining legitimate conference proceedings matches
- Ranking cache automatically cleared when manual overrides change

## [1.1.1] - 2025-11-05
Refactoring for initial release

## [1.1.0] - 2025-11-04

### Changed
- **Custom Column Display**: Rankings now appear in a dedicated "Ranking" column instead of the Series field
- Series field is no longer modified by the plugin
- Column can be shown/hidden, resized, and sorted like any built-in column
- Rankings are calculated dynamically when items are displayed

### Added
- Custom column using Zotero.ItemTreeManager.registerColumn() API
- Synchronous ranking calculation for efficient column display
- Column preferences persist between sessions (width, visibility, sort)

### Improved
- Better performance with on-demand ranking calculation
- No longer modifies item metadata

## [1.0.0] - 2025-11-03

### Features
- Plugin automatically adds rankings when new items are added to your library
- Support for 30,818+ journal rankings from SJR 2024
- Support for 2,107+ conference rankings from CORE (2023 and historical editions)
- 8 fuzzy matching strategies for robust title matching
- Handles conference name variations (proceedings titles, acronyms, ordinals)
- Shows vintage years for older rankings (e.g., "B [2018]")

### Configuration
- `extensions.sjr-core-rankings.autoUpdate` preference to enable/disable automatic updates (default: true)

### Display Formats
- **Journals**: Q1 18.288, Q2 1.423, Q3 0.628, Q4 0.145
- **Conferences**: A*, A, B, C, B [2018], C [2014]
- **Australasian**: Au A, Au B, Au C
- **National**: Nat US, Nat AU, etc.
- **Other**: TBR (To Be Ranked), Unranked as -

### Technical Details
- Uses Zotero.Notifier API for item event monitoring
- Checks publicationTitle, proceedingsTitle, and conferenceName fields

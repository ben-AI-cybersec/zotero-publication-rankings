# Changelog

All notable changes to the SJR & CORE Rankings plugin for Zotero will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2025-11-08

### Fixed
- Fixed global variable scope issue preventing plugin from loading
- Fixed menu item not appearing in Tools menu (now uses correct `menu_ToolsPopup` ID)
- Fixed `ZoteroPane is not defined` error when using "Check Rankings" menu item
- **Fixed false positive matches** where unrelated journals were incorrectly matched (e.g., "World Journal of Science and Technology" matching "Journal of Materials Science and Technology")
- Added window tracking to prevent duplicate UI elements

### Changed
- Removed unnecessary sandbox/context approach for simpler script loading
- Improved error handling and debug logging
- Menu item now correctly passes window context to ranking checker
- **Improved fuzzy matching algorithm** with stricter criteria:
  - Increased threshold from 70% to 85% overlap (SJR side)
  - Added 80% bidirectional overlap requirement (search side)
  - Increased minimum title length from 4 to 5 significant words
  - Reduces false positives while maintaining legitimate conference proceedings matches

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

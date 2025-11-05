# Changelog

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
- **Other**: TBR (To Be Ranked), Unranked

### Technical Details
- Uses Zotero.Notifier API for item event monitoring
- Checks publicationTitle, proceedingsTitle, and conferenceName fields
- Only updates items with empty Series fields (automatic mode)
- Manual mode overwrites existing Series values

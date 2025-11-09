# SJR & CORE Rankings Plugin for Zotero 7

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/ben-AI-cybersec/sjr-core-rankings-zotero-plugin?style=for-the-badge)](https://github.com/ben-AI-cybersec/sjr-core-rankings-zotero-plugin/releases/latest) [![GitHub Downloads all releases](https://img.shields.io/github/downloads/ben-AI-cybersec/sjr-core-rankings-zotero-plugin/total?style=for-the-badge&color=forestgreen)](https://github.com/ben-AI-cybersec/sjr-core-rankings-zotero-plugin/releases/latest) [![GitHub Downloads (latest release)](https://img.shields.io/github/downloads/ben-AI-cybersec/sjr-core-rankings-zotero-plugin/latest/total?style=for-the-badge)](https://github.com/ben-AI-cybersec/sjr-core-rankings-zotero-plugin/releases/latest)

A Zotero plugin that automatically displays journal and conference rankings in a custom column in your Zotero library.

## Features

- **Custom "Ranking" Column**: See rankings at a glance without modifying your metadata
- **SJR Journal Rankings**: 30,818+ journals with quartiles (Q1-Q4) and SJR scores
- **CORE Conference Rankings**: 2,107+ conferences (A*, A, B, C) with historical editions
- **Color-Coded Display**: Green (Q1/A*) → Blue (Q2/A) → Orange (Q3/B) → Red (Q4/C)
- **Smart Matching**: 8 fuzzy matching strategies handle title variations and acronyms
- **Automatic Updates**: Rankings appear when items are added or viewed
- **Sortable Column**: Click column header to sort by ranking tier (A* → Q4)
- **Context Menu Integration**: Right-click items for quick ranking operations
- **Debug Matching**: Detailed logging to troubleshoot matching issues
- **Manual Override**: Set custom rankings for incorrectly matched journals
- **Persistent Storage**: Manual overrides and preferences survive Zotero restarts

## Installation

1. Download `sjr-core-rankings-1.1.0.xpi` from the [releases page](releases/)
2. In Zotero 7: Tools → Add-ons → ⚙️ → "Install Add-on From File..."
3. Select the `.xpi` file and restart Zotero
4. Right-click column headers and enable the "Ranking" column

## Usage

Rankings automatically appear in the Ranking column when you view items.

### Check Rankings

To see statistics about ranking matches for selected items:
1. Select one or more items in your library
2. Right-click → "Check SJR & CORE Rankings" (or Tools → "Check SJR & CORE Rankings")
3. A dialog shows how many rankings were found/not found

### Debug Matching

If rankings aren't appearing correctly:
1. Select items to debug
2. Right-click → "Debug Ranking Match"
3. Open Help → Debug Output Logging → View Output
4. Look for lines starting with `[MATCH DEBUG]` showing:
   - Matching strategies attempted (exact, fuzzy, word overlap, CORE)
   - Match percentages and which database was used
   - Final ranking result or why no match was found

### Manual Ranking Override

For incorrectly matched journals or unmatched publications:
1. Select items from the same publication
2. Right-click → "Set Manual Ranking..."
3. Enter ranking (e.g., "A*", "Q1", "B", "C", "Au A", "Nat B")
4. The ranking column updates immediately

To remove a manual override:
1. Select items
2. Right-click → "Clear Manual Ranking"
3. Rankings revert to automatic matching

**Note**: Manual overrides are stored persistently and survive Zotero restarts.

### Sorting by Ranking

Click the "Ranking" column header to sort items by ranking tier:
- **Ascending**: Best (A*) → Worst (Unranked)
- **Descending**: Worst (Unranked) → Best (A*)

The sort order follows: A* > Q1/A > Q2/B > Q3/C > Q4 > National > Unranked

## Preferences

Access via Edit → Preferences (Zotero → Settings on Mac), then select "Rankings":
- **Auto-Update**: Enable/disable automatic ranking updates
- **CORE Database**: Toggle conference rankings on/off

## Building from Source

### Prerequisites
- Python 3.x for data extraction scripts
- PowerShell for building the plugin

### Updating Rankings Data

When new SJR or CORE rankings are released:

```bash
cd update-scripts

# Step 1: Extract SJR rankings (from scimagojr CSV)
python extract_sjr.py

# Step 2: Extract CORE rankings (from full_CORE.csv with historical data)
python extract_full_core.py

# Step 3: Combine into plugin data file
python generate_data_js.py
```

This generates the `data.js` file in the plugin directory.

### Building the Plugin

```powershell
cd sjr-core-rankings-zotero-plugin
.\build.ps1
```

This creates `sjr-core-rankings-1.1.0.xpi` ready for installation.

## Project Structure

```
sjr-core-rankings-zotero-plugin/
├── update-scripts/                   # Data extraction scripts
│   ├── scimagojr 2024.csv           # SJR source data
│   ├── full_CORE.csv                # CORE source data
│   ├── extract_sjr.py               # Extract SJR rankings
│   ├── extract_full_core.py         # Extract CORE rankings
│   └── generate_data_js.py          # Combine into data.js
├── manifest.json                     # Plugin metadata
├── bootstrap.js                      # Plugin lifecycle hooks
├── prefs.js                          # Default preferences
├── data.js                           # Rankings databases (32,934 lines)
├── matching.js                       # String normalization & matching algorithms
├── overrides.js                      # Manual override persistence
├── ui-utils.js                       # UI formatting, colors, sorting
├── rankings.js                       # Main plugin coordination
├── preferences.xhtml                 # Settings UI
├── logo.svg                          # Plugin icon
├── build.ps1                         # Build script (creates XPI)
├── README.md                         # This file
├── CHANGELOG.md                      # Version history
├── INSTALL.md                        # Installation guide
└── LICENSE                           # GPLv3 license
```

### Modular Architecture

The plugin uses a modular architecture for better maintainability:

- **`bootstrap.js`** (115 lines) - Plugin lifecycle management, loads all modules
- **`data.js`** (32,934 lines) - Ranking databases: `sjrRankings` (30,818 journals), `coreRankings` (2,107 conferences)
- **`matching.js`** (237 lines) - String normalization and matching algorithms
  - 5-strategy CORE conference matching (exact → substring → word overlap → acronym)
  - 3-strategy SJR journal matching with fuzzy logic
  - Exported as `MatchingUtils` global object
- **`overrides.js`** (100 lines) - Manual ranking override management
  - Persistent storage in Zotero preferences
  - Exported as `ManualOverrides` global object
- **`ui-utils.js`** (133 lines) - UI formatting and display helpers
  - Color coding (green for A*/Q1, blue for A/Q2, orange for B/Q3, red for C/Q4)
  - Sort value calculation with inversion for proper ordering
  - Exported as `UIUtils` global object
- **`rankings.js`** (808 lines) - Main plugin coordination
  - Zotero integration (custom column, context menus, notifier)
  - Item tree display and caching
  - Exported as `ZoteroRankings` global object (attached to `Zotero.SJRCoreRankings`)

## Data Sources

- **SJR 2024**: [SCImago Journal & Country Rank](https://www.scimagojr.com/)
- **CORE 2023**: [Computing Research and Education](http://portal.core.edu.au/conf-ranks/)

## License

This project is licensed under the GNU General Public License v3.0 (GPLv3).
See the [LICENSE](LICENSE) file for details.

## Author

**Ben Stephens**

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have suggestions, please open an issue on the [GitHub repository](https://github.com/ben-AI-cybersec/sjr-core-rankings-zotero-plugin).

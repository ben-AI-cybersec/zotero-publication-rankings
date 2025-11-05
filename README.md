# SJR & CORE Rankings Plugin for Zotero 7

A Zotero plugin that automatically displays journal and conference rankings in a custom column in your Zotero library.

## Features

- **Custom "Ranking" Column**: See rankings at a glance without modifying your metadata
- **SJR Journal Rankings**: 30,818+ journals with quartiles (Q1-Q4) and SJR scores
- **CORE Conference Rankings**: 2,107+ conferences (A*, A, B, C) with historical editions
- **Color-Coded Display**: Green (Q1/A*) → Blue (Q2/A) → Orange (Q3/B) → Red (Q4/C)
- **Smart Matching**: 8 fuzzy matching strategies handle title variations and acronyms
- **Automatic Updates**: Rankings appear when items are added or viewed

## Installation

1. Download `sjr-core-rankings-1.1.0.xpi` from the [releases page](releases/)
2. In Zotero 7: Tools → Add-ons → ⚙️ → "Install Add-on From File..."
3. Select the `.xpi` file and restart Zotero
4. Right-click column headers and enable the "Ranking" column

## Usage

Rankings automatically appear in the Ranking column when you view items.

### Manual Check (Coming soon)

To see statistics about ranking matches for selected items:
1. Select one or more items in your library
2. Go to Tools → "Check Rankings for Selected Items"
3. A dialog will show how many were found/not found

Note: This only shows statistics; rankings are always visible in the column.

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
├── rankings.js                       # Main plugin logic
├── data.js                           # Rankings data (2.2MB)
├── preferences.xhtml                 # Settings UI
├── logo.svg                          # Plugin icon
├── build.ps1                         # Build script (creates XPI)
├── README.md                         # This file
├── CHANGELOG.md                      # Version history
├── INSTALL.md                        # Installation guide
└── LICENSE                           # GPLv3 license
```

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

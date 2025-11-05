# Installation Guide

## Quick Start

1. **Download the Plugin**
   - The plugin file is: `sjr-core-rankings-1.0.0.xpi` (0.41 MB)

2. **Install in Zotero 7**
   - Open Zotero 7
   - Go to **Tools → Add-ons** (or press Ctrl+Shift+A)
   - Click the **gear icon** (⚙️) in the top-right corner
   - Select **"Install Add-on From File..."**
   - Navigate to and select `sjr-core-rankings-1.0.0.xpi`
   - Click **"Install Now"** when prompted
   - Restart Zotero if required

3. **Use the Plugin**
   
   **Automatic Mode (Default):**
   - Simply add new items to your library (via browser, DOI, PDF, etc.)
   - Rankings are automatically added to the Series field
   - Works silently in the background
   
   **Manual Mode:**
   - Select one or more items in your Zotero library
   - Go to **Tools → Update Rankings for Selected Items**
   - Wait for the update to complete
   - Check the "Series" field of your items to see the rankings

## What Gets Updated

The plugin updates the **Series** field with:

### Journal Rankings (from SJR 2024)
- Format: `Q1 18.288`, `Q2 1.423`, `Q3 0.628`, `Q4 0.145`
- 30,818+ journals covered

### Conference Rankings (from CORE)
- Format: `A*`, `A`, `B`, `C`
- For older rankings: `B [2018]`, `C [2014]`
- Australasian: `Au A`, `Au B`, `Au C`
- National: `Nat US`, `Nat AU`, etc.
- Other: `TBR` (To Be Ranked), `Unranked`
- 2,107+ conferences covered

## Matching Algorithm

The plugin uses 8 different fuzzy matching strategies:
1. Exact title matching
2. Acronym extraction and matching
3. Normalized text comparison
4. Substring matching
5. Word overlap analysis (70-80% threshold)
6. Conference title cleaning (removes years, ordinals)
7. Multiple field checking (publicationTitle, proceedingsTitle, conferenceName)

**Expected match rate**: 86% for eligible items (journals and conferences in the databases)

## Configuration

### Disable Auto-Update

If you prefer to only update rankings manually:

1. Go to **Edit → Settings** (or **Zotero → Settings** on Mac)
2. Click **Advanced** tab
3. Click **Config Editor** button
4. Search for: `extensions.sjr-core-rankings.autoUpdate`
5. Double-click the entry to change it to `false`

To re-enable, change it back to `true`.

## Troubleshooting

**"Not found" items**
- Workshops, regional conferences, or local journals may not be in the databases
- Check if the publication title exactly matches database entries
- Manual updates may be needed for obscure venues

**No menu item appears**
- Make sure you're using Zotero 7 (not earlier versions)
- Try restarting Zotero after installation
- Check Tools → Add-ons to verify the plugin is enabled

**Plugin doesn't update items**
- Verify items have a publication title, proceedings title, or conference name
- The plugin only works on regular items (not attachments or notes)
- Select items before running the update

## Rebuilding from Source

If you want to modify the plugin:

1. Edit the files:
   - `manifest.json` - Plugin metadata
   - `bootstrap.js` - Lifecycle hooks
   - `rankings.js` - Main plugin logic
   - `data.js` - Ranking data (generated from CSV files)

2. Run the build script:
   ```powershell
   .\build.ps1
   ```

3. Install the newly created `.xpi` file

## Data Updates

To update the ranking data:

1. Download new CSV files:
   - SJR: https://www.scimagojr.com/journalrank.php
   - CORE: http://portal.core.edu.au/conf-ranks/

2. Run the Python generator:
   ```python
   python generate_data_js.py
   ```

3. Rebuild the plugin with `.\build.ps1`

## Support

For issues or questions, please check the README.md file or contact the developer.

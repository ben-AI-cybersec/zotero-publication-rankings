# Installation Guide

## Publication Rankings for Zotero 7+

**Author:** Ben Stephens  
**License:** GNU General Public License v3.0 (GPLv3)  
**Repository:** https://github.com/ben-AI-cybersec/zotero-publication-rankings

## Quick Start

1. **Download the Plugin**
   - The plugin file is: `publication-rankings-x.x.x.xpi`

2. **Install in Zotero 7+ **
   - Open Zotero
   - Go to **Tools → Add-ons** (or press Ctrl+Shift+A)
   - Click the **gear icon** (⚙️) in the top-right corner
   - Select **"Install Add-on From File..."**
   - Navigate to and select `publication-rankings-x.x.x.xpi`
   - Click **"Install Now"** when prompted
   - Restart Zotero if required

3. **Use the Plugin**
   
   **Automatic Mode (Default):**
   - Simply add new items to your library (via browser, DOI, PDF, etc.)
   - Rankings automatically appear in the custom "Ranking" column
   - Right-click column headers to show/hide the Ranking column
   - Works silently in the background
   
   **Manual Mode:**
   - Select one or more items in your Zotero library
   - Go to **Tools → Check Publication Rankings**
   - Wait for the update to complete
   - Check the "Ranking" column to see the results

## What Gets Displayed

The plugin displays rankings in a custom "Ranking" column with:

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

### CABS ABS Rankings (2024)
- Format: `1`, `2`, `3`, `4`, `4*`
- 1,822 journals

### Financial Times 50 Journal Rank (FT50)
- Format: `FT50`
- 50 Journals

## Matching Algorithm

The plugin uses 8 different fuzzy matching strategies:
1. Exact title matching
2. Acronym extraction and matching
3. Normalized text comparison
4. Substring matching
5. Word overlap analysis (70-80% threshold)
6. Conference title cleaning (removes years, ordinals)
7. Multiple field checking (publicationTitle, proceedingsTitle, conferenceName)

## Configuration

### Disable Auto-Update

If you prefer to only update rankings manually:

1. Go to **Edit → Settings** (or **Zotero → Settings** on Mac)
2. Click **Rankings** tab in the preferences
3. Uncheck "Automatically update rankings when items are added or modified"

Alternatively, using Config Editor:
1. Go to **Edit → Settings** (or **Zotero → Settings** on Mac)
2. Click **Advanced** tab
3. Click **Config Editor** button
4. Search for: `extensions.publication-rankings.autoUpdate`
5. Double-click the entry to change it to `false`

To re-enable, change it back to `true`.

## Troubleshooting

**"Not found" items**
- Workshops, regional conferences, or local journals may not be in the databases
- Check if the publication title exactly matches database entries
- Manual updates may be needed for obscure venues

**No menu item appears**
- Known issue

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
   - ABS: https://journalranking.org
   - FT50: https://www.ft.com/content/3405a512-5cbb-11e1-8f1f-00144feabdc0

2. Run the Python generator:
   ```python
   python generate_data_js.py
   ```

3. Rebuild the plugin with `.\build.ps1`

## Support

For issues or questions:
- Check the [README.md](README.md) file
- Open an issue on [GitHub](https://github.com/ben-AI-cybersec/zotero-publication-rankings/issues)

---

**Copyright © 2025 Ben Stephens**  
This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

# Version 1.1.0 Release Summary

## Major Changes

### Custom Column Instead of Series Field

**What Changed:**
- Rankings now appear in a dedicated **"Ranking"** column in the item tree
- The Series field is **no longer modified** by the plugin
- Rankings are calculated dynamically when items are displayed

**Why:**
- The Series field may contain important metadata (e.g., "Lecture Notes in Computer Science")
- Users reported losing series information when rankings overwrote it
- Custom columns provide a cleaner, non-destructive way to display rankings

### User Interface Changes

**Before (v1.0.0):**
- Rankings written to Series field
- Menu: "Update Rankings for Selected Items"
- Auto-update modifies Series field

**After (v1.1.0):**
- Rankings displayed in custom "Ranking" column
- Menu: "Check Rankings for Selected Items"
- Auto-update triggers column refresh (no field modifications)

## Installation

Download `sjr-core-rankings-1.1.0.xpi` and install via:
- Zotero → Tools → Add-ons → Gear icon → "Install Add-on From File..."

## How to Use

1. **Show the Column**: Right-click column headers → Check "Ranking"
2. **View Rankings**: Rankings appear automatically for recognized journals/conferences
3. **Sort/Resize**: Click header to sort, drag border to resize
4. **Check Statistics**: Tools → Check Rankings for Selected Items

## Features Retained

All matching capabilities from v1.0.0 are preserved:
- ✅ 30,818 SJR journal rankings
- ✅ 2,107 CORE conference rankings
- ✅ 8 fuzzy matching strategies
- ✅ 86% match rate for eligible items
- ✅ Historical rankings with vintage years
- ✅ Auto-update on new items
- ✅ Preference to enable/disable auto-update

## Technical Details

**API Used:**
- `Zotero.ItemTreeManager.registerColumn()` - Create custom column
- `Zotero.ItemTreeManager.unregisterColumn()` - Cleanup on disable

**Performance:**
- On-demand calculation (only when displayed)
- No database writes
- Column data cached by Zotero

**Compatibility:**
- Zotero 7.0+
- Same plugin ID: `sjr-core-rankings@zotero.org`

## Migration from v1.0.0

**If you have v1.0.0 installed:**
1. Series field data remains untouched (you can manually clear if desired)
2. Install v1.1.0 (will replace v1.0.0)
3. Show "Ranking" column
4. Rankings appear in new column

**No data loss:**
- Your library is unchanged
- Old Series field rankings remain (optional to keep or clear)

## Files Changed

- `rankings.js`: Added custom column registration and synchronous data provider
- `manifest.json`: Version bump to 1.1.0, updated description
- `README.md`: Updated usage instructions
- `CHANGELOG.md`: Added v1.1.0 entry
- `build.ps1`: Updated version number

## Documentation

- `README.md`: User guide
- `INSTALL.md`: Installation instructions
- `CHANGELOG.md`: Version history
- `CUSTOM_COLUMN_MIGRATION.md`: Technical migration details

## Known Issues

None currently known.

## Support

If you encounter issues:
1. Check "Ranking" column is visible (right-click headers)
2. Verify auto-update preference: `extensions.sjr-core-rankings.autoUpdate`
3. Check Zotero Error Console: Help → Developer → Error Console

## Future Plans

Potential enhancements:
- Color-coding by ranking tier
- Tooltips with full ranking details
- Custom sorting by ranking value
- Multiple column variants (SJR only, CORE only)

---

**Package:** `sjr-core-rankings-1.1.0.xpi` (0.42 MB)
**Release Date:** 2024
**Plugin ID:** `sjr-core-rankings@zotero.org`

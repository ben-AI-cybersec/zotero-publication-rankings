/**
 * FT50 Database Plugin
 *
 * Financial Times 50 Journal Rankings (FT50) database matching strategies.
 *
 * Data source: ft50Rankings global object from data.js
 */

/* global Zotero, sjrRankings, MatchingUtils, DatabaseRegistry */

var ft50Database = {
	/**
	* Main Matching Function
	* @param {string} title - Publication title to match
	* @param {Function} debugLog - Debug logging function
	* @returns {string|null} Ranking string (e.g., "1" or "4*") or N/A if not found
 */
	match: function (title, debugLog, context) {
		debugLog(`[FT50] Retrieving ranking from database...`);

		var key = MatchingUtils.lookup('ft50', ft50Rankings, title, debugLog, context);
		if (!key) {
			debugLog(`[FT50] Journal NOT found: "${title}"`);
			return null;
		}

		debugLog(`[FT50] ✓ Journal Found: "${key}"`);
		return ' '; // We use space to signal that there is no additional ranking;
	}
}

DatabaseRegistry.register({
	id: 'ft50',
	name: 'FT50 Journal Ranking',
	prefKey: 'enableFT50',
	priority: 102,
	matcher: function (title, debugLog, context) {
		return ft50Database.match(title, debugLog, context);
	}
})
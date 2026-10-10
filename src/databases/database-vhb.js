/**
 * VHB Database Plugin
 *
 * VHB Ranking database matching strategies.
 *
 * Data source: vhbRankings global object from data.js
 */

/* global Zotero, sjrRankings, MatchingUtils, DatabaseRegistry */

var vhbDatabase = {
	/**
	* Main Matching Function
    * @param {string} title - Publication title to match
	* @param {Function} debugLog - Debug logging function
	* @returns {string|null} Ranking string (e.g., "1" or "4*") or N/A if not found
 */
	match: function (title, debugLog, context) {
		debugLog(`[VHB] Retrieving ranking from database...`);

		var key = MatchingUtils.lookup('vhb', vhbRankings, title, debugLog, context);
		if (!key) {
			debugLog(`[VHB] Journal NOT found: "${title}"`);
			return null;
		}

		debugLog(`[VHB] ✓ Journal Found: "${key}"`);
		return vhbRankings[key].vhb;
	}
}

DatabaseRegistry.register({
	id: 'vhb',
	name: 'VHB Journal Ranking',
	prefKey: 'enableVHB',
	priority: 103,
	matcher: function (title, debugLog, context) {
		return vhbDatabase.match(title, debugLog, context);
    }
})
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
	match: function (title, debugLog) {
		debugLog(`[VHB] Retrieving ranking from database...`);

		var result = ''
		for (var rTitle in vhbRankings) {
			if (title.trim().toLowerCase() == rTitle.trim().toLowerCase()) {
				debugLog(`[VHB] ✓ Journal Found: "${rTitle}" -> $(vhbRankings[rTitle])`);
				result = vhbRankings[rTitle].vhb;
				break;
            }
        }

		if ((result == 'N/A') || (!result)) {
			debugLog('[VHB] Journal NOT found: "${title}"');
		}

		return result;
	}
}

DatabaseRegistry.register({
	id: 'vhb',
	name: 'VHB Journal Ranking',
	prefKey: 'enableVHB',
	priority: 103,
	matcher: function (title, debugLog) {
		return vhbDatabase.match(title, debugLog);
    }
})
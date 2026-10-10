/**
 * ABS Database Plugin
 *
 * CABS Journal Rankings (ABS) database matching strategies.
 *
 * Data source: absRankings global object from data.js
 */

/* global Zotero, sjrRankings, MatchingUtils, DatabaseRegistry */

var absDatabase = {
	/**
	* Main Matching Function
    * @param {string} title - Publication title to match
	* @param {Function} debugLog - Debug logging function
	* @returns {string|null} Ranking string (e.g., "1" or "4*") or N/A if not found
 */
	match: function (title, debugLog, context) {
		debugLog(`[ABS] Retrieving ranking from database...`);

		var key = MatchingUtils.lookup('abs', absRankings, title, debugLog, context);
		if (!key) {
			debugLog(`[ABS] Journal NOT found: "${title}"`);
			return null;
		}

		debugLog(`[ABS] ✓ Journal Found: "${key}"`);
		return absRankings[key].abs;
	}
}

DatabaseRegistry.register({
	id: 'abs',
	name: 'ABS Journal Ranking',
	prefKey: 'enableABS',
	priority: 101,
	matcher: function (title, debugLog, context) {
		return absDatabase.match(title, debugLog, context);
    }
})
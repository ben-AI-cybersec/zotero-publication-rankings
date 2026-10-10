/**
 * ABDC Database Plugin
 *
 * Australian Business Deans Council (ABDC) Journal Quality List.
 * The list includes ISSNs, so an item's ISSN is tried first, then the title.
 *
 * Data source: abdcRankings global object from data.js
 */

/* global Zotero, abdcRankings, MatchingUtils, DatabaseRegistry */

var abdcDatabase = {
	/**
	* Main Matching Function
	* @param {string} title - Publication title to match
	* @param {Function} debugLog - Debug logging function
	* @param {Object} [context] - { issn, issnTitle } from RankingEngine
	* @returns {string|null} Rating string ("A*", "A", "B" or "C") or null if not found
	*/
	match: function (title, debugLog, context) {
		debugLog(`[ABDC] Retrieving ranking from database...`);

		var key = MatchingUtils.keyFromIssn('abdc', abdcRankings, context && context.issn);
		if (key) {
			debugLog(`[ABDC] ✓ Journal found by ISSN: "${key}"`);
		} else {
			key = MatchingUtils.lookup('abdc', abdcRankings, title, debugLog, context);
		}
		if (!key) {
			debugLog(`[ABDC] Journal NOT found: "${title}"`);
			return null;
		}

		debugLog(`[ABDC] ✓ Journal Found: "${key}"`);
		return abdcRankings[key].abdc;
	}
};

DatabaseRegistry.register({
	id: 'abdc',
	name: 'ABDC Journal Quality List',
	prefKey: 'enableABDC',
	priority: 104,
	matcher: function (title, debugLog, context) {
		return abdcDatabase.match(title, debugLog, context);
	}
});

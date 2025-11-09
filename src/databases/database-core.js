/**
 * CORE Database Plugin
 * 
 * CORE Conference Rankings database matching.
 * Delegates to MatchingUtils for conference-specific matching strategies.
 * 
 * Data source: coreRankings global object from data.js
 * Preference: enableCORE (can be disabled by user)
 */

/* global Zotero, MatchingUtils, DatabaseRegistry */

var COREDatabase = {
	/**
	 * Main matching function - delegates to MatchingUtils
	 * 
	 * @param {string} title - Conference title to match
	 * @param {Function} debugLog - Debug logging function
	 * @returns {string|null} Ranking string (e.g., "A*", "A", "B", "C") or null if not found
	 */
	match: function(title, debugLog) {
		debugLog(`[CORE] Trying CORE database...`);
		
		// Delegate to MatchingUtils which has specialized conference matching logic
		var result = MatchingUtils.matchCoreConference(title, true);
		
		if (result) {
			debugLog(`[CORE] ✓ MATCH: ${result}`);
		} else {
			debugLog(`[CORE] No match found`);
		}
		
		return result;
	}
};

// Register CORE database with the registry
// Optional (prefKey = 'enableCORE'), lower priority than SJR (100)
DatabaseRegistry.register({
	id: 'core',
	name: 'CORE Conference Rankings',
	prefKey: 'enableCORE',  // Can be disabled in preferences
	priority: 100,          // Checked after SJR
	matcher: function(title, debugLog) {
		return COREDatabase.match(title, debugLog);
	}
});

/**
 * SJR Database Plugin
 * 
 * SCImago Journal Rankings (SJR) database matching strategies.
 * Uses multiple strategies to match journal titles:
 * 1. Exact normalized match
 * 2. Fuzzy match (handles ", ACRONYM" format)
 * 3. Word overlap match (for conference proceedings)
 * 
 * Data source: sjrRankings global object from data.js
 */

/* global Zotero, sjrRankings, MatchingUtils, DatabaseRegistry */

var SJRDatabase = {
	/**
	 * Main matching function - tries all strategies in order
	 * 
	 * @param {string} title - Publication title to match
	 * @param {Function} debugLog - Debug logging function
	 * @returns {string|null} Ranking string (e.g., "Q1 0.85") or null if not found
	 */
	match: function(title, debugLog) {
		debugLog(`[SJR] Trying SJR database...`);
		
		return this.matchExact(title, debugLog) ||
		       this.matchFuzzy(title, debugLog) ||
		       this.matchWordOverlap(title, debugLog);
	},

	/**
	 * Try exact case-insensitive match against SJR database
	 * 
	 * @param {string} title - Normalized publication title
	 * @param {Function} debugLog - Debug logging function
	 * @returns {string|null} Ranking string or null if not found
	 */
	matchExact: function(title, debugLog) {
		var normalizedSearch = title.toLowerCase();
		debugLog(`[SJR] Trying exact match (lowercase): "${normalizedSearch}"`);
		
		for (var sjrTitle in sjrRankings) {
			if (sjrTitle.toLowerCase() === normalizedSearch) {
				var sjrData = sjrRankings[sjrTitle];
				const result = sjrData.quartile + " " + sjrData.sjr;
				debugLog(`[SJR] ✓ EXACT MATCH: "${sjrTitle}" -> ${result}`);
				return result;
			}
		}
		
		debugLog(`[SJR] No exact match found`);
		return null;
	},

	/**
	 * Try fuzzy match for SJR (handles titles with ", ACRONYM" format)
	 * 
	 * @param {string} title - Normalized publication title
	 * @param {Function} debugLog - Debug logging function
	 * @returns {string|null} Ranking string or null if not found
	 */
	matchFuzzy: function(title, debugLog) {
		var cleanedSearch = MatchingUtils.normalizeString(MatchingUtils.cleanConferenceTitle(title));
		debugLog(`[SJR] Trying fuzzy match: "${cleanedSearch}"`);
		
		for (var sjrTitle in sjrRankings) {
			// Remove ", ACRONYM" part from SJR title
			var cleanedSjr = MatchingUtils.normalizeString(sjrTitle.split(',')[0].trim());
			
			if (cleanedSjr === cleanedSearch && cleanedSjr.length > 10) {
				var sjrData = sjrRankings[sjrTitle];
				const result = sjrData.quartile + " " + sjrData.sjr;
				debugLog(`[SJR] ✓ FUZZY MATCH: "${sjrTitle}" -> ${result}`);
				return result;
			}
		}
		
		debugLog(`[SJR] No fuzzy match found`);
		return null;
	},

	/**
	 * Try word overlap matching for SJR conference proceedings
	 * Uses strict thresholds to avoid false positives:
	 * - 85% overlap from SJR side
	 * - 80% overlap from search side
	 * - Requires 5+ words
	 * 
	 * @param {string} title - Normalized publication title
	 * @param {Function} debugLog - Debug logging function
	 * @returns {string|null} Ranking string or null if not found
	 */
	matchWordOverlap: function(title, debugLog) {
		var cleanedSearch = MatchingUtils.normalizeString(MatchingUtils.cleanConferenceTitle(title));
		var searchWords = cleanedSearch.split(' ').filter(function(w) { return w.length > 3; });
		
		debugLog(`[SJR] Trying word overlap: cleaned="${cleanedSearch}", words=[${searchWords.join(', ')}]`);
		
		for (var sjrTitle in sjrRankings) {
			var cleanedSjr = MatchingUtils.normalizeString(sjrTitle);
			var sjrWords = cleanedSjr.split(' ').filter(function(w) { return w.length > 3; });
			
			// Count how many significant words overlap
			var matchCount = 0;
			for (var k = 0; k < sjrWords.length; k++) {
				if (searchWords.indexOf(sjrWords[k]) !== -1) {
					matchCount++;
				}
			}
			
			// Use stricter criteria to avoid false positives:
			// 1. Require 85% overlap from SJR side
			// 2. Require 80% overlap from search side (allows "Proceedings of...")
			// 3. Require longer titles (5+ words instead of 4+)
			var sjrOverlap = matchCount / sjrWords.length;
			var searchOverlap = matchCount / searchWords.length;
			
			if (sjrWords.length >= 5 && 
			    sjrOverlap >= 0.85 && 
			    searchOverlap >= 0.80) {
				var sjrData = sjrRankings[sjrTitle];
				const result = sjrData.quartile + " " + sjrData.sjr;
				debugLog(`[SJR] ✓ WORD OVERLAP MATCH: "${sjrTitle}"`);
				debugLog(`[SJR]   Matched ${matchCount}/${sjrWords.length} SJR words (${(sjrOverlap*100).toFixed(0)}%), ${matchCount}/${searchWords.length} search words (${(searchOverlap*100).toFixed(0)}%)`);
				debugLog(`[SJR]   Result: ${result}`);
				return result;
			}
		}
		
		debugLog(`[SJR] No word overlap match found (checked ${Object.keys(sjrRankings).length} entries)`);
		return null;
	}
};

// Register SJR database with the registry
// Always enabled (prefKey = null), highest priority (0)
DatabaseRegistry.register({
	id: 'sjr',
	name: 'SCImago Journal Rankings',
	prefKey: null,  // Always enabled
	priority: 0,    // Checked first
	matcher: function(title, debugLog) {
		return SJRDatabase.match(title, debugLog);
	}
});

/**
 * SJR Database Plugin
 *
 * SCImago Journal Rankings (SJR) database matching strategies.
 * Uses multiple strategies to match journal titles:
 * 1. ISSN, alias, exact and relaxed title match (MatchingUtils.lookup)
 * 2. Word overlap match (for conference proceedings)
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
	 * @param {Object} [context] - { issnTitle } from RankingEngine
	 * @returns {string|null} Ranking string (e.g., "Q1 0.85") or null if not found
	 */
	match: function(title, debugLog, context) {
		debugLog(`[SJR] Trying SJR database...`);

		var sjrTitle = MatchingUtils.lookup('sjr', sjrRankings, title, debugLog, context) ||
		               this.matchWordOverlap(title, debugLog);
		if (!sjrTitle) {
			return null;
		}

		var sjrData = sjrRankings[sjrTitle];
		const result = sjrData.quartile + " " + sjrData.sjr;
		debugLog(`[SJR] ✓ MATCH: "${sjrTitle}" -> ${result}`);
		return result;
	},

	/**
	 * Try word overlap matching for SJR conference proceedings
	 * Uses strict thresholds to avoid false positives, and keeps the best match:
	 * - 85% overlap from SJR side
	 * - 80% overlap from search side
	 * - Requires 4+ words
	 *
	 * @param {string} title - Publication title
	 * @param {Function} debugLog - Debug logging function
	 * @returns {string|null} sjrRankings key or null if not found
	 */
	matchWordOverlap: function(title, debugLog) {
		var cleanedSearch = MatchingUtils.normalizeString(MatchingUtils.cleanConferenceTitle(title));
		var searchWords = MatchingUtils.significantWords(cleanedSearch);
		var searchSet = new Set(searchWords);

		debugLog(`[SJR] Trying word overlap: cleaned="${cleanedSearch}", words=[${searchWords.join(', ')}]`);
		if (searchWords.length < 4) {
			debugLog(`[SJR] Too few significant words for word overlap`);
			return null;
		}

		var entries = MatchingUtils.getIndex('sjr', sjrRankings).entries;
		var best = null;
		var bestScore = 0;
		for (var e of entries) {
			var sjrWords = e.words || (e.words = MatchingUtils.significantWords(e.norm));
			if (sjrWords.length < 4) continue;

			var matchCount = MatchingUtils._overlap(sjrWords, searchSet);
			var sjrOverlap = matchCount / sjrWords.length;
			var searchOverlap = matchCount / searchWords.length;

			// 85% of the SJR words, 80% of the search words (allows "Proceedings of...")
			if (sjrOverlap >= 0.85 && searchOverlap >= 0.80) {
				var score = sjrOverlap + searchOverlap;
				if (score > bestScore) {
					best = e;
					bestScore = score;
				}
			}
		}

		if (best) {
			debugLog(`[SJR] ✓ WORD OVERLAP MATCH: "${best.key}" (score ${bestScore.toFixed(2)} of 2)`);
			return best.key;
		}
		debugLog(`[SJR] No word overlap match found (checked ${entries.length} entries)`);
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
	matcher: function(title, debugLog, context) {
		return SJRDatabase.match(title, debugLog, context);
	}
});

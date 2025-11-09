/*
 * SJR & CORE Rankings - Matching Module
 * String normalization and ranking matching algorithms
 * 
 * Copyright (C) 2025 Ben Stephens
 * Licensed under GNU General Public License v3.0 (GPLv3)
 */

/* global coreRankings, sjrRankings */

var MatchingUtils = {
	/**
	 * Normalize a string for comparison
	 * Applies multiple transformations to create a canonical form for matching:
	 * - Convert to lowercase
	 * - Replace & with 'and'
	 * - Normalize telecommunications/communications variants
	 * - Remove special characters
	 * - Collapse whitespace
	 * 
	 * @param {string} str - The string to normalize
	 * @returns {string} Normalized string
	 */
	normalizeString: function(str) {
		return str.toLowerCase()
			.replace(/&/g, 'and')
			.replace(/\btelecomm?unications?\b/g, 'communications')
			.replace(/[^\w\s]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	},

	/**
	 * Extract acronym from title (text in parentheses)
	 * 
	 * @param {string} title - The title to extract acronym from
	 * @returns {string|null} Extracted acronym or null if none found
	 * 
	 * @example
	 * extractAcronym("Conference on Security (CCS)") // Returns: "CCS"
	 * extractAcronym("International Conference") // Returns: null
	 */
	extractAcronym: function(title) {
		var match = title.match(/\(([A-Z][A-Z0-9&]+)\)/);
		return match ? match[1] : null;
	},

	/**
	 * Clean conference title by removing noise
	 * Removes common prefixes, years, ordinals, and other patterns that
	 * interfere with matching
	 * 
	 * @param {string} title - The conference title to clean
	 * @returns {string} Cleaned title
	 */
	cleanConferenceTitle: function(title) {
		var cleaned = title
			.replace(/^Proceedings of the\s+/gi, '')
			.replace(/^[A-Z]+\s+\d{4}\s+-\s+/gi, '')
			.replace(/\b\d{4}\b/g, '')
			.replace(/\b\d{1,2}(st|nd|rd|th)\s+(Annual\s+)?/gi, '')
			.replace(/\bAnnual\s+/gi, '')
			.replace(/\s+-\s+[A-Z]+\s+'?\d{2,4}\s*$/gi, '')
			.replace(/\s+/g, ' ')
			.trim();
		return cleaned;
	},

	/**
	 * Match a conference title against CORE rankings database
	 * Uses 5 matching strategies in priority order:
	 * 1. Exact normalized match
	 * 2. Substring match (CORE title appears in Zotero title)
	 * 3. Reverse substring (Zotero title appears in CORE title)
	 * 4. Word overlap (80%+ overlap required)
	 * 5. Acronym match (4+ chars, unique matches only)
	 * 
	 * @param {string} zoteroTitle - The conference title from Zotero item
	 * @param {boolean} [enableDebug=false] - Enable detailed debug logging
	 * @returns {string|null} CORE ranking or null if no match found
	 */
	matchCoreConference: function(zoteroTitle, enableDebug = false) {
		var debugLog = enableDebug ? function(msg) { Zotero.debug("[MATCH DEBUG] " + msg); } : function() {};
		
		var cleanedZotero = this.cleanConferenceTitle(zoteroTitle);
		var normalizedZotero = this.normalizeString(cleanedZotero);
		var zoteroAcronym = this.extractAcronym(zoteroTitle);
		
		debugLog(`Matching: "${zoteroTitle}"`);
		debugLog(`  Cleaned: "${cleanedZotero}"`);
		debugLog(`  Normalized: "${normalizedZotero}"`);
		debugLog(`  Acronym: ${zoteroAcronym || "(none)"}`);
		
		// Strategy 1: Exact match (normalized)
		debugLog(`  CORE Strategy 1: Trying exact normalized match`);
		for (var title in coreRankings) {
			var normalizedCore = this.normalizeString(title);
			if (normalizedCore === normalizedZotero) {
				debugLog(`  ✓ CORE exact match: "${title}" (${coreRankings[title].rank})`);
				return coreRankings[title].rank;
			}
		}
		debugLog(`  No CORE exact match`);
		
		// Strategy 2: Check if Zotero title contains CORE title (substring match)
		debugLog(`  CORE Strategy 2: Trying substring (CORE in Zotero)`);
		for (var title in coreRankings) {
			var normalizedCore = this.normalizeString(title);
			// Only match if CORE title is substantial (>20 chars) to avoid false positives
			if (normalizedZotero.indexOf(normalizedCore) !== -1 && normalizedCore.length > 20) {
				debugLog(`  ✓ CORE substring match: "${title}" (${coreRankings[title].rank})`);
				return coreRankings[title].rank;
			}
		}
		debugLog(`  No CORE substring match`);
		
		// Strategy 3: Check if CORE title contains Zotero title (reverse substring)
		debugLog(`  CORE Strategy 3: Trying reverse substring (Zotero in CORE)`);
		for (var title in coreRankings) {
			var normalizedCore = this.normalizeString(title);
			if (normalizedCore.indexOf(normalizedZotero) !== -1 && normalizedZotero.length > 20) {
				debugLog(`  ✓ CORE reverse substring match: "${title}" (${coreRankings[title].rank})`);
				return coreRankings[title].rank;
			}
		}
		debugLog(`  No CORE reverse substring match`);
		
		// Strategy 4: Word overlap matching (for titles with extra words like "SIGSAC")
		debugLog(`  CORE Strategy 4: Trying word overlap`);
		var zoteroWords = normalizedZotero.split(' ').filter(function(w) { return w.length > 3; });
		for (var title in coreRankings) {
			var normalizedCore = this.normalizeString(title);
			var coreWords = normalizedCore.split(' ').filter(function(w) { return w.length > 3; });
			
			// Count how many significant words overlap
			var matchCount = 0;
			for (var i = 0; i < coreWords.length; i++) {
				if (zoteroWords.indexOf(coreWords[i]) !== -1) {
					matchCount++;
				}
			}
			
			// If most core words are present (80%+), it's likely a match
			if (coreWords.length >= 4 && matchCount / coreWords.length >= 0.8) {
				debugLog(`  ✓ CORE word overlap match: "${title}" (${coreRankings[title].rank})`);
				debugLog(`    Matched ${matchCount}/${coreWords.length} words (${(matchCount/coreWords.length*100).toFixed(0)}%)`);
				return coreRankings[title].rank;
			}
		}
		debugLog(`  No CORE word overlap match`);
		
		// Strategy 5: Acronym matching LAST (as tiebreaker only, since acronyms are ambiguous)
		// Only use if acronym is reasonably unique (4+ characters) or if there's additional evidence
		if (zoteroAcronym && zoteroAcronym.length >= 4) {
			debugLog(`  CORE Strategy 5: Trying acronym match "${zoteroAcronym}" (>= 4 chars, used as tiebreaker)`);
			
			var acronymMatches = [];
			for (var title in coreRankings) {
				if (coreRankings[title].acronym === zoteroAcronym) {
					acronymMatches.push({
						title: title,
						rank: coreRankings[title].rank,
						normalized: this.normalizeString(title)
					});
				}
			}
			
			if (acronymMatches.length === 1) {
				// Single match - relatively safe to use
				debugLog(`  ✓ CORE acronym match (unique): "${acronymMatches[0].title}" (${acronymMatches[0].rank})`);
				return acronymMatches[0].rank;
			} else if (acronymMatches.length > 1) {
				debugLog(`  ✗ CORE acronym ambiguous: ${acronymMatches.length} conferences share acronym "${zoteroAcronym}":`);
				for (var match of acronymMatches) {
					debugLog(`    - "${match.title}" (${match.rank})`);
				}
				// Could add tie-breaking logic here (e.g., word overlap with acronym matches)
			} else {
				debugLog(`  No CORE acronym match for "${zoteroAcronym}"`);
			}
		} else if (zoteroAcronym) {
			debugLog(`  CORE Strategy 5: Skipping acronym match "${zoteroAcronym}" (< 4 chars, too ambiguous)`);
		}
		
		return null;
	},

	/**
	 * Match a journal title against SJR rankings database
	 * Uses multiple strategies with debug logging
	 */
	matchSjrJournal: function(publicationTitle, enableDebug = false) {
		var debugLog = enableDebug ? function(msg) { Zotero.debug("[MATCH DEBUG] " + msg); } : function() {};
		
		debugLog(`SJR matching: "${publicationTitle}"`);
		
		// Strategy 1: Exact match (normalized)
		debugLog(`  SJR Strategy 1: Trying exact normalized match`);
		var normalized = this.normalizeString(publicationTitle.toLowerCase());
		for (var title in sjrRankings) {
			var normalizedSJR = this.normalizeString(title);
			if (normalizedSJR === normalized) {
				debugLog(`  ✓ SJR exact match: "${title}" (Q${sjrRankings[title].quartile})`);
				return sjrRankings[title];
			}
		}
		debugLog(`  No SJR exact match`);
		
		// Strategy 2: Cleaned title match (without publisher info after comma)
		debugLog(`  SJR Strategy 2: Trying cleaned title match`);
		var cleaned = this.normalizeString(this.cleanConferenceTitle(publicationTitle));
		for (var title in sjrRankings) {
			var cleanedSJR = this.normalizeString(title.split(',')[0].trim());
			if (cleanedSJR === cleaned && cleaned.length > 10) {
				debugLog(`  ✓ SJR cleaned match: "${title}" (Q${sjrRankings[title].quartile})`);
				return sjrRankings[title];
			}
		}
		debugLog(`  No SJR cleaned match`);
		
		// Strategy 3: Word overlap for journals with extra words
		debugLog(`  SJR Strategy 3: Trying word overlap`);
		var words = cleaned.split(' ').filter(function(w) { return w.length > 3; });
		
		for (var title in sjrRankings) {
			var cleanedSJR = this.normalizeString(title.split(',')[0].trim());
			var sjrWords = cleanedSJR.split(' ').filter(function(w) { return w.length > 3; });
			
			// Count matching words
			var matchCount = 0;
			for (var i = 0; i < sjrWords.length; i++) {
				if (words.indexOf(sjrWords[i]) !== -1) {
					matchCount++;
				}
			}
			
			// Calculate overlap percentages
			var sjrOverlap = sjrWords.length > 0 ? matchCount / sjrWords.length : 0;
			var searchOverlap = words.length > 0 ? matchCount / words.length : 0;
			
			// Use stricter criteria to avoid false positives
			// Require: 5+ significant words AND 85%+ overlap in both directions
			if (sjrWords.length >= 5 && sjrOverlap >= 0.85 && searchOverlap >= 0.85) {
				debugLog(`  ✓ SJR word overlap match: "${title}" (Q${sjrRankings[title].quartile})`);
				debugLog(`    Matched ${matchCount}/${sjrWords.length} SJR words (${(sjrOverlap*100).toFixed(0)}%)`);
				debugLog(`    Matched ${matchCount}/${words.length} search words (${(searchOverlap*100).toFixed(0)}%)`);
				return sjrRankings[title];
			}
		}
		debugLog(`  No SJR word overlap match`);
		
		return null;
	}
};

/*
 * Publication Rankings - Matching Module
 * String normalization and ranking matching algorithms
 *
 * Copyright (C) 2025 Ben Stephens
 * Licensed under GNU General Public License v3.0 (GPLv3)
 */

/* global Zotero, coreRankings, sjrRankings, titleAliases */

var MatchingUtils = {
	/**
	 * Lookup indexes per ranking list, built once on first use
	 * @type {Map<string, Object>}
	 */
	_indexes: new Map(),

	/** Normalized alias variant -> ranking-list title (built from titleAliases) */
	_aliasMap: null,

	/** Per list: ISSN (no hyphen) -> list key (built from the entries' issn fields) */
	_issnMaps: new Map(),

	/**
	 * Normalize a string for comparison
	 * Applies multiple transformations to create a canonical form for matching:
	 * - Strip accents (é -> e) and the stray BOM some CSV exports leave behind
	 * - Convert to lowercase
	 * - Replace & with 'and'
	 * - Normalize telecommunications/communications variants
	 * - Remove special characters (keeps letters and digits in any script)
	 * - Collapse whitespace
	 * - Drop a leading "the" ("The Journal of the Acoustical Society of America", #8)
	 *
	 * @param {string} str - The string to normalize
	 * @returns {string} Normalized string
	 */
	normalizeString: function(str) {
		return str.normalize('NFKD')
			.replace(/[̀-ͯ]/g, '')
			.toLowerCase()
			.replace(/&/g, ' and ')
			.replace(/\btelecomm?unications?\b/g, 'communications')
			.replace(/[^\p{L}\p{N}\s]/gu, ' ')
			.replace(/\s+/g, ' ')
			.trim()
			.replace(/^the /, '');
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
			.replace(/^Proceedings(\s+of(\s+the)?|\s*[-–:])\s+/gi, '')
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
	 * Shorter forms of a title, used for relaxed matching:
	 * - trailing parenthetical removed: "Sensors (Basel, Switzerland)" -> "Sensors"
	 * - subtitle removed: "MIS Quarterly: Management Information Systems" -> "MIS Quarterly"
	 * - trailing ", ACRONYM" removed: "..., MobiCom" -> "..."
	 * - everything after the first comma, for titles of 3+ words before it
	 * - conference noise removed (years, ordinals, "Proceedings of the")
	 *
	 * @param {string} title - Raw title
	 * @returns {Array<string>} Normalized forms, excluding the full normalized title
	 */
	relaxedForms: function(title) {
		var forms = [];
		var add = (s) => {
			var n = this.normalizeString(s);
			if (n.length >= 4 && forms.indexOf(n) === -1) {
				forms.push(n);
			}
		};

		var base = title.trim();
		var noParen = base.replace(/\s*\([^()]*\)\s*$/, '');
		add(noParen);
		add(noParen.split(/\s*:\s*|\s+[-–—]\s+/)[0]);
		var acronymTail = noParen.match(/^(.+),\s*[^\s,]+$/);
		if (acronymTail) {
			add(acronymTail[1]);
		}
		// "Conference on X, Digest of Technical Papers, ICCAD" -> "Conference on X"
		var head = noParen.split(',')[0];
		if (head.trim().split(/\s+/).length >= 3) {
			add(head);
		}
		add(this.cleanConferenceTitle(base));

		var full = this.normalizeString(base);
		return forms.filter(f => f !== full);
	},

	/**
	 * Get (building on first use) the lookup index for a ranking list
	 * - exact: normalized title -> list key
	 * - relaxed: shortened form -> list key, or null when several keys share it
	 * - entries: [{key, norm}] for the fuzzy strategies
	 *
	 * @param {string} name - Cache name (e.g. 'sjr')
	 * @param {Object|Array} source - Ranking object (titles as keys) or array of titles
	 * @returns {Object} Index
	 */
	getIndex: function(name, source) {
		var idx = this._indexes.get(name);
		if (idx) {
			return idx;
		}

		var keys = Array.isArray(source) ? source : Object.keys(source);
		var exact = new Map();
		var relaxed = new Map();
		var entries = [];

		for (var key of keys) {
			var norm = this.normalizeString(key);
			entries.push({ key: key, norm: norm });
			if (!exact.has(norm)) {
				exact.set(norm, key);
			}
		}
		for (var key of keys) {
			for (var form of this.relaxedForms(key)) {
				if (exact.has(form)) {
					continue; // the short form is a different publication in its own right
				}
				if (!relaxed.has(form)) {
					relaxed.set(form, key);
				} else if (relaxed.get(form) !== key) {
					relaxed.set(form, null); // ambiguous: never match on it
				}
			}
		}

		idx = { exact: exact, relaxed: relaxed, entries: entries };
		this._indexes.set(name, idx);
		return idx;
	},

	/**
	 * Look up a title in the user-maintained alias list (data/title-aliases.js)
	 *
	 * @param {string} title - Raw title
	 * @returns {string|null} Ranking-list title, or null
	 */
	resolveAlias: function(title) {
		if (typeof titleAliases === 'undefined') {
			return null;
		}
		if (!this._aliasMap) {
			this._aliasMap = new Map();
			for (var variant in titleAliases) {
				this._aliasMap.set(this.normalizeString(variant), titleAliases[variant]);
			}
		}
		return this._aliasMap.get(this.normalizeString(title)) || null;
	},

	/**
	 * Find the entry of a ranking list whose "issn" field ("12345678,87654321")
	 * contains one of the ISSNs in an item's ISSN field
	 * Accepts "1234-5678", "12345678", or several ISSNs in one field
	 *
	 * @param {string} name - Map cache name (e.g. 'sjr')
	 * @param {Object} source - Ranking object whose entries have an issn field
	 * @param {string} issnField - Value of the item's ISSN field
	 * @returns {string|null} Key in the ranking list, or null
	 */
	keyFromIssn: function(name, source, issnField) {
		if (!issnField || !source) {
			return null;
		}
		var map = this._issnMaps.get(name);
		if (!map) {
			map = new Map();
			for (var key in source) {
				var issns = source[key].issn;
				if (!issns) continue;
				for (var issn of issns.split(',')) {
					if (!map.has(issn)) {
						map.set(issn, key);
					}
				}
			}
			this._issnMaps.set(name, map);
		}

		var found = issnField.toUpperCase().match(/\b\d{4}-?\d{3}[\dX]\b/g) || [];
		for (var issn of found) {
			var key = map.get(issn.replace('-', ''));
			if (key) {
				return key;
			}
		}
		return null;
	},

	/**
	 * Resolve an ISSN field to an SJR journal title
	 *
	 * @param {string} issnField - Value of the item's ISSN field
	 * @returns {string|null} sjrRankings key, or null
	 *
	 * @example
	 * titleFromIssn("2169-3536") // Returns: "ieee access"
	 */
	titleFromIssn: function(issnField) {
		return typeof sjrRankings === 'undefined' ? null : this.keyFromIssn('sjr', sjrRankings, issnField);
	},

	/**
	 * True when two normalized titles are both SJR journals in their own right,
	 * e.g. "computers and education" vs "computers and education: artificial
	 * intelligence". Relaxed matching must never jump between such a pair.
	 */
	_areDistinctJournals: function(normA, keyB) {
		var normB = this.normalizeString(keyB);
		return normA !== normB && this.isSjrTitle(normA) && this.isSjrTitle(normB);
	},

	/**
	 * @param {string} norm - Normalized title
	 * @returns {boolean} True if it is exactly the title of an SJR-listed source
	 */
	isSjrTitle: function(norm) {
		return typeof sjrRankings !== 'undefined' && this.getIndex('sjr', sjrRankings).exact.has(norm);
	},

	/**
	 * Find the entry in a ranking list that matches a publication
	 *
	 * Candidates, in order: the SJR title found from the item's ISSN, the alias
	 * target (data/title-aliases.js), then the title itself.
	 * 1. Exact match of the normalized candidate
	 * 2. Relaxed match: subtitle / trailing "(...)" / ", ACRONYM" removed on either
	 *    side. Only unique matches count, and never between two different SJR journals
	 *    (unless the candidate came from the ISSN or an alias)
	 *
	 * @param {string} name - Index name (e.g. 'abs')
	 * @param {Object|Array} source - Ranking object or array of titles
	 * @param {string} title - Publication title from Zotero
	 * @param {Function} debugLog - Debug logging function
	 * @param {Object} [context] - { issnTitle } from RankingEngine
	 * @param {boolean} [strict=false] - Exact matches only (no relaxed step)
	 * @returns {string|null} Key in the ranking list, or null
	 *
	 * @example
	 * MatchingUtils.lookup('abs', absRankings, 'MIS Quarterly', debugLog)
	 * // Returns: "mis quarterly: management information systems"
	 */
	lookup: function(name, source, title, debugLog, context, strict) {
		debugLog = debugLog || function() {};
		var idx = this.getIndex(name, source);

		var candidates = [];
		if (context && context.issnTitle) {
			candidates.push({ title: context.issnTitle, trusted: true, why: 'ISSN' });
		}
		var alias = this.resolveAlias(title);
		if (alias) {
			candidates.push({ title: alias, trusted: true, why: 'alias' });
		}
		candidates.push({ title: title, trusted: false, why: 'title' });

		for (var c of candidates) {
			var key = idx.exact.get(this.normalizeString(c.title));
			if (key !== undefined) {
				debugLog(`  [${name}] ✓ exact match via ${c.why}: "${key}"`);
				return key;
			}
		}

		if (strict) {
			debugLog(`  [${name}] no exact match (strict)`);
			return null;
		}

		for (var c of candidates) {
			var norm = this.normalizeString(c.title);
			var forms = [norm].concat(this.relaxedForms(c.title));
			for (var form of forms) {
				// Shortened Zotero title equals a list title, or both shorten to the same thing
				var key = form !== norm ? idx.exact.get(form) : undefined;
				if (key === undefined) {
					key = idx.relaxed.get(form);
				}
				if (key === null) {
					debugLog(`  [${name}] relaxed form "${form}" is ambiguous, skipped`);
					continue;
				}
				if (key === undefined) {
					continue;
				}
				if (!c.trusted && this._areDistinctJournals(norm, key)) {
					debugLog(`  [${name}] "${c.title}" and "${key}" are different journals, skipped`);
					continue;
				}
				debugLog(`  [${name}] ✓ relaxed match via ${c.why} ("${form}"): "${key}"`);
				return key;
			}
		}

		debugLog(`  [${name}] no exact or relaxed match`);
		return null;
	},

	/**
	 * Count significant words (> 3 letters) of `words` that appear in `inSet`
	 */
	_overlap: function(words, inSet) {
		var count = 0;
		for (var w of words) {
			if (inSet.has(w)) count++;
		}
		return count;
	},

	/**
	 * Significant words of a normalized title
	 */
	significantWords: function(norm) {
		return norm.split(' ').filter(function(w) { return w.length > 3; });
	},

	/**
	 * Words common to most conference names, which say nothing about which
	 * conference it is (so "International Conference on Artificial Intelligence"
	 * can't swallow every other "International Conference on ... Intelligence")
	 */
	conferenceStopWords: new Set(['international', 'conference', 'conferences', 'symposium',
		'proceedings', 'annual', 'ieee', 'acm', 'joint', 'workshop', 'workshops', 'meeting', 'congress']),

	/**
	 * Distinctive words of a normalized conference title
	 */
	conferenceWords: function(norm) {
		return this.significantWords(norm).filter(w => !this.conferenceStopWords.has(w));
	},

	/**
	 * A workshop is ranked separately from (or not at all, unlike) its parent conference,
	 * so "... Workshops (EuroS&PW)" must not take the rank of "... Symposium (EuroS&P)".
	 * The reverse is fine: CORE still lists e.g. CHES as "Workshop on Cryptographic ..."
	 */
	_workshopMismatch: function(zoteroNorm, coreNorm) {
		var re = /\bworkshops?\b/;
		return re.test(zoteroNorm) && !re.test(coreNorm);
	},

	/**
	 * Regional qualifiers distinguish otherwise identically named conferences
	 * ("European Intelligence and Security Informatics Conference" vs
	 * "IEEE International Conference on Intelligence and Security Informatics")
	 */
	_regionWords: /\b(europe|european|asia|asian|pacific|africa|african|america|american|latin|nordic|australasian|australian|mediterranean|iberian|baltic|arab|chinese|china|india|indian|japan|japanese|korea|korean)\b/g,

	_regionMismatch: function(zoteroNorm, coreNorm) {
		var a = (zoteroNorm.match(this._regionWords) || []).sort().join(' ');
		var b = (coreNorm.match(this._regionWords) || []).sort().join(' ');
		return a !== b;
	},

	/**
	 * Rules that veto an otherwise plausible fuzzy CORE match
	 */
	_coreVeto: function(zoteroNorm, coreNorm) {
		return this._workshopMismatch(zoteroNorm, coreNorm) || this._regionMismatch(zoteroNorm, coreNorm);
	},

	/**
	 * Match a conference title against CORE rankings database
	 * Uses 5 matching strategies in priority order:
	 * 1. Exact normalized match
	 * 2. Substring match (longest CORE title appearing, as whole words, in the Zotero title)
	 * 3. Reverse substring (shortest CORE title containing the Zotero title)
	 * 4. Word overlap (distinctive words, both directions, best match)
	 * 5. Acronym match (4+ chars; if shared, word overlap breaks the tie)
	 *
	 * @param {string} zoteroTitle - The conference title from Zotero item
	 * @param {Function} [debugLog] - Debug logging function
	 * @returns {string|null} CORE ranking or null if no match found
	 */
	matchCoreConference: function(zoteroTitle, debugLog) {
		debugLog = debugLog || function() {};
		var idx = this.getIndex('core', coreRankings);

		var cleanedZotero = this.cleanConferenceTitle(zoteroTitle);
		var normalizedZotero = this.normalizeString(cleanedZotero);
		var zoteroAcronym = this.extractAcronym(zoteroTitle);

		debugLog(`Matching: "${zoteroTitle}"`);
		debugLog(`  Cleaned: "${cleanedZotero}"`);
		debugLog(`  Normalized: "${normalizedZotero}"`);
		debugLog(`  Acronym: ${zoteroAcronym || "(none)"}`);

		// CORE titles cleaned the same way as the Zotero title, minus notes like "(was ICOIN)"
		if (!idx.cleaned) {
			idx.cleaned = new Map();
			for (var e of idx.entries) {
				var c = this.normalizeString(this.cleanConferenceTitle(e.key.replace(/\s*\([^()]*\)/g, ' ')));
				if (!idx.cleaned.has(c)) {
					idx.cleaned.set(c, e.key);
				}
			}
		}
		var cleanedNoParen = this.normalizeString(cleanedZotero.replace(/\s*\([^()]*\)/g, ' '));

		// Strategy 1: Exact match (normalized)
		debugLog(`  CORE Strategy 1: Trying exact normalized match`);
		var alias = this.resolveAlias(zoteroTitle);
		var exactKey = (alias && idx.exact.get(this.normalizeString(alias))) ||
		               idx.exact.get(normalizedZotero) || idx.exact.get(this.normalizeString(zoteroTitle)) ||
		               idx.cleaned.get(normalizedZotero) || idx.cleaned.get(cleanedNoParen);
		if (exactKey) {
			debugLog(`  ✓ CORE exact match: "${exactKey}" (${coreRankings[exactKey]})`);
			return coreRankings[exactKey];
		}
		debugLog(`  No CORE exact match`);

		// A journal title (exactly an SJR journal, with no conference words) must not be
		// fuzzy-matched to a conference, e.g. "Computers and Education: Artificial Intelligence"
		// to "International Conference on Artificial Intelligence in Education"
		var fullNorm = this.normalizeString(zoteroTitle);
		if (!/\b(conference|proceedings|symposium|workshops?|congress|meeting|colloquium)\b/.test(fullNorm) &&
		    this.isSjrTitle(fullNorm)) {
			debugLog(`  Known journal title, skipping fuzzy CORE strategies`);
			return null;
		}

		// Strategy 2: Zotero title contains a CORE title (whole words; longest wins)
		// Only match if CORE title is substantial (>20 chars) to avoid false positives
		debugLog(`  CORE Strategy 2: Trying substring (CORE in Zotero)`);
		var paddedZotero = ' ' + normalizedZotero + ' ';
		var best = null;
		for (var e of idx.entries) {
			if (e.norm.length > 20 && paddedZotero.indexOf(' ' + e.norm + ' ') !== -1 &&
			    !this._coreVeto(normalizedZotero, e.norm) &&
			    (!best || e.norm.length > best.norm.length)) {
				best = e;
			}
		}
		if (best) {
			debugLog(`  ✓ CORE substring match: "${best.key}" (${coreRankings[best.key]})`);
			return coreRankings[best.key];
		}
		debugLog(`  No CORE substring match`);

		// Strategy 3: CORE title contains Zotero title (whole words; closest length wins)
		debugLog(`  CORE Strategy 3: Trying reverse substring (Zotero in CORE)`);
		if (normalizedZotero.length > 20) {
			for (var e of idx.entries) {
				if ((' ' + e.norm + ' ').indexOf(paddedZotero) !== -1 &&
				    !this._coreVeto(normalizedZotero, e.norm) &&
				    (!best || e.norm.length < best.norm.length)) {
					best = e;
				}
			}
		}
		if (best) {
			debugLog(`  ✓ CORE reverse substring match: "${best.key}" (${coreRankings[best.key]})`);
			return coreRankings[best.key];
		}
		debugLog(`  No CORE reverse substring match`);

		// Strategy 4: Word overlap matching (for titles with extra words like "SIGSAC")
		// Distinctive words only (no "international", "conference", ...), compared both ways:
		// 80%+ of the CORE words in the Zotero title AND 70%+ of the Zotero words in the CORE title
		debugLog(`  CORE Strategy 4: Trying word overlap`);
		var zoteroList = this.conferenceWords(this.normalizeString(cleanedZotero.replace(/\([^()]*\)/g, ' ')));
		var zoteroWords = new Set(zoteroList);
		var bestScore = 0;
		var bestCount = 0;
		for (var e of idx.entries) {
			var coreWords = e.words || (e.words = this.conferenceWords(e.norm));
			if (coreWords.length < 3 || this._coreVeto(normalizedZotero, e.norm)) continue;
			var matchCount = this._overlap(coreWords, zoteroWords);
			var score = Math.min(matchCount / coreWords.length, matchCount / zoteroList.length);
			if (matchCount / coreWords.length >= 0.8 && matchCount / zoteroList.length >= 0.7 &&
			    (score > bestScore || (score === bestScore && matchCount > bestCount))) {
				best = e;
				bestScore = score;
				bestCount = matchCount;
			}
		}
		if (best) {
			debugLog(`  ✓ CORE word overlap match: "${best.key}" (${coreRankings[best.key]})`);
			debugLog(`    Matched ${bestCount} distinctive words (worse side ${(bestScore*100).toFixed(0)}%)`);
			return coreRankings[best.key];
		}
		debugLog(`  No CORE word overlap match`);

		// Strategy 5: Acronym matching LAST (as tiebreaker only, since acronyms are ambiguous)
		// Only use if acronym is reasonably unique (4+ characters)
		if (zoteroAcronym && zoteroAcronym.length >= 4) {
			debugLog(`  CORE Strategy 5: Trying acronym match "${zoteroAcronym}" (>= 4 chars, used as tiebreaker)`);

			var acronymMatches = idx.entries.filter(e => this.extractAcronym(e.key) === zoteroAcronym);

			if (acronymMatches.length === 1) {
				// Single match - relatively safe to use
				debugLog(`  ✓ CORE acronym match (unique): "${acronymMatches[0].key}" (${coreRankings[acronymMatches[0].key]})`);
				return coreRankings[acronymMatches[0].key];
			} else if (acronymMatches.length > 1) {
				// Shared acronym: take the one sharing clearly more words with the Zotero title
				var scored = acronymMatches.map(e => ({
					e: e,
					count: this._overlap(this.conferenceWords(e.norm), zoteroWords)
				})).sort((a, b) => b.count - a.count);
				for (var s of scored) {
					debugLog(`    - "${s.e.key}" (${coreRankings[s.e.key]}), ${s.count} shared words`);
				}
				if (scored[0].count >= 2 && scored[0].count > scored[1].count) {
					debugLog(`  ✓ CORE acronym match (word tiebreak): "${scored[0].e.key}"`);
					return coreRankings[scored[0].e.key];
				}
				debugLog(`  ✗ CORE acronym ambiguous: ${acronymMatches.length} conferences share acronym "${zoteroAcronym}"`);
			} else {
				debugLog(`  No CORE acronym match for "${zoteroAcronym}"`);
			}
		} else if (zoteroAcronym) {
			debugLog(`  CORE Strategy 5: Skipping acronym match "${zoteroAcronym}" (< 4 chars, too ambiguous)`);
		}

		return null;
	}
};

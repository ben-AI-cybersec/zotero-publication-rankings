/*
 * Publication Rankings Plugin for Zotero 7
 * Ranking matching engine - Pure logic with no UI dependencies
 * 
 * Copyright (C) 2025 Ben Stephens
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

/* global Zotero, DatabaseRegistry, ManualOverrides */

/**
 * Ranking matching engine - handles all ranking lookup logic
 * Pure business logic with no UI dependencies for easy testing
 * 
 * Delegates actual matching to registered database plugins via DatabaseRegistry
 */
var RankingEngine = {
	/**
	 * Get the ranking for a Zotero item
	 * 
	 * @param {Object} item - Zotero item object
	 * @param {boolean} enableDebug - Whether to log detailed matching information
	 * @returns {string} Ranking string (e.g., "Q1 0.85", "A*", "B") or empty string if not found
	 * 
	 * @example
	 * var ranking = RankingEngine.getRanking(item, false);
	 * // Returns: "Q1 0.85" or "A*" or ""
	 */
	getRanking: function(item, enableDebug = false) {
		try {
			if (!item || !item.isRegularItem()) {
				return '';
			}
			
			// Extract publication title from various possible fields
			var publicationTitle = this.extractPublicationTitle(item);
			if (!publicationTitle) {
				return '';
			}
			
			var normalizedTitle = publicationTitle.trim();
			
			// Debug logging helper
			const debugLog = (message) => {
				if (enableDebug) {
					Zotero.debug(`[MATCH DEBUG] ${message}`);
				}
			};
			
			debugLog(`=== Matching: "${publicationTitle}" ===`);
			
			// Check manual overrides first (highest priority)
			const manualOverride = ManualOverrides.get(publicationTitle);
			if (manualOverride) {
				debugLog(`✓ MANUAL OVERRIDE: "${manualOverride}"`);
				return manualOverride;
			}
			debugLog(`No manual override found`);
			
			// Get all enabled databases from registry (sorted by priority)
			const databases = DatabaseRegistry.getEnabledDatabases();
			debugLog(`Checking ${databases.length} enabled database(s): ${databases.map(db => db.name).join(', ')}`);
			
			// Try each database in priority order
			var ranking = '';
			for (var i = 0; i < databases.length; i++) {
				var db = databases[i];
				debugLog(`Trying database: ${db.name} (priority ${db.priority})`);
				
				var rank = db.matcher(normalizedTitle, debugLog);
				debugLog(`Matcher in ${db.name} return rank: ${rank}`);
				if (rank) {
					debugLog(`✓ FOUND in ${db.name}: ${rank}`);
					switch (db.id) {
						case 'sjr':
							rank = 'SJR: ' + rank;
							break;
						case 'core':
							rank = 'CORE: ' + rank;
							break;
						case 'abs':
							rank = 'ABS: ' + rank;
							break;
						case 'ft50':
							rank = 'FT50';
							break;
						case 'vhb':
							rank = 'VHB: ' + rank;
							break;
                    }

					ranking = rank + ' ' + ranking;
					debugLog(`Ranking = ${ranking}`);
				}
			}

			if (ranking) {
				debugLog(`✗ NO MATCH FOUND in any database for "${publicationTitle}"`);
			}
			return ranking;
		}
		catch (e) {
			Zotero.logError("RankingEngine: Error getting ranking: " + e);
			return '';
		}
	},

	/**
	 * Get the ranking of a Zotero Item as an array of comma-separated strings
	 * The strings are formed by the following parts:
	 *		0: database id
	 *		1: ranking
	 *		2: ranking colour
	 *		
	 * @param {Object} item - Zotero item object
	 * @param {boolean} enableDebug - Whether to log detailed matching information
	 * @returns {Array} strings - Array of string or empty array
	 * 
	 * @example
	 * var ranking = RankingEngine.getRankingArray(item, false);
	 * // Returns: ["sjr,Q1 0.85,black", "core,A*,red"] or []
	 */
	getRankingArray: function (item, enableDebug = false) {
		try {
			var m = [];

			if (!item || !item.isRegularItem()) {
				return m;
			}

			// Extract publication title from various possible fields
			var publicationTitle = this.extractPublicationTitle(item);

			if (!publicationTitle) {
				return m;
			}

			var normalizedTitle = publicationTitle.trim();

			// Debug logging helper
			const debugLog = (message) => {
				if (enableDebug) {
					Zotero.debug(`[MATCH DEBUG getRankingArray] ${message}`);
				}
			};

			debugLog(`=== Matching: "${publicationTitle}" ===`);

			// Check manual overrides first (highest priority)
			const manualOverride = ManualOverrides.get(publicationTitle);
			if (manualOverride) {
				debugLog(`✓ MANUAL OVERRIDE: "${manualOverride}"`);
				m.push(`Manual,"${manualOverride}",#757575`);
				return m;
			}
			debugLog(`No manual override found`);

			// Get all enabled databases from registry (sorted by priority)
			const databases = DatabaseRegistry.getEnabledDatabases();
			debugLog(`Checking ${databases.length} enabled database(s): ${databases.map(db => db.name).join(', ')}`);

			// Try each database in priority order
			for (var i = 0; i < databases.length; i++) {
				var db = databases[i];
				debugLog(`Trying database: ${db.name} (priority ${db.priority})`);

				var rank = db.matcher(normalizedTitle, debugLog);
				if (rank) {
					debugLog(`✓ FOUND in ${db.name}: ${rank}`);
					var a = [db.id, rank, UIUtils.getRankingColor(db.id, rank)];
					m.push(a.join(','));
				}
			}

			if (m.length === 0) {
				debugLog(`✗ NO MATCH FOUND in any database for "${publicationTitle}"`);
			}

			return m;
		}
		catch (e) {
			Zotero.logError("RankingEngine: Error getting ranking: " + e);
			return [];
		}
	},


	/**
	 * Extract publication title from item, checking multiple possible fields
	 * 
	 * @param {Object} item - Zotero item object
	 * @returns {string|null} Publication title or null if not found
	 * 
	 * @example
	 * var title = RankingEngine.extractPublicationTitle(item);
	 * // Returns: "Nature" or "Proceedings of ACM CCS" or null
	 */
	extractPublicationTitle: function(item) {
		if (!item || !item.isRegularItem()) {
			return null;
		}
		
		// Try multiple fields in priority order
		var publicationTitle = item.getField('publicationTitle');
		if (publicationTitle) {
			return publicationTitle;
		}
		
		// For conference papers, try proceedings title
		publicationTitle = item.getField('proceedingsTitle');
		if (publicationTitle) {
			return publicationTitle;
		}
		
		// Also try conference name field
		publicationTitle = item.getField('conferenceName');
		if (publicationTitle) {
			return publicationTitle;
		}
		
		return null;
	}
};

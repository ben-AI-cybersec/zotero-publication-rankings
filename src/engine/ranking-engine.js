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
			for (var i = 0; i < databases.length; i++) {
				var db = databases[i];
				debugLog(`Trying database: ${db.name} (priority ${db.priority})`);
				
				var ranking = db.matcher(normalizedTitle, debugLog);
				if (ranking) {
					debugLog(`✓ FOUND in ${db.name}: ${ranking}`);
					return ranking;
				}
			}
			
			debugLog(`✗ NO MATCH FOUND in any database for "${publicationTitle}"`);
			return '';
		}
		catch (e) {
			Zotero.logError("RankingEngine: Error getting ranking: " + e);
			return '';
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

/*
 * Publication Rankings Plugin for Zotero 7
 * Column Manager - Custom column registration and caching
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

/* global Zotero, RankingEngine, UIUtils */

/**
 * Column Manager - Handles custom column registration, caching, and rendering
 * Isolates all Zotero ItemTreeManager interaction in one place
 */
var ColumnManager = {
	columnDataKey: null,
	rankingCache: new Map(),
	
	/**
	 * Register the custom ranking column with Zotero
	 * 
	 * @returns {Promise<string>} The registered column data key
	 * 
	 * @example
	 * await ColumnManager.register();
	 */
	register: async function() {
		Zotero.debug("Publication Rankings: Attempting to register column");
		
		try {
			this.columnDataKey = await Zotero.ItemTreeManager.registerColumn({
				dataKey: 'ranking',
				label: 'Ranking',
				pluginID: 'publication-rankings@zotero.org',
				dataProvider: this.dataProvider.bind(this),
				renderCell: this.renderCell.bind(this),
				sortingKey: this.sortingKey.bind(this),
				zoteroPersist: ['width', 'ordinal', 'hidden', 'sortDirection']
			});
			
			Zotero.debug("Publication Rankings: Column registered with dataKey: " + this.columnDataKey);
			return this.columnDataKey;
		}
		catch (e) {
			Zotero.logError("Publication Rankings: Failed to register column: " + e);
			throw e;
		}
	},
	
	/**
	 * Unregister the custom ranking column
	 */
	unregister: function() {
		if (this.columnDataKey) {
			Zotero.ItemTreeManager.unregisterColumn(this.columnDataKey);
			Zotero.debug("Publication Rankings: Column unregistered");
		}
	},
	
	/**
	 * Data provider callback for the ranking column
	 * Returns ranking with sort prefix for alphabetical ordering
	 * 
	 * @param {Object} item - Zotero item
	 * @param {string} dataKey - Column data key
	 * @returns {string} Formatted ranking with sort prefix (e.g., "8999|Q1 0.85")
	 * 
	 * @example
	 * var data = ColumnManager.dataProvider(item, 'ranking');
	 * // Returns: "8999|Q1 0.85" (for display as "Q1 0.85", sorted as 8999)
	 */
	dataProvider: function(item, dataKey) {
		const itemID = item.id;
		let ranking;
		
		// Use cache if available
		if (!this.rankingCache.has(itemID)) {
			ranking = RankingEngine.getRanking(item);
			this.rankingCache.set(itemID, ranking);
		} else {
			ranking = this.rankingCache.get(itemID);
		}
		
		// Zotero sorts alphabetically by dataProvider return value
		// Prepend numeric sort value to force correct ordering
		// Since higher values = better ranking, but alphabetical sort is ascending,
		// we invert the value (9999 - sortValue) so best items sort first
		// Format: "invertedSortValue|ranking" where invertedSortValue is 4-digit zero-padded
		const sortValue = UIUtils.getRankingSortValue(ranking);
		const invertedValue = 9999 - sortValue; // Invert: 1000 becomes 8999, 50 becomes 9949
		const paddedValue = String(invertedValue).padStart(4, '0');
		
		return `${paddedValue}|${ranking}`;
	},
	
	/**
	 * Render cell callback for the ranking column
	 * Creates the visual cell element with color coding
	 * 
	 * @param {number} index - Row index
	 * @param {string} data - Data from dataProvider (with sort prefix)
	 * @param {Object} column - Column configuration
	 * @param {boolean} isFirstColumn - Whether this is the first column
	 * @param {Document} doc - Document object
	 * @returns {HTMLElement} Rendered cell element
	 * 
	 * @example
	 * var cell = ColumnManager.renderCell(0, "8999|Q1 0.85", column, false, doc);
	 */
	renderCell: function(index, data, column, isFirstColumn, doc) {
		// Create cell element
		const cell = doc.createElement('span');
		cell.className = `cell ${column.className}`;
		
		// Strip the sort prefix (format is "sortValue|ranking")
		let displayText = data;
		if (data && data.includes('|')) {
			displayText = data.split('|')[1];
		}
		
		cell.textContent = displayText;
		
		// Apply color coding based on ranking
		if (displayText) {
			const color = UIUtils.getRankingColor(displayText);
			if (color) {
				cell.style.color = color;
				cell.style.fontWeight = 'bold';
			}
		}
		
		return cell;
	},
	
	/**
	 * Sorting key callback for the ranking column
	 * Note: Zotero appears to sort by dataProvider value instead,
	 * so we use sort prefix in dataProvider. Keeping this for documentation.
	 * 
	 * @param {Object} item - Zotero item
	 * @returns {number} Numeric sort value (higher = better ranking)
	 * 
	 * @example
	 * var sortKey = ColumnManager.sortingKey(item);
	 * // Returns: 1000 (for A*), 500 (for Q1), etc.
	 */
	sortingKey: function(item) {
		const itemID = item.id;
		let ranking;
		
		if (this.rankingCache.has(itemID)) {
			ranking = this.rankingCache.get(itemID);
		} else {
			ranking = RankingEngine.getRanking(item);
			this.rankingCache.set(itemID, ranking);
		}
		
		return UIUtils.getRankingSortValue(ranking);
	},
	
	/**
	 * Clear cache for a specific item
	 * 
	 * @param {number} itemID - Zotero item ID
	 * 
	 * @example
	 * ColumnManager.clearCache(12345);
	 */
	clearCache: function(itemID) {
		this.rankingCache.delete(itemID);
	},
	
	/**
	 * Clear all cached rankings
	 * Used when CORE preference changes or manual overrides are modified
	 * 
	 * @example
	 * ColumnManager.clearAllCache();
	 */
	clearAllCache: function() {
		this.rankingCache.clear();
		Zotero.debug(`Publication Rankings: Cache cleared (${this.rankingCache.size} items)`);
	},
	
	/**
	 * Get cached ranking for an item without recalculating
	 * 
	 * @param {number} itemID - Zotero item ID
	 * @returns {string|undefined} Cached ranking or undefined
	 * 
	 * @example
	 * var ranking = ColumnManager.getCachedRanking(12345);
	 */
	getCachedRanking: function(itemID) {
		return this.rankingCache.get(itemID);
	},
	
	/**
	 * Set cached ranking for an item
	 * 
	 * @param {number} itemID - Zotero item ID
	 * @param {string} ranking - Ranking string to cache
	 * 
	 * @example
	 * ColumnManager.setCachedRanking(12345, "Q1 0.85");
	 */
	setCachedRanking: function(itemID, ranking) {
		this.rankingCache.set(itemID, ranking);
	}
};

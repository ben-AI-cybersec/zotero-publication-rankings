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
	 * Cache now stores structured data (array) instead of string
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
		let rankingData;
		
		// Use cache if available (cache stores array of ranking objects)
		if (!this.rankingCache.has(itemID)) {
			// Get structured ranking data from engine
			rankingData = RankingEngine.getRankingArray(item, false);
			this.rankingCache.set(itemID, rankingData);
		} else {
			rankingData = this.rankingCache.get(itemID);
		}
		
		// Convert structured data to display string
		// rankingData format: [{database: "sjr", ranking: "Q1 0.85", color: "#color"}, ...]
		const ranking = this.formatRankingForDisplay(rankingData);
		
		// Zotero sorts alphabetically by dataProvider return value
		// Prepend numeric sort value to force correct ordering
		// Since higher values = better ranking, but alphabetical sort is ascending,
		// we invert the value (9999 - sortValue) so best items sort first
		// Format: "invertedSortValue|ranking" where invertedSortValue is 4-digit zero-padded
		const sortValue = UIUtils.getRankingSortValue(itemID, ranking);
		const invertedValue = 9999 - sortValue; // Invert: 1000 becomes 8999, 50 becomes 9949
		const paddedValue = String(invertedValue).padStart(4, '0');

		// The itemID is passed here to renderClass in order to perform custom painting
		return `${paddedValue}|${ranking}&&${itemID}`;
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

		let displayText = data;
		// data always has a value (itemID)
		// Extract itemID
		let itemID = displayText.split('&&')[1];
				
		// Strip the sort prefix (format is "sortValue|ranking")
		// This is also the default text if the graphica rendering fails
		displayText = displayText.split('&&')[0].split('|')[1];

		var content = displayText;
		// Failsafe in case the code below does not work
		cell.innerHTML = content;

		var item = Zotero.Items.get(itemID);
		if (item) {
			// Determine the right font colour
			var bItems = [];
			content = '';
			// Use the cached ranking (copied, since reverse() works in place)
			var cached = this.rankingCache.get(item.id);
			var r = Array.isArray(cached) ? cached : RankingEngine.getRankingArray(item);
			r.slice().reverse().forEach(function (line) {
				var e = line.split(',');
				let b = {
					color: e[2],
					text: !e[1] || e[1].trim() === '' ?
						' ' + e[0].toUpperCase().trim() + ' ' :
						e[0].toUpperCase().trim() + ': ' + e[1].trim()
				};
				bItems.push(b);
			});

			// Just show text
			if (!getPref('enableBadges')) {
				bItems.forEach(function (it) {
					var { color, text } = it;
					content = content + `<span style="color: ${color}; font-weight: bold;">${text}</span> `;
				});

				content = content.trim();
				cell.innerHTML = content;
			} else {
			// create badges with text in them
				cell.innerHTML = '';
			
				let container = doc.createElement('span');
				container.style.display = 'inline-flex'; // arrange badges side by side
				container.style.alignItems = 'center'; // vertically
				container.style.justifyContent = 'left'; // badges at the left side of the cell
				container.style.gap = '5px'; // space between badges

				bItems.forEach(function (it) {
					var { color, text } = it;

					// Create the badge
					let badge = doc.createElement('span');
					badge.style.position = 'relative';

					// Calculate width based on the length of the text
					badge.style.width = (text.length * 8) + 'px';  // Width of the circle

					badge.style.height = '20px';  // Height of the circle
					badge.style.borderRadius = '10%';  // Make it round

					// Use the color variable for the background 
					// Soften the colour a bit, because it is very bright for background color
					var hex = color.replace(/^#/, '');
					let r = parseInt(hex.substring(0, 2), 16);
					let g = parseInt(hex.substring(2, 4), 16);
					let b = parseInt(hex.substring(4, 6), 16);

					// Lighten the colour
					var factor = 0.2;
					r = Math.round(r + (255 - r) * factor);
					g = Math.round(g + (255 - g) * factor);
					b = Math.round(b + (255 - b) * factor);

					// Back to Hex
					let red = r.toString(16).padStart(2, '0');
					let green = g.toString(16).padStart(2, '0')
					let blue = b.toString(16).padStart(2, '0');

					
					badge.style.backgroundColor = `#${red}${green}${blue}` ;

					badge.style.display = 'flex';
					badge.style.alignItems = 'left';
					badge.style.justifyContent = 'center';

					// Create the text
					let badgeText = doc.createElement('div');
					badgeText.textContent = text;
					badgeText.style.position = 'absolute';
					badgeText.style.top = '50%'; // centre vertically
					badgeText.style.left = '50%'; // centre horizontally
					badgeText.style.transform = 'translate(-50%, -50%)'; // adjust centering
					badgeText.style.color = 'white';
					badgeText.style.fontWeight = 'bold';
					badgeText.style.fontSize = (badgeText.style.fontSize - 2) + 'px';

					// Attach the text to the badge
					badge.appendChild(badgeText);

					container.appendChild(badge);
				});
				cell.appendChild(container);
			}
			return cell;
		}
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
		let rankingData;
		
		// Same array cache as dataProvider (it must never hold a plain string)
		if (this.rankingCache.has(itemID)) {
			rankingData = this.rankingCache.get(itemID);
		} else {
			rankingData = RankingEngine.getRankingArray(item, false);
			this.rankingCache.set(itemID, rankingData);
		}
		
		return UIUtils.getRankingSortValue(itemID, this.formatRankingForDisplay(rankingData));
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
	 * Returns raw structured data (array of ranking objects)
	 * 
	 * @param {number} itemID - Zotero item ID
	 * @returns {Array|undefined} Cached ranking array or undefined
	 * 
	 * @example
	 * var rankingData = ColumnManager.getCachedRanking(12345);
	 * // Returns: ["sjr,Q1 0.85,#color", "core,A*,#color"] or undefined
	 */
	getCachedRanking: function(itemID) {
		return this.rankingCache.get(itemID);
	},
	
	/**
	 * Format structured ranking data for display
	 * Converts array of ranking objects to display string
	 * 
	 * @param {Array} rankingData - Array of ranking objects from cache
	 * @returns {string} Formatted string for display
	 * 
	 * @example
	 * formatRankingForDisplay([{database: "sjr", ranking: "Q1 0.85", color: "#color"}])
	 * // Returns: "SJR: Q1 0.85"
	 */
	formatRankingForDisplay: function(rankingData) {
		if (!rankingData || rankingData.length === 0) {
			return '';
		}
		
		// Parse the comma-separated strings and format for display
		// Format: "sjr,Q1 0.85,#color" -> "SJR: Q1 0.85"
		var parts = [];
		for (var i = 0; i < rankingData.length; i++) {
			var entry = rankingData[i];
			if (typeof entry === 'string') {
				// Parse comma-separated format: "database,ranking,color"
				var fields = entry.split(',');
				if (fields.length >= 2) {
					var db = fields[0].toUpperCase();
					var rank = fields[1].trim();
					parts.push(db + ': ' + rank);
				}
			}
		}
		
		return parts.join(' ');
	},
	
	/**
	 * Get cached ranking for an item, formatted for display
	 * Used by other modules that need the ranking string
	 * 
	 * @param {number} itemID - Zotero item ID
	 * @returns {string|undefined} Formatted ranking string or undefined
	 * 
	 * @example
	 * var ranking = ColumnManager.getCachedRankingForItem(12345);
	 * // Returns: "SJR: Q1 0.85 CORE: A*" or undefined
	 */
	getCachedRankingForItem: function(itemID) {
		var rankingData = this.rankingCache.get(itemID);
		if (!rankingData) {
			return undefined;
		}
		return this.formatRankingForDisplay(rankingData);
	},
	
	/**
	 * Set cached ranking for an item
	 * Now stores structured data (array) instead of string
	 * 
	 * @param {number} itemID - Zotero item ID
	 * @param {Array} rankingData - Array of ranking strings to cache
	 * 
	 * @example
	 * ColumnManager.setCachedRanking(12345, ["sjr,Q1 0.85,#color"]);
	 */
	setCachedRanking: function(itemID, rankingData) {
		this.rankingCache.set(itemID, rankingData);
	}
};

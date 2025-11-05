/* global ZoteroPane, sjrRankings, coreRankings */

if (typeof ZoteroRankings === 'undefined') {
	ZoteroRankings = {
		id: null,
		version: null,
		rootURI: null,
		notifierID: null,
		columnDataKey: null,
		
		init: async function({ id, version, rootURI }) {
			Zotero.debug("========================================");
			Zotero.debug("SJR & CORE Rankings: init() CALLED");
			Zotero.debug("========================================");
		
		this.id = id;
		this.version = version;
		this.rootURI = rootURI;
		
		// Register custom column in item tree
		Zotero.debug("SJR & CORE Rankings: Attempting to register column");
		try {
			this.columnDataKey = await Zotero.ItemTreeManager.registerColumn({
				dataKey: 'sjr-core-ranking',  // More unique dataKey
				label: 'Ranking',
				pluginID: 'sjr-core-rankings@zotero.org',
				dataProvider: (item, dataKey) => {
					return this.getRankingSync(item);
				},
				renderCell: (index, data, column, isFirstColumn, doc) => {
					// Create cell element
					const cell = doc.createElement('span');
					cell.className = `cell ${column.className}`;
					cell.textContent = data;
					
					// Apply color coding based on ranking
					if (data) {
						const color = this.getRankingColor(data);
						if (color) {
							cell.style.color = color;
							cell.style.fontWeight = 'bold';
						}
					}
					
					return cell;
				},
				flex: 1,
				zoteroPersist: ['width', 'hidden', 'sortDirection']
			});
			
			Zotero.debug("SJR & CORE Rankings: Column registered with dataKey: " + this.columnDataKey);
		}
		catch (e) {
			Zotero.logError("SJR & CORE Rankings: Failed to register column: " + e);
			// Column registration failed, but continue anyway
		}
		
		// Register notifier to watch for new/modified items
		try {
			this.notifierID = Zotero.Notifier.registerObserver(this, ['item'], 'rankings');
		} catch (e) {
			Zotero.logError("SJR & CORE Rankings: Failed to register notifier: " + e);
		}
		
		Zotero.debug("SJR & CORE Rankings initialized");
	},
	
	// Notifier callback - refresh item tree when items are added/modified
	notify: async function(event, type, ids, extraData) {
		// Check if auto-update is enabled
		if (!Zotero.Prefs.get('extensions.sjr-core-rankings.autoUpdate', true)) {
			return;
		}
		
		if (event !== 'add' && event !== 'modify') {
			return;
		}
		
		// The custom column's dataProvider will automatically be called when the item tree refreshes
		// Just trigger a refresh for the affected items
		try {
			Zotero.Notifier.trigger('refresh', 'itemtree', []);
			Zotero.debug("SJR & CORE Rankings: Triggered item tree refresh for " + ids.length + " items");
		}
		catch (e) {
			Zotero.logError("SJR & CORE Rankings: Error refreshing item tree: " + e);
		}
	},
	
	addToAllWindows: function() {
		var windows = Zotero.getMainWindows();
		for (let win of windows) {
			this.addToWindow(win);
		}
	},
	
	addToWindow: function(window) {
		// Add menu item to Tools menu
		var doc = window.document;
		
		Zotero.debug("SJR & CORE Rankings: Adding menu to window");
		
		// Wait for document to be ready
		if (doc.readyState !== 'complete') {
			Zotero.debug("SJR & CORE Rankings: Document not ready, waiting...");
			window.addEventListener('load', () => {
				this.addToWindow(window);
			}, { once: true });
			return;
		}
		
		// Check Rankings menu item
		var menuItem = doc.createXULElement('menuitem');
		menuItem.id = 'zotero-rankings-update';
		menuItem.setAttribute('label', 'Check Rankings for Selected Items');
		menuItem.addEventListener('command', function() {
			ZoteroRankings.updateSelectedItems();
		});
		
		// Try the Tools menu (zotero-tb-actions-popup is the popup ID)
		var toolsMenu = doc.getElementById('zotero-tb-actions-popup');
		if (toolsMenu) {
			toolsMenu.appendChild(menuItem);
			Zotero.debug("SJR & CORE Rankings: Menu item added to Tools menu");
		} else {
			Zotero.debug("SJR & CORE Rankings: ERROR - Could not find Tools menu (zotero-tb-actions-popup)");
		}
	},
	
	removeFromAllWindows: function() {
		var windows = Zotero.getMainWindows();
		for (let win of windows) {
			this.removeFromWindow(win);
		}
		
		// Unregister the notifier
		if (this.notifierID) {
				Zotero.Notifier.unregisterObserver(this.notifierID);
			}
			
		// Unregister the custom column
		if (this.columnDataKey) {
			Zotero.ItemTreeManager.unregisterColumn(this.columnDataKey);
		}
	},
	
	removeFromWindow: function(window) {
		var doc = window.document;
		var menuItem = doc.getElementById('zotero-rankings-update');
		if (menuItem) {
			menuItem.remove();
		}
	},
	
	// Get color for ranking display
	getRankingColor: function(ranking) {
		if (!ranking) return null;
		
		// SJR Quartiles (Green to Red gradient)
		if (ranking.startsWith('Q1')) {
			return '#2E7D32'; // Dark green (best)
		}
		if (ranking.startsWith('Q2')) {
			return '#0288D1'; // Blue
		}
		if (ranking.startsWith('Q3')) {
			return '#F57C00'; // Orange
		}
		if (ranking.startsWith('Q4')) {
			return '#D32F2F'; // Red (lowest)
		}
		
		// CORE Conference Rankings (same gradient)
		if (ranking === 'A*' || ranking.startsWith('A* ')) {
			return '#2E7D32'; // Dark green (best)
		}
		if (ranking === 'A' || ranking.startsWith('A ') || ranking.startsWith('A[')) {
			return '#0288D1'; // Blue
		}
		if (ranking === 'B' || ranking.startsWith('B ') || ranking.startsWith('B[')) {
			return '#F57C00'; // Orange
		}
		if (ranking === 'C' || ranking.startsWith('C ') || ranking.startsWith('C[')) {
			return '#D32F2F'; // Red
		}
		
		// Australasian Rankings (same gradient)
		if (ranking.startsWith('Au A')) {
			return '#0288D1'; // Blue
		}
		if (ranking.startsWith('Au B')) {
			return '#F57C00'; // Orange
		}
		if (ranking.startsWith('Au C')) {
			return '#D32F2F'; // Red
		}
		
		// National Rankings (use purple to distinguish from main tiers)
		if (ranking.startsWith('Nat ')) {
			return '#7B1FA2'; // Purple
		}
		
		// Default for other rankings (TBR, Unranked, etc.)
		return '#757575'; // Gray
	},
	
	// Synchronous version of getRankingForItem for use in dataProvider
	getRankingSync: function(item) {
		try {
			if (!item || !item.isRegularItem()) {
				return '';
			}
			
			var publicationTitle = item.getField('publicationTitle');
			if (!publicationTitle) {
				// For conference papers, try proceedings title
				publicationTitle = item.getField('proceedingsTitle');
			}
			if (!publicationTitle) {
				// Also try conference name field
				publicationTitle = item.getField('conferenceName');
			}
			if (!publicationTitle) {
				return '';
			}
			
			var normalizedTitle = publicationTitle.trim();
			
			// First, try to match against SJR journal rankings (exact match)
			var normalizedSearch = normalizedTitle.toLowerCase();
				for (var title in sjrRankings) {
					if (title.toLowerCase() === normalizedSearch) {
						var sjrData = sjrRankings[title];
						return sjrData.quartile + " " + sjrData.sjr;
					}
				}
				
				// Try fuzzy match for SJR (some entries have ", ACRONYM" format)
				var cleanedSearch = this.normalizeString(this.cleanConferenceTitle(normalizedTitle));
				for (var title in sjrRankings) {
					var cleanedSjr = this.normalizeString(title.split(',')[0].trim()); // Remove ", ACRONYM" part
					if (cleanedSjr === cleanedSearch && cleanedSjr.length > 10) {
						var sjrData = sjrRankings[title];
						return sjrData.quartile + " " + sjrData.sjr;
					}
				}
				
				// Try word overlap matching for SJR conference proceedings
				var cleanedSearch = this.normalizeString(this.cleanConferenceTitle(normalizedTitle));
				var searchWords = cleanedSearch.split(' ').filter(function(w) { return w.length > 3; });
				
				for (var title in sjrRankings) {
					var cleanedSjr = this.normalizeString(title);
					var sjrWords = cleanedSjr.split(' ').filter(function(w) { return w.length > 3; });
					
					// Count how many significant words overlap
					var matchCount = 0;
					for (var k = 0; k < sjrWords.length; k++) {
						if (searchWords.indexOf(sjrWords[k]) !== -1) {
							matchCount++;
						}
					}
					
					// If most words overlap (70%+) and it looks like a conference, match it
					if (sjrWords.length >= 4 && matchCount / sjrWords.length >= 0.7) {
						var sjrData = sjrRankings[title];
						return sjrData.quartile + " " + sjrData.sjr;
					}
				}
				
				// If not found in journals, try CORE conference rankings (if enabled)
				if (Zotero.Prefs.get('extensions.sjr-core-rankings.enableCORE', true)) {
					var coreRank = this.matchCoreConference(normalizedTitle);
					if (coreRank) {
						return coreRank;
					}
				}
				
				return '';
			}
			catch (e) {
				Zotero.logError("SJR & CORE Rankings: Error getting ranking: " + e);
				return '';
			}
		},
		
		// Helper function to get ranking for a single item (kept for backwards compatibility)
		getRankingForItem: async function(item) {
			var publicationTitle = item.getField('publicationTitle');
			if (!publicationTitle) {
				// For conference papers, try proceedings title
				publicationTitle = item.getField('proceedingsTitle');
			}
			if (!publicationTitle) {
				// Also try conference name field
				publicationTitle = item.getField('conferenceName');
			}
			if (!publicationTitle) {
				return null;
			}
			
			var normalizedTitle = publicationTitle.trim();
			var displayValue = '';
			
			// First, try to match against SJR journal rankings (exact match)
			var normalizedSearch = normalizedTitle.toLowerCase();
			for (var title in sjrRankings) {
				if (title.toLowerCase() === normalizedSearch) {
					var sjrData = sjrRankings[title];
					displayValue = sjrData.quartile + " " + sjrData.sjr;
					return displayValue;
				}
			}
			
			// Try fuzzy match for SJR (some entries have ", ACRONYM" format)
			var cleanedSearch = this.normalizeString(this.cleanConferenceTitle(normalizedTitle));
			for (var title in sjrRankings) {
				var cleanedSjr = this.normalizeString(title.split(',')[0].trim()); // Remove ", ACRONYM" part
				if (cleanedSjr === cleanedSearch && cleanedSjr.length > 10) {
					var sjrData = sjrRankings[title];
					displayValue = sjrData.quartile + " " + sjrData.sjr;
					return displayValue;
				}
			}
			
			// Try word overlap matching for SJR conference proceedings
			var cleanedSearch = this.normalizeString(this.cleanConferenceTitle(normalizedTitle));
			var searchWords = cleanedSearch.split(' ').filter(function(w) { return w.length > 3; });
			
			for (var title in sjrRankings) {
				var cleanedSjr = this.normalizeString(title);
				var sjrWords = cleanedSjr.split(' ').filter(function(w) { return w.length > 3; });
				
				// Count how many significant words overlap
				var matchCount = 0;
				for (var k = 0; k < sjrWords.length; k++) {
					if (searchWords.indexOf(sjrWords[k]) !== -1) {
						matchCount++;
					}
				}
				
				// If most words overlap (70%+) and it looks like a conference, match it
				if (sjrWords.length >= 4 && matchCount / sjrWords.length >= 0.7) {
					var sjrData = sjrRankings[title];
					displayValue = sjrData.quartile + " " + sjrData.sjr;
					return displayValue;
				}
			}
			
			// If not found in journals, try CORE conference rankings (if enabled)
			if (Zotero.Prefs.get('extensions.sjr-core-rankings.enableCORE', true)) {
				var coreRank = this.matchCoreConference(normalizedTitle);
				if (coreRank) {
					return coreRank;
				}
			}
			
			return null;
		},
		
		// Helper function to normalize strings for comparison
		normalizeString: function(str) {
			return str.toLowerCase()
				.replace(/&/g, 'and')  // Replace & with 'and'
				.replace(/\btelecomm?unications?\b/g, 'communications')  // Normalize telecom variants
				.replace(/[^\w\s]/g, ' ')
				.replace(/\s+/g, ' ')
				.trim();
		},
		
		// Extract acronym from conference title
		extractAcronym: function(title) {
			var match = title.match(/\(([A-Z0-9]+(?:[\s\-\/][A-Z0-9]+)*)\)/);
			if (match) {
				var acronym = match[1].replace(/[\s\-\/]/g, '').toUpperCase();
				// Remove trailing year if present (e.g., CYCON2013 -> CYCON)
				acronym = acronym.replace(/\d{4}$/, '');
				return acronym;
			}
			return '';
		},
		
		// Clean conference title for matching
		cleanConferenceTitle: function(title) {
			// Remove year patterns like "2024", "15th", "1st Annual"
			var cleaned = title
				.replace(/^Proceedings of the\s+/gi, '')  // Remove "Proceedings of the" prefix
				.replace(/^[A-Z]+\s+\d{4}\s+-\s+/gi, '')  // Remove "GLOBECOM 2023 - " prefix
				.replace(/\b\d{4}\b/g, '')
				.replace(/\b\d{1,2}(st|nd|rd|th)\s+(Annual\s+)?/gi, '')
				.replace(/\bAnnual\s+/gi, '')
				.replace(/\s+-\s+[A-Z]+\s+'?\d{2,4}\s*$/gi, '')  // Remove trailing " - CCS '13"
				.replace(/\s+/g, ' ')
				.trim();
			return cleaned;
		},
		
		// Match conference against CORE rankings
		matchCoreConference: function(zoteroTitle) {
			var normalizedZotero = this.normalizeString(this.cleanConferenceTitle(zoteroTitle));
			var zoteroAcronym = this.extractAcronym(zoteroTitle);
			
			// Strategy 1: Try acronym matching first
			if (zoteroAcronym) {
				for (var title in coreRankings) {
					if (coreRankings[title].acronym === zoteroAcronym) {
						return coreRankings[title].rank;
					}
				}
			}
			
			// Strategy 2: Try normalized exact matching
			for (var title in coreRankings) {
				var normalizedCore = this.normalizeString(title);
				if (normalizedZotero === normalizedCore) {
					return coreRankings[title].rank;
				}
			}
			
			// Strategy 3: Check if CORE title is contained in Zotero title
			for (var title in coreRankings) {
				var normalizedCore = this.normalizeString(title);
				if (normalizedZotero.indexOf(normalizedCore) !== -1 && normalizedCore.length > 20) {
					return coreRankings[title].rank;
				}
			}
			
			// Strategy 4: Check if Zotero title contains CORE title (reverse substring)
			for (var title in coreRankings) {
				var normalizedCore = this.normalizeString(title);
				if (normalizedCore.indexOf(normalizedZotero) !== -1 && normalizedZotero.length > 20) {
					return coreRankings[title].rank;
				}
			}
			
			// Strategy 5: Word overlap matching (for titles with extra words like "SIGSAC")
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
					return coreRankings[title].rank;
				}
			}
			
			return null;
		},
		
		// Main function to update selected items (now just shows statistics without modifying items)
		updateSelectedItems: async function() {
			var items = ZoteroPane.getSelectedItems();
			var found = 0;
			var notFound = 0;
			var skipped = 0;
			var notFoundList = [];  // Track titles that weren't found
			
			if (items.length === 0) {
				await Zotero.alert(window, "No items selected", "Please select some items in your Zotero library first.");
				return;
			}
			
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				
				// Skip non-regular items and attachments
				if (!item.isRegularItem()) {
					skipped++;
					continue;
				}
				
				var publicationTitle = item.getField('publicationTitle');
				if (!publicationTitle) {
					// For conference papers, try proceedings title
					publicationTitle = item.getField('proceedingsTitle');
				}
				if (!publicationTitle) {
					// Also try conference name field
					publicationTitle = item.getField('conferenceName');
				}
				if (!publicationTitle) {
					skipped++;
					continue;
				}
				
				// Check if ranking can be found
				var ranking = this.getRankingSync(item);
				if (ranking) {
					found++;
				} else {
					notFound++;
					notFoundList.push(publicationTitle.trim());
				}
			}
			
			var message = "Total selected: " + items.length + " items\n" +
				   "Rankings found: " + found + " items\n" +
				   "Not found: " + notFound + " items\n" +
				   "Skipped: " + skipped + " items (no publication title or not regular items)\n\n" +
				   "Rankings are displayed in the 'Ranking' column.\n" +
				   "Right-click the column headers to show/hide it.";
			
			// Show first 10 not found titles for debugging
			if (notFoundList.length > 0) {
				message += "\n\nFirst 10 not found titles:";
				for (var j = 0; j < Math.min(10, notFoundList.length); j++) {
					message += "\n" + (j + 1) + ". " + notFoundList[j];
				}
			}
			
			await Zotero.alert(window, "Rankings Check Complete", message);
		}
	};
}

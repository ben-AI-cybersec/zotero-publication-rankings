/*
 * SJR & CORE Rankings Plugin for Zotero 7
 * Main plugin coordination and Zotero integration
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

/* global ZoteroPane, sjrRankings, coreRankings, MatchingUtils, ManualOverrides, UIUtils */

// Declare as global variable (no 'var' inside if-block to avoid local scope)
if (typeof ZoteroRankings === 'undefined') {
	var ZoteroRankings;
}

ZoteroRankings = {
	id: null,
	version: null,
	rootURI: null,
	notifierID: null,
	columnDataKey: null,
	windows: new Set(),  // Track windows we've added UI to
	rankingCache: new Map(),  // Cache rankings to avoid recalculation
	prefsObserverID: null,  // Track preference observer
	
	init: async function({ id, version, rootURI }) {
			Zotero.debug("========================================");
			Zotero.debug("SJR & CORE Rankings: init() CALLED");
			Zotero.debug("========================================");
		
		this.id = id;
		this.version = version;
		this.rootURI = rootURI;
		
		// Initialize manual overrides from ManualOverrides module
		await ManualOverrides.load();
		
		// Register custom column in item tree
		Zotero.debug("SJR & CORE Rankings: Attempting to register column");
		try {
			this.columnDataKey = await Zotero.ItemTreeManager.registerColumn({
				dataKey: 'sjr-core-ranking',  // More unique dataKey
				label: 'Ranking',  // Will be replaced by Fluent when available
				pluginID: 'sjr-core-rankings@zotero.org',
				dataProvider: (item, dataKey) => {
					// Use cache if available
					const itemID = item.id;
					let ranking;
					
					if (!this.rankingCache.has(itemID)) {
						ranking = this.getRankingSync(item);
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
				renderCell: (index, data, column, isFirstColumn, doc) => {
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
				// sortingKey: Intended to return numeric values for efficient sorting,
				// but Zotero appears to sort alphabetically by dataProvider value instead.
				// We work around this by prepending zero-padded sort values to dataProvider output.
				// Keeping this as documentation of the intended API usage.
				sortingKey: (item) => {
					const itemID = item.id;
					let ranking;
					
					if (this.rankingCache.has(itemID)) {
						ranking = this.rankingCache.get(itemID);
					} else {
						ranking = this.getRankingSync(item);
						this.rankingCache.set(itemID, ranking);
					}
					
					return UIUtils.getRankingSortValue(ranking);
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
		
		// Register preference observer for debugMode changes
		this.prefsObserverID = Zotero.Prefs.registerObserver('extensions.sjr-core-rankings.debugMode', this.handleDebugModeChange.bind(this), true);
		
		Zotero.debug("SJR & CORE Rankings initialized");
	},
	
	// Handle debugMode preference changes
	handleDebugModeChange: function(value) {
		Zotero.debug(`SJR & CORE Rankings: Debug mode changed to ${value}`);
		
		// Update all windows
		var windows = Zotero.getMainWindows();
		for (let win of windows) {
			var doc = win.document;
			var debugMenuItem = doc.getElementById('zotero-rankings-context-debug');
			var contextMenu = doc.getElementById('zotero-itemmenu');
			
			if (value) {
				// Add debug menu item if not already present
				if (!debugMenuItem && contextMenu) {
					var contextMenuItem = doc.getElementById('zotero-rankings-context-update');
					
					// Create debug menu item
					debugMenuItem = doc.createXULElement('menuitem');
					debugMenuItem.id = 'zotero-rankings-context-debug';
					debugMenuItem.setAttribute('label', 'Debug Ranking Match');
					debugMenuItem.addEventListener('command', () => {
						this.debugSelectedItems(win);
					});
					
					// Insert after "Check Rankings" item
					if (contextMenuItem && contextMenuItem.nextSibling) {
						contextMenu.insertBefore(debugMenuItem, contextMenuItem.nextSibling);
					} else if (contextMenuItem) {
						contextMenu.appendChild(debugMenuItem);
					}
					
					Zotero.debug("SJR & CORE Rankings: Debug menu item added");
				}
			} else {
				// Remove debug menu item if present
				if (debugMenuItem) {
					debugMenuItem.remove();
					Zotero.debug("SJR & CORE Rankings: Debug menu item removed");
				}
			}
		}
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
		
		// Clear cache for modified items
		for (let id of ids) {
			this.rankingCache.delete(id);
		}
		
		// The custom column's dataProvider will automatically be called when the item tree refreshes
		// Just trigger a refresh for the affected items
		try {
			Zotero.Notifier.trigger('refresh', 'itemtree', []);
			Zotero.debug("SJR & CORE Rankings: Triggered item tree refresh and cache clear for " + ids.length + " items");
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
		// Avoid adding twice to the same window
		if (this.windows.has(window)) {
			Zotero.debug("SJR & CORE Rankings: Window already has UI, skipping");
			return;
		}
		
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
		
		// Mark this window as processed
		this.windows.add(window);
		
		// Create menu item for Tools menu
		var menuItem = doc.createXULElement('menuitem');
		menuItem.id = 'zotero-rankings-update';
		menuItem.setAttribute('label', 'Check SJR & CORE Rankings');
		menuItem.addEventListener('command', () => {
			this.updateSelectedItems(window);  // Pass window to get ZoteroPane
		});
		
		// Add to Tools menu
		var toolsMenu = doc.getElementById('menu_ToolsPopup');
		if (toolsMenu) {
			// Add separator before our item for visual grouping
			var separator = doc.createXULElement('menuseparator');
			separator.id = 'zotero-rankings-separator';
			toolsMenu.appendChild(separator);
			toolsMenu.appendChild(menuItem);
			Zotero.debug("SJR & CORE Rankings: Menu item added to Tools menu");
		}
		
		// Also add to item context menu (right-click on items)
		var contextMenu = doc.getElementById('zotero-itemmenu');
		if (contextMenu) {
			var contextSeparator = doc.createXULElement('menuseparator');
			contextSeparator.id = 'zotero-rankings-context-separator';
			
			var contextMenuItem = doc.createXULElement('menuitem');
			contextMenuItem.id = 'zotero-rankings-context-update';
			contextMenuItem.setAttribute('label', 'Check SJR & CORE Rankings');
			contextMenuItem.addEventListener('command', () => {
				this.updateSelectedItems(window);
			});
			
			// Debug matching menu item
			var debugMenuItem = doc.createXULElement('menuitem');
			debugMenuItem.id = 'zotero-rankings-context-debug';
			debugMenuItem.setAttribute('label', 'Debug Ranking Match');
			debugMenuItem.addEventListener('command', () => {
				this.debugSelectedItems(window);
			});
			
			// Set manual ranking menu item
			var manualMenuItem = doc.createXULElement('menuitem');
			manualMenuItem.id = 'zotero-rankings-context-manual';
			manualMenuItem.setAttribute('label', 'Set Manual Ranking...');
			manualMenuItem.addEventListener('command', () => {
				this.setManualRankingDialog(window);
			});
			
			// Clear manual ranking menu item
			var clearMenuItem = doc.createXULElement('menuitem');
			clearMenuItem.id = 'zotero-rankings-context-clear';
			clearMenuItem.setAttribute('label', 'Clear Manual Ranking');
			clearMenuItem.addEventListener('command', () => {
				this.clearManualRankingForSelected(window);
			});
			
			contextMenu.appendChild(contextSeparator);
			contextMenu.appendChild(contextMenuItem);
			
			// Only add debug menu item if debug mode is enabled
			if (Zotero.Prefs.get('extensions.sjr-core-rankings.debugMode', true)) {
				contextMenu.appendChild(debugMenuItem);
			}
			
			contextMenu.appendChild(manualMenuItem);
			contextMenu.appendChild(clearMenuItem);
			Zotero.debug("SJR & CORE Rankings: Context menu items added");
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
		
		// Unregister the preference observer
		if (this.prefsObserverID) {
			Zotero.Prefs.unregisterObserver(this.prefsObserverID);
		}
		
		// Unregister the custom column
		if (this.columnDataKey) {
			Zotero.ItemTreeManager.unregisterColumn(this.columnDataKey);
		}
	},
	
	removeFromWindow: function(window) {
		if (!this.windows.has(window)) {
			return;
		}
		
		this.windows.delete(window);
		
		var doc = window.document;
		
		// Remove Tools menu items
		var menuItem = doc.getElementById('zotero-rankings-update');
		if (menuItem) {
			menuItem.remove();
		}
		
		var separator = doc.getElementById('zotero-rankings-separator');
		if (separator) {
			separator.remove();
		}
		
		// Remove context menu items
		var contextMenuItem = doc.getElementById('zotero-rankings-context-update');
		if (contextMenuItem) {
			contextMenuItem.remove();
		}
		
		var debugMenuItem = doc.getElementById('zotero-rankings-context-debug');
		if (debugMenuItem) {
			debugMenuItem.remove();
		}
		
		var manualMenuItem = doc.getElementById('zotero-rankings-context-manual');
		if (manualMenuItem) {
			manualMenuItem.remove();
		}
		
		var clearMenuItem = doc.getElementById('zotero-rankings-context-clear');
		if (clearMenuItem) {
			clearMenuItem.remove();
		}
		
		var contextSeparator = doc.getElementById('zotero-rankings-context-separator');
		if (contextSeparator) {
			contextSeparator.remove();
		}
	},
	
	
	
	// Synchronous version of getRankingForItem for use in dataProvider
	getRankingSync: function(item, enableDebug = false) {
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
			
			// Debug logging helper
			const debugLog = (message) => {
				if (enableDebug) {
					Zotero.debug(`[MATCH DEBUG] ${message}`);
				}
			};
			
			debugLog(`=== Matching: "${publicationTitle}" ===`);
			
			// Check manual overrides first
			const manualOverride = ManualOverrides.get(publicationTitle);
			if (manualOverride) {
				debugLog(`✓ MANUAL OVERRIDE: "${manualOverride}"`);
				return manualOverride;
			}
			debugLog(`No manual override found`);
			
			// First, try to match against SJR journal rankings (exact match)
			var normalizedSearch = normalizedTitle.toLowerCase();
			debugLog(`Trying SJR exact match (lowercase): "${normalizedSearch}"`);
				for (var title in sjrRankings) {
					if (title.toLowerCase() === normalizedSearch) {
						var sjrData = sjrRankings[title];
						const result = sjrData.quartile + " " + sjrData.sjr;
						debugLog(`✓ SJR EXACT MATCH: "${title}" -> ${result}`);
						return result;
					}
				}
				debugLog(`No SJR exact match found`);
				
				// Try fuzzy match for SJR (some entries have ", ACRONYM" format)
				var cleanedSearch = MatchingUtils.normalizeString(MatchingUtils.cleanConferenceTitle(normalizedTitle));
				debugLog(`Trying SJR fuzzy match: "${cleanedSearch}"`);
				for (var title in sjrRankings) {
					var cleanedSjr = MatchingUtils.normalizeString(title.split(',')[0].trim()); // Remove ", ACRONYM" part
					if (cleanedSjr === cleanedSearch && cleanedSjr.length > 10) {
						var sjrData = sjrRankings[title];
						const result = sjrData.quartile + " " + sjrData.sjr;
						debugLog(`✓ SJR FUZZY MATCH: "${title}" -> ${result}`);
						return result;
					}
				}
				debugLog(`No SJR fuzzy match found`);
				
			// Try word overlap matching for SJR conference proceedings
			// This is aggressive, so use high threshold to avoid false positives
			var cleanedSearch = MatchingUtils.normalizeString(MatchingUtils.cleanConferenceTitle(normalizedTitle));
			var searchWords = cleanedSearch.split(' ').filter(function(w) { return w.length > 3; });
			
			debugLog(`Trying SJR word overlap: cleaned="${cleanedSearch}", words=[${searchWords.join(', ')}]`);
			
			for (var title in sjrRankings) {
				var cleanedSjr = MatchingUtils.normalizeString(title);
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
					var sjrData = sjrRankings[title];
					const result = sjrData.quartile + " " + sjrData.sjr;
					debugLog(`✓ SJR WORD OVERLAP MATCH: "${title}"`);
					debugLog(`  Matched ${matchCount}/${sjrWords.length} SJR words (${(sjrOverlap*100).toFixed(0)}%), ${matchCount}/${searchWords.length} search words (${(searchOverlap*100).toFixed(0)}%)`);
					debugLog(`  Result: ${result}`);
					return result;
				}
			}
			debugLog(`No SJR word overlap match found (checked ${Object.keys(sjrRankings).length} entries)`);
							// If not found in journals, try CORE conference rankings (if enabled)
				if (Zotero.Prefs.get('extensions.sjr-core-rankings.enableCORE', true)) {
					debugLog(`Trying CORE rankings (enabled in preferences)`);
					var coreRank = MatchingUtils.matchCoreConference(normalizedTitle, enableDebug);
					if (coreRank) {
						debugLog(`✓ CORE MATCH: ${coreRank}`);
						return coreRank;
					}
					debugLog(`No CORE match found`);
				} else {
					debugLog(`CORE rankings disabled in preferences`);
				}
				
				debugLog(`✗ NO MATCH FOUND for "${publicationTitle}"`);
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
			var cleanedSearch = MatchingUtils.normalizeString(MatchingUtils.cleanConferenceTitle(normalizedTitle));
			for (var title in sjrRankings) {
				var cleanedSjr = MatchingUtils.normalizeString(title.split(',')[0].trim()); // Remove ", ACRONYM" part
				if (cleanedSjr === cleanedSearch && cleanedSjr.length > 10) {
					var sjrData = sjrRankings[title];
					displayValue = sjrData.quartile + " " + sjrData.sjr;
					return displayValue;
				}
			}
			
		// Try word overlap matching for SJR conference proceedings
		// This is aggressive, so use high threshold to avoid false positives
		var cleanedSearch = MatchingUtils.normalizeString(MatchingUtils.cleanConferenceTitle(normalizedTitle));
		var searchWords = cleanedSearch.split(' ').filter(function(w) { return w.length > 3; });
		
		for (var title in sjrRankings) {
			var cleanedSjr = MatchingUtils.normalizeString(title);
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
				var sjrData = sjrRankings[title];
				displayValue = sjrData.quartile + " " + sjrData.sjr;
				return displayValue;
			}
		}
					// If not found in journals, try CORE conference rankings (if enabled)
			if (Zotero.Prefs.get('extensions.sjr-core-rankings.enableCORE', true)) {
				var coreRank = MatchingUtils.matchCoreConference(normalizedTitle);
				if (coreRank) {
					return coreRank;
				}
			}
			
			return null;
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
				// Main function to update selected items with progress window
		updateSelectedItems: async function(window) {
			// Get ZoteroPane from the window context
			var ZoteroPane = window.ZoteroPane;
			
			if (!ZoteroPane) {
				Zotero.debug("SJR & CORE Rankings: ZoteroPane not available in this window");
				return;
			}
			
			var items = ZoteroPane.getSelectedItems();
			
			if (items.length === 0) {
				await Zotero.alert(window, "No items selected", "Please select some items in your Zotero library first.");
				return;
			}
			
			// Create progress window with proper configuration
			var progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
			progressWin.changeHeadline("Checking SJR & CORE Rankings");
			progressWin.show();
			
			var found = 0;
			var notFound = 0;
			var skipped = 0;
			var notFoundList = [];  // Track titles that weren't found
			
			try {
				// Create progress line using ItemProgress
				var progressIcon = 'chrome://zotero/skin/spinner-16px.png';
				var progressLine = new progressWin.ItemProgress(
					progressIcon,
					"Checking " + items.length + " item" + (items.length !== 1 ? "s" : "") + "..."
				);
				
				for (var i = 0; i < items.length; i++) {
					var item = items[i];
					
					// Update progress text every 10 items or on last item
					if (i % 10 === 0 || i === items.length - 1) {
						progressLine.setText("Processed " + (i + 1) + " of " + items.length + " items...");
						progressLine.setProgress(Math.round((i + 1) / items.length * 100));
					}
					
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
				
				// Mark the original line as complete
				progressLine.setText("Processing complete...");
				progressLine.setProgress(100);
				
				// Create a new line for the final results with success icon
				var successIcon = 'chrome://zotero/skin/tick.png';
				var resultsLine = new progressWin.ItemProgress(
					successIcon,
					"Complete! Found: " + found + " | Not found: " + notFound + " | Skipped: " + skipped
				);
				resultsLine.setProgress(100);
				
				// Start auto-close timer AFTER operation completes
				progressWin.startCloseTimer(4000);
				
				// Build detailed message for alert dialog
				var message = "Total selected: " + items.length + " item" + (items.length !== 1 ? "s" : "") + "\n" +
					   "Rankings found: " + found + " item" + (found !== 1 ? "s" : "") + "\n" +
					   "Not found: " + notFound + " item" + (notFound !== 1 ? "s" : "") + "\n" +
					   "Skipped: " + skipped + " item" + (skipped !== 1 ? "s" : "") + " (no publication title or not regular items)\n\n" +
					   "Rankings are displayed in the 'Ranking' column.\n" +
					   "Right-click the column headers to show/hide it.";
				
				// Show first 10 not found titles for debugging
				if (notFoundList.length > 0) {
					var displayCount = Math.min(10, notFoundList.length);
					message += "\n\nFirst " + displayCount + " not found title" + (displayCount !== 1 ? "s" : "") + ":";
					for (var j = 0; j < displayCount; j++) {
						message += "\n" + (j + 1) + ". " + notFoundList[j];
					}
				}
				
				await Zotero.alert(window, "Rankings Check Complete", message);
			} catch (e) {
				Zotero.debug("SJR & CORE Rankings: Error in updateSelectedItems: " + e);
				progressWin.close();
				throw e;
			}
		},
	
	// Debug matching for selected items - shows detailed matching algorithm output
	debugSelectedItems: async function(window) {
		var ZoteroPane = window.ZoteroPane;
		
		if (!ZoteroPane) {
			Zotero.debug("SJR & CORE Rankings: ZoteroPane not available");
			return;
		}
		
		var items = ZoteroPane.getSelectedItems();
		
		if (items.length === 0) {
			await Zotero.alert(window, "No items selected", "Please select one or more items to debug ranking matches.");
			return;
		}
		
		await Zotero.alert(
			window,
			"Debug Matching",
			`Debug matching will be logged for ${items.length} item${items.length !== 1 ? 's' : ''}.\n\n` +
			`Open Help → Debug Output Logging → View Output to see detailed matching information.\n\n` +
			`Look for lines starting with [MATCH DEBUG].`
		);
		
		// Process each item with debug logging enabled
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			
			if (!item.isRegularItem()) {
				continue;
			}
			
			// Call with debug enabled - this will log detailed matching info
			this.getRankingSync(item, true);
		}
		
		Zotero.debug("SJR & CORE Rankings: Debug matching complete");
	},
	
	// Set manual ranking for selected items
	setManualRankingDialog: async function(window) {
		var ZoteroPane = window.ZoteroPane;
		
		if (!ZoteroPane) {
			return;
		}
		
		var items = ZoteroPane.getSelectedItems();
		
		if (items.length === 0) {
			await Zotero.alert(window, "No items selected", "Please select one or more items to set manual ranking.");
			return;
		}
		
		// Get publication titles (ensure they're all the same for batch operations)
		var publicationTitles = new Set();
		for (var item of items) {
			if (!item.isRegularItem()) continue;
			
			var pubTitle = item.getField('publicationTitle') ||
						   item.getField('proceedingsTitle') ||
						   item.getField('conferenceName');
			if (pubTitle) {
				publicationTitles.add(pubTitle.trim());
			}
		}
		
		if (publicationTitles.size === 0) {
			await Zotero.alert(window, "No publication titles", "Selected items don't have publication titles.");
			return;
		}
		
		if (publicationTitles.size > 1) {
			await Zotero.alert(
				window,
				"Multiple publications",
				`Selected items have ${publicationTitles.size} different publication titles.\n\nPlease select items from the same publication to set a manual ranking.`
			);
			return;
		}
		
		var publicationTitle = Array.from(publicationTitles)[0];
		
		// Check if there's already a manual override
		var existingOverride = ManualOverrides.get(publicationTitle);
		var defaultValue = existingOverride || '';
		
		// Prompt for ranking using modern Services API
		var Services = globalThis.Services || ChromeUtils.import("resource://gre/modules/Services.jsm").Services;
		
		var input = { value: defaultValue };
		var result = Services.prompt.prompt(
			window,
			"Set Manual Ranking",
			`Set ranking for:\n"${publicationTitle}"\n\nExamples: A*, A, B, C, Q1, Q2, Q3, Q4, Au A, Nat A\n\nRanking:`,
			input,
			null,
			{}
		);
		
		if (result && input.value) {
			var ranking = input.value.trim();
			await ManualOverrides.set(publicationTitle, ranking);
			
			// Clear cache for affected items and refresh
			for (var item of items) {
				this.rankingCache.delete(item.id);
			}
			
			Zotero.Notifier.trigger('refresh', 'itemtree', []);
			
			await Zotero.alert(
				window,
				"Manual Ranking Set",
				`Set ranking for "${publicationTitle}":\n${ranking}\n\nThe ranking column will update automatically.`
			);
		}
	},
	
	// Clear manual ranking for selected items
	clearManualRankingForSelected: async function(window) {
		var ZoteroPane = window.ZoteroPane;
		
		if (!ZoteroPane) {
			return;
		}
		
		var items = ZoteroPane.getSelectedItems();
		
		if (items.length === 0) {
			await Zotero.alert(window, "No items selected", "Please select one or more items to clear manual ranking.");
			return;
		}
		
		var cleared = 0;
		var publicationTitles = new Set();
		
		for (var item of items) {
			if (!item.isRegularItem()) continue;
			
			var pubTitle = item.getField('publicationTitle') ||
						   item.getField('proceedingsTitle') ||
						   item.getField('conferenceName');
			if (pubTitle) {
				publicationTitles.add(pubTitle.trim());
			}
		}
		
		for (var title of publicationTitles) {
			if (ManualOverrides.get(title)) {
				await ManualOverrides.remove(title);
				cleared++;
			}
		}
		
		if (cleared > 0) {
			// Clear cache and refresh
			for (var item of items) {
				this.rankingCache.delete(item.id);
			}
			
			Zotero.Notifier.trigger('refresh', 'itemtree', []);
			
			await Zotero.alert(
				window,
				"Manual Rankings Cleared",
				`Cleared ${cleared} manual ranking${cleared !== 1 ? 's' : ''}.\n\nRankings will revert to automatic matching.`
			);
		} else {
			await Zotero.alert(
				window,
				"No Manual Rankings",
				"None of the selected items have manual ranking overrides."
			);
		}
	}
};
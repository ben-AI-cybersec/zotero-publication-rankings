/*
 * Publication Rankings Plugin for Zotero 7
 * Ranking Actions - User-triggered operations
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

/* global Zotero, RankingEngine, ManualOverrides, ColumnManager, Services, ChromeUtils */

/**
 * Ranking Actions - Handles all user-triggered operations
 * Bulk check, debug matching, manual overrides
 */
var RankingActions = {
	/**
	 * Update rankings for selected items with progress window
	 * 
	 * @param {Window} window - Zotero window
	 * 
	 * @example
	 * await RankingActions.updateSelectedItems(window);
	 */
	updateSelectedItems: async function(window) {
		// Get ZoteroPane from the window context
		var ZoteroPane = window.ZoteroPane;
		
		if (!ZoteroPane) {
			Zotero.debug("Publication Rankings: ZoteroPane not available in this window");
			return;
		}
		
		var items = ZoteroPane.getSelectedItems();
		
		if (items.length === 0) {
			await Zotero.alert(window, "No items selected", "Please select some items in your Zotero library first.");
			return;
		}
		
		// Create progress window with proper configuration
		var progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
		progressWin.changeHeadline("Checking Publication Rankings");
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
				
				var publicationTitle = RankingEngine.extractPublicationTitle(item);
				if (!publicationTitle) {
					skipped++;
					continue;
				}
				
				// Check if ranking can be found
				var ranking = RankingEngine.getRanking(item);
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
			Zotero.debug("Publication Rankings: Error in updateSelectedItems: " + e);
			progressWin.close();
			throw e;
		}
	},
	
	/**
	 * Debug matching for selected items - shows detailed matching algorithm output
	 * 
	 * @param {Window} window - Zotero window
	 * 
	 * @example
	 * await RankingActions.debugSelectedItems(window);
	 */
	debugSelectedItems: async function(window) {
		var ZoteroPane = window.ZoteroPane;
		
		if (!ZoteroPane) {
			Zotero.debug("Publication Rankings: ZoteroPane not available");
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
			RankingEngine.getRanking(item, true);
		}
		
		Zotero.debug("Publication Rankings: Debug matching complete");
	},
	
	/**
	 * Set manual ranking for selected items
	 * 
	 * @param {Window} window - Zotero window
	 * 
	 * @example
	 * await RankingActions.setManualRankingDialog(window);
	 */
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
			
			var pubTitle = RankingEngine.extractPublicationTitle(item);
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
				ColumnManager.clearCache(item.id);
			}
			
			Zotero.Notifier.trigger('refresh', 'itemtree', []);
			
			await Zotero.alert(
				window,
				"Manual Ranking Set",
				`Set ranking for "${publicationTitle}":\n${ranking}\n\nThe ranking column will update automatically.`
			);
		}
	},
	
	/**
	 * Clear manual ranking for selected items
	 * 
	 * @param {Window} window - Zotero window
	 * 
	 * @example
	 * await RankingActions.clearManualRankingForSelected(window);
	 */
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
			
			var pubTitle = RankingEngine.extractPublicationTitle(item);
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
				ColumnManager.clearCache(item.id);
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

/*
 * SJR & CORE Rankings Plugin for Zotero 7
 * Core Functionality - Main coordinator
 * 
 * Delegates to specialized modules:
 * - RankingEngine: Matching logic
 * - ColumnManager: Column registration and caching
 * - MenuManager: Menu creation and management
 * - WindowManager: Window lifecycle tracking
 * - RankingActions: User-triggered operations
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

/* global ZoteroPane, DatabaseRegistry, ManualOverrides, RankingEngine, ColumnManager, MenuManager, WindowManager, RankingActions */

// Declare as global variable (no 'var' inside if-block to avoid local scope)
if (typeof ZoteroRankings === 'undefined') {
	var ZoteroRankings;
}

ZoteroRankings = {
	id: null,
	version: null,
	rootURI: null,
	notifierID: null,
	debugModeObserverID: null,
	databaseObserverIDs: {},  // Store observer IDs for all database preferences
	
	// Initialize plugin - coordinate module initialization and register observers
	init: async function({ id, version, rootURI }) {
		this.id = id;
		this.version = version;
		this.rootURI = rootURI;
		
		// Initialize manual overrides from ManualOverrides module
		await ManualOverrides.load();
		
		// Initialize the database registry
		DatabaseRegistry.initialize();
		
		// Register custom column using ColumnManager
		await ColumnManager.register();
		
		// Register notifier to watch for new/modified items
		try {
			this.notifierID = Zotero.Notifier.registerObserver(this, ['item'], 'rankings');
		} catch (e) {
			Zotero.logError("SJR & CORE Rankings: Failed to register notifier: " + e);
		}
		
		// Register preference observers
		this.debugModeObserverID = registerPrefObserver('debugMode', this.handleDebugModeChange.bind(this));
		
		// Register observers for all database preferences
		this.registerDatabaseObservers();
		
		Zotero.debug("SJR & CORE Rankings initialized");
	},
	
	// Register preference observers for all databases with optional preferences
	registerDatabaseObservers: function() {
		var databases = DatabaseRegistry.getAllIds();
		
		for (var i = 0; i < databases.length; i++) {
			var dbId = databases[i];
			var db = DatabaseRegistry.getDatabase(dbId);
			
			// Only register observer if database has a preference key
			if (db.prefKey) {
				this.databaseObserverIDs[dbId] = registerPrefObserver(
					db.prefKey,
					(function(id) {
						return function(value) {
							this.handleDatabaseChange(id, value);
						}.bind(this);
					}.bind(this))(dbId)
				);
				Zotero.debug(`SJR & CORE Rankings: Registered observer for ${db.name} (${db.prefKey})`);
			}
		}
	},
	
	// Handle debugMode preference changes - update debug menu items in all windows
	handleDebugModeChange: function(value) {
		Zotero.debug(`SJR & CORE Rankings: Debug mode changed to ${value}`);
		
		// Update all windows
		var windows = Zotero.getMainWindows();
		for (let win of windows) {
			var doc = win.document;
			
			if (value) {
				// Add debug menu item
				MenuManager.addDebugMenuItem(doc, () => {
					this.debugSelectedItems(win);
				});
			} else {
				// Remove debug menu item
				MenuManager.removeDebugMenuItem(doc);
			}
		}
	},
	
	// Handle enableCORE preference changes - clear cache and refresh item trees
	handleDatabaseChange: function(dbId, value) {
		var db = DatabaseRegistry.getDatabase(dbId);
		if (!db) {
			Zotero.logError(`SJR & CORE Rankings: Unknown database ID: ${dbId}`);
			return;
		}
		
		Zotero.debug(`SJR & CORE Rankings: Database ${db.name} ${value ? 'enabled' : 'disabled'}`);
		
		// Clear the ranking cache so items are re-evaluated
		ColumnManager.clearAllCache();
		
		// Refresh all visible item trees to update rankings immediately
		var windows = Zotero.getMainWindows();
		for (let win of windows) {
			if (win.ZoteroPane && win.ZoteroPane.itemsView) {
				win.ZoteroPane.itemsView.refreshAndMaintainSelection();
				Zotero.debug("SJR & CORE Rankings: Item tree refreshed");
			}
		}
	},
	
	// Notifier callback - refresh item tree when items are added/modified (if autoUpdate enabled)
	notify: async function(event, type, ids, extraData) {
		// Check if auto-update is enabled
		if (!getPref('autoUpdate')) {
			return;
		}
		
		if (event !== 'add' && event !== 'modify') {
			return;
		}
		
		// Clear cache for modified items
		for (let id of ids) {
			ColumnManager.clearCache(id);
		}
		
		// Trigger refresh for affected items
		try {
			Zotero.Notifier.trigger('refresh', 'itemtree', []);
			Zotero.debug("SJR & CORE Rankings: Triggered item tree refresh and cache clear for " + ids.length + " items");
		}
		catch (e) {
			Zotero.logError("SJR & CORE Rankings: Error refreshing item tree: " + e);
		}
	},
	
	// Add plugin UI to all open Zotero windows
	addToAllWindows: function() {
		var windows = Zotero.getMainWindows();
		for (let win of windows) {
			this.addToWindow(win);
		}
	},
	
	// Add plugin UI to a specific window - delegate to WindowManager and MenuManager
	addToWindow: function(window) {
		// Avoid adding twice to the same window
		if (WindowManager.hasWindow(window)) {
			Zotero.debug("SJR & CORE Rankings: Window already has UI, skipping");
			return;
		}
		
		// Mark this window as processed
		WindowManager.trackWindow(window);
		
		// Add menus using MenuManager
		MenuManager.addToWindow(window, {
			onCheckRankings: () => this.updateSelectedItems(window),
			onDebugMatch: () => this.debugSelectedItems(window),
			onSetManual: () => this.setManualRankingDialog(window),
			onClearManual: () => this.clearManualRankingForSelected(window)
		});
	},
	
	// Remove plugin UI from all windows and cleanup
	removeFromAllWindows: function() {
		var windows = Zotero.getMainWindows();
		for (let win of windows) {
			this.removeFromWindow(win);
		}
		
		// Unregister the notifier
		if (this.notifierID) {
			Zotero.Notifier.unregisterObserver(this.notifierID);
		}
		
		// Unregister preference observers
		if (this.debugModeObserverID) {
			unregisterPrefObserver(this.debugModeObserverID);
		}
		
		// Unregister all database preference observers
		for (var dbId in this.databaseObserverIDs) {
			unregisterPrefObserver(this.databaseObserverIDs[dbId]);
		}
		this.databaseObserverIDs = {};
		
		// Unregister the custom column
		ColumnManager.unregister();
		
		// Clear all tracked windows
		WindowManager.clearAll();
	},
	
	// Remove plugin UI from a specific window - delegate to WindowManager and MenuManager
	removeFromWindow: function(window) {
		if (!WindowManager.hasWindow(window)) {
			return;
		}
		
		WindowManager.untrackWindow(window);
		
		// Remove menus using MenuManager
		MenuManager.removeFromWindow(window);
	},
	
	// Get ranking for an item (synchronous) - used by ColumnManager's dataProvider
	getRankingSync: function(item, enableDebug = false) {
		return RankingEngine.getRanking(item, enableDebug);
	},
	
	// Get ranking for an item (async wrapper for backwards compatibility)
	getRankingForItem: async function(item) {
		return RankingEngine.getRanking(item, false);
	},
	
	// User action delegates to RankingActions module
	updateSelectedItems: async function(window) {
		return RankingActions.updateSelectedItems(window);
	},
	
	debugSelectedItems: async function(window) {
		return RankingActions.debugSelectedItems(window);
	},
	
	setManualRankingDialog: async function(window) {
		return RankingActions.setManualRankingDialog(window);
	},
	
	clearManualRankingForSelected: async function(window) {
		return RankingActions.clearManualRankingForSelected(window);
	}
};
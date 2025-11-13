/*
 * Publication Rankings - Lifecycle Hooks Module
 * Clean separation of plugin lifecycle event handling
 * 
 * Copyright (C) 2025 Ben Stephens
 * Licensed under GNU General Public License v3.0 (GPLv3)
 * 
 * This module provides a clean interface for plugin lifecycle events,
 * following the pattern from zotero-citation-tally and modern Zotero 7 plugins.
 * 
 * Benefits:
 * - bootstrap.js becomes a simple dispatcher
 * - Clear separation of concerns
 * - Standard pattern across Zotero plugins
 * - Easier to maintain and test
 */

/* global Zotero, ZoteroRankings, ManualOverrides, Services */

var Hooks = {
	/**
	 * Plugin startup - called when extension is loaded
	 * 
	 * @param {Object} params - Startup parameters
	 * @param {string} params.id - Extension ID
	 * @param {string} params.version - Extension version
	 * @param {string} params.rootURI - Root URI of the extension
	 */
	async onStartup({ id, version, rootURI }) {
		Zotero.debug("========================================");
		Zotero.debug(`Publication Rankings: Startup - Version ${version}`);
		Zotero.debug("========================================");
		
		// Register preference pane using official Zotero 7 API
		Zotero.debug("Publication Rankings: Registering preference pane");
		Zotero.PreferencePanes.register({
			pluginID: 'publication-rankings@zotero.org',
			src: rootURI + 'preferences.xhtml',
			label: 'Rankings'
		});
		
		// Attach plugin to Zotero object for global access
		if (!Zotero.SJRCoreRankings) {
			Zotero.SJRCoreRankings = ZoteroRankings;
		}
		
		// Initialize the plugin
		Zotero.debug("Publication Rankings: Initializing plugin");
		await Zotero.SJRCoreRankings.init({ id, version, rootURI });
		
		// Add UI to all existing windows
		Zotero.debug("Publication Rankings: Adding UI to existing windows");
		Zotero.SJRCoreRankings.addToAllWindows();
		
		Zotero.debug("Publication Rankings: Startup complete");
	},
	
	/**
	 * Plugin shutdown - called when extension is being disabled/uninstalled
	 * 
	 * @param {Object} params - Shutdown parameters
	 * @param {string} params.id - Extension ID
	 * @param {string} params.version - Extension version
	 * @param {string} params.rootURI - Root URI of the extension
	 * @param {number} reason - Shutdown reason constant
	 */
	onShutdown({ id, version, rootURI }, reason) {
		// Skip cleanup on app shutdown for better performance
		// APP_SHUTDOWN is a global constant from bootstrap context
		if (reason === APP_SHUTDOWN) {
			return;
		}
		
		Zotero.debug("Publication Rankings: Shutting down plugin");
		
		if (Zotero.SJRCoreRankings) {
			// Remove UI from all windows and clean up observers
			Zotero.SJRCoreRankings.removeFromAllWindows();
			
			// Remove global reference
			delete Zotero.SJRCoreRankings;
		}
		
		Zotero.debug("Publication Rankings: Shutdown complete");
	},
	
	/**
	 * Main window load - called when a Zotero window is opened
	 * 
	 * @param {Object} params - Window parameters
	 * @param {Window} params.window - The window being loaded
	 */
	onMainWindowLoad({ window }) {
		Zotero.debug("Publication Rankings: Main window loading");
		Zotero.SJRCoreRankings?.addToWindow(window);
	},
	
	/**
	 * Main window unload - called when a Zotero window is closed
	 * 
	 * @param {Object} params - Window parameters
	 * @param {Window} params.window - The window being unloaded
	 */
	onMainWindowUnload({ window }) {
		Zotero.debug("Publication Rankings: Main window unloading");
		Zotero.SJRCoreRankings?.removeFromWindow(window);
	}
};

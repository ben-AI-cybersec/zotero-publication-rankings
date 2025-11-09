/*
 * SJR & CORE Rankings Plugin for Zotero 7
 * Bootstrap - Plugin lifecycle dispatcher
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
 * 
 * This file is a simple dispatcher that delegates all lifecycle events
 * to the Hooks module for cleaner architecture and better separation
 * of concerns.
 */

/* global Services, Components, Hooks, Zotero */
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

/**
 * Load all plugin modules in dependency order
 * Modules are organized in src/ directories but loaded from root of XPI
 * 
 * @param {string} rootURI - Root URI of the extension
 */
function loadModules(rootURI) {
	const modules = [
		// Data files
		'data.js',                // Rankings data (from src/data/)
		
		// Core utilities
		'prefs-utils.js',         // Preference utilities (from src/core/)
		
		// Engine components
		'matching.js',            // Matching algorithms (from src/engine/)
		
		// Actions
		'overrides.js',           // Manual overrides (from src/actions/)
		
		// UI utilities
		'ui-utils.js',            // UI utilities (from src/ui/)
		
		// Database system
		'database-registry.js',   // Database plugin system (from src/databases/)
		'database-sjr.js',        // SJR database plugin (from src/databases/)
		'database-core.js',       // CORE database plugin (from src/databases/)
		
		// Engine
		'ranking-engine.js',      // Core ranking logic (from src/engine/)
		
		// UI components
		'column-manager.js',      // Column registration (from src/ui/)
		'menu-manager.js',        // Menu management (from src/ui/)
		'window-manager.js',      // Window tracking (from src/ui/)
		
		// Actions
		'ranking-actions.js',     // User actions (from src/actions/)
		
		// Core coordinator
		'rankings.js',            // Main coordinator (from src/core/)
		
		// Lifecycle
		'hooks.js'                // Lifecycle hooks (from src/core/)
	];
	
	for (const module of modules) {
		Services.scriptloader.loadSubScript(rootURI + module);
		Zotero.debug(`SJR & CORE Rankings: Loaded ${module}`);
	}
}

/**
 * Bootstrap install hook - called when extension is installed or updated
 * Note: Modules are NOT loaded yet at this point, so we can't delegate to Hooks
 * 
 * @param {Object} data - Installation data
 * @param {number} reason - Installation reason constant
 */
function install(data, reason) {
	// Nothing to do on install - modules aren't loaded yet
	// All initialization happens in startup()
}

/**
 * Bootstrap startup hook - called when extension is loaded
 * 
 * @param {Object} params - Startup parameters
 * @param {string} params.id - Extension ID
 * @param {string} params.version - Extension version
 * @param {string} params.rootURI - Root URI of the extension
 */
async function startup({ id, version, rootURI }) {
	loadModules(rootURI);
	await Hooks.onStartup({ id, version, rootURI });
}

/**
 * Bootstrap window load hook - called when a Zotero window opens
 * 
 * @param {Object} params - Window parameters
 * @param {Window} params.window - The window being loaded
 */
function onMainWindowLoad({ window }) {
	Hooks.onMainWindowLoad({ window });
}

/**
 * Bootstrap window unload hook - called when a Zotero window closes
 * 
 * @param {Object} params - Window parameters
 * @param {Window} params.window - The window being unloaded
 */
function onMainWindowUnload({ window }) {
	Hooks.onMainWindowUnload({ window });
}

/**
 * Bootstrap shutdown hook - called when extension is being disabled
 * 
 * @param {Object} params - Shutdown parameters
 * @param {string} params.id - Extension ID
 * @param {string} params.version - Extension version
 * @param {string} params.rootURI - Root URI of the extension
 * @param {number} reason - Shutdown reason constant
 */
function shutdown({ id, version, rootURI }, reason) {
	Hooks.onShutdown({ id, version, rootURI }, reason);
}

/**
 * Bootstrap uninstall hook - called when extension is uninstalled
 * Note: Modules may not be loaded at this point
 * 
 * @param {Object} data - Uninstallation data
 * @param {number} reason - Uninstallation reason constant
 */
function uninstall(data, reason) {
	// Nothing to do on uninstall - Zotero handles cleanup
	// Preferences are preserved unless user explicitly clears them
}

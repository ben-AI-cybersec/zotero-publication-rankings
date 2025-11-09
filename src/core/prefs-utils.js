/*
 * SJR & CORE Rankings - Preference Utilities
 * Wrapper functions for consistent preference access
 * 
 * Copyright (C) 2025 Ben Stephens
 * Licensed under GNU General Public License v3.0 (GPLv3)
 * 
 * This module provides simplified wrappers around Zotero.Prefs API to:
 * - Eliminate repetitive prefix concatenation
 * - Ensure consistent use of the 'true' parameter for global prefs
 * - Make preference access more maintainable (DRY principle)
 */

/**
 * Preference key prefix for this plugin
 * All preferences are stored under this namespace
 */
const PREFS_PREFIX = 'extensions.sjr-core-rankings';

/**
 * Get a preference value
 * 
 * @param {string} key - Preference key (without prefix)
 * @returns {*} The preference value
 * 
 * @example
 * getPref('autoUpdate')  // Returns: true/false
 * getPref('manualOverrides')  // Returns: "{...}" (JSON string)
 */
function getPref(key) {
	return Zotero.Prefs.get(`${PREFS_PREFIX}.${key}`, true);
}

/**
 * Set a preference value
 * 
 * @param {string} key - Preference key (without prefix)
 * @param {*} value - The value to set
 * @returns {void}
 * 
 * @example
 * setPref('autoUpdate', false)
 * setPref('manualOverrides', '{}')
 */
function setPref(key, value) {
	return Zotero.Prefs.set(`${PREFS_PREFIX}.${key}`, value, true);
}

/**
 * Register a preference observer
 * 
 * @param {string} key - Preference key to observe (without prefix)
 * @param {Function} callback - Callback function to execute when preference changes
 * @returns {string} Observer ID (for later unregistration)
 * 
 * @example
 * const observerID = registerPrefObserver('debugMode', (value) => {
 *     console.log('Debug mode changed to:', value);
 * });
 */
function registerPrefObserver(key, callback) {
	return Zotero.Prefs.registerObserver(`${PREFS_PREFIX}.${key}`, callback, true);
}

/**
 * Unregister a preference observer
 * 
 * @param {string} observerID - Observer ID returned from registerPrefObserver
 * @returns {void}
 * 
 * @example
 * unregisterPrefObserver(observerID);
 */
function unregisterPrefObserver(observerID) {
	return Zotero.Prefs.unregisterObserver(observerID);
}

/**
 * Clear a preference (reset to default)
 * 
 * @param {string} key - Preference key to clear (without prefix)
 * @returns {void}
 * 
 * @example
 * clearPref('manualOverrides')  // Resets to default value from prefs.js
 */
function clearPref(key) {
	return Zotero.Prefs.clear(`${PREFS_PREFIX}.${key}`, true);
}

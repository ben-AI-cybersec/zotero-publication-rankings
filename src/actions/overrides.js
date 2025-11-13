/*
 * Publication Rankings - Manual Overrides Module
 * Manages user-defined manual ranking overrides with persistent storage
 * 
 * Copyright (C) 2025 Ben Stephens
 * Licensed under GNU General Public License v3.0 (GPLv3)
 */

/* global Zotero, getPref, setPref */

var ManualOverrides = {
	/**
	 * In-memory cache of manual overrides
	 * @type {Map<string, string>}
	 */
	overrides: new Map(),
	
	/**
	 * Load manual overrides from Zotero preferences
	 * Called during plugin initialization
	 * 
	 * @returns {Promise<void>}
	 */
	load: async function() {
		try {
			const data = getPref('manualOverrides') || '{}';
			
			const trimmedData = data.trim();
			if (!trimmedData || trimmedData === '{}') {
				Zotero.debug("Publication Rankings: No manual overrides data, initializing empty");
				this.overrides = new Map();
				return;
			}
			
			const parsed = JSON.parse(trimmedData);
			this.overrides = new Map(Object.entries(parsed));
			Zotero.debug(`Publication Rankings: Loaded ${this.overrides.size} manual overrides`);
			Zotero.debug(`Publication Rankings: Raw data: ${data}`);
		} catch (e) {
			Zotero.logError("Publication Rankings: Error loading manual overrides: " + e);
			this.overrides = new Map();
			setPref('manualOverrides', '{}');
		}
	},
	
	/**
	 * Save manual overrides to Zotero preferences
	 * Persists the in-memory cache to preferences storage
	 * 
	 * @returns {Promise<void>}
	 */
	save: async function() {
		try {
			const obj = Object.fromEntries(this.overrides);
			const jsonString = JSON.stringify(obj);
			setPref('manualOverrides', jsonString);
			Zotero.debug(`Publication Rankings: Saved ${this.overrides.size} manual overrides`);
			Zotero.debug(`Publication Rankings: Saved data: ${jsonString}`);
		} catch (e) {
			Zotero.logError("Publication Rankings: Error saving manual overrides: " + e);
		}
	},
	
	/**
	 * Set a manual override for a publication
	 * 
	 * @param {string} publicationTitle - The publication title
	 * @param {string} ranking - The ranking to set (e.g., "A*", "Q1", "B")
	 * @returns {Promise<void>}
	 */
	set: async function(publicationTitle, ranking) {
		const normalizedTitle = publicationTitle.toLowerCase().trim();
		this.overrides.set(normalizedTitle, ranking);
		await this.save();
		Zotero.debug(`Publication Rankings: Set manual override for "${publicationTitle}" -> "${ranking}"`);
	},
	
	/**
	 * Remove a manual override for a publication
	 * 
	 * @param {string} publicationTitle - The publication title
	 * @returns {Promise<void>}
	 */
	remove: async function(publicationTitle) {
		const normalizedTitle = publicationTitle.toLowerCase().trim();
		this.overrides.delete(normalizedTitle);
		await this.save();
		Zotero.debug(`Publication Rankings: Removed manual override for "${publicationTitle}"`);
	},
	
	/**
	 * Get a manual override if it exists
	 * 
	 * @param {string} publicationTitle - The publication title
	 * @returns {string|undefined} The ranking if override exists, undefined otherwise
	 */
	get: function(publicationTitle) {
		const normalizedTitle = publicationTitle.toLowerCase().trim();
		return this.overrides.get(normalizedTitle);
	},
	
	/**
	 * Check if a manual override exists for a publication
	 * 
	 * @param {string} publicationTitle - The publication title
	 * @returns {boolean} True if override exists, false otherwise
	 */
	has: function(publicationTitle) {
		const normalizedTitle = publicationTitle.toLowerCase().trim();
		return this.overrides.has(normalizedTitle);
	},
	
	/**
	 * Get the total number of manual overrides
	 * 
	 * @returns {number} Count of overrides
	 */
	count: function() {
		return this.overrides.size;
	},
	
	/**
	 * Clear all manual overrides
	 * 
	 * @returns {Promise<void>}
	 */
	clearAll: async function() {
		this.overrides.clear();
		await this.save();
		Zotero.debug("Publication Rankings: Cleared all manual overrides");
	}
};

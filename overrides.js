/*
 * SJR & CORE Rankings - Manual Overrides Module
 * Manages user-defined manual ranking overrides with persistent storage
 * 
 * Copyright (C) 2025 Ben Stephens
 * Licensed under GNU GPL v3
 */

/* global Zotero */

var ManualOverrides = {
	// In-memory storage
	overrides: new Map(),
	
	/**
	 * Load manual overrides from Zotero preferences
	 */
	load: async function() {
		try {
			const data = Zotero.Prefs.get('extensions.sjr-core-rankings.manualOverrides', '{}');
			const parsed = JSON.parse(data);
			this.overrides = new Map(Object.entries(parsed));
			Zotero.debug(`SJR & CORE Rankings: Loaded ${this.overrides.size} manual overrides`);
		} catch (e) {
			Zotero.logError("SJR & CORE Rankings: Error loading manual overrides: " + e);
			this.overrides = new Map();
		}
	},
	
	/**
	 * Save manual overrides to Zotero preferences
	 */
	save: async function() {
		try {
			const obj = Object.fromEntries(this.overrides);
			Zotero.Prefs.set('extensions.sjr-core-rankings.manualOverrides', JSON.stringify(obj));
			Zotero.debug(`SJR & CORE Rankings: Saved ${this.overrides.size} manual overrides`);
		} catch (e) {
			Zotero.logError("SJR & CORE Rankings: Error saving manual overrides: " + e);
		}
	},
	
	/**
	 * Set a manual override for a publication
	 * @param {string} publicationTitle - The publication title
	 * @param {string} ranking - The ranking to set (e.g., "A*", "Q1")
	 */
	set: async function(publicationTitle, ranking) {
		const normalizedTitle = publicationTitle.toLowerCase().trim();
		this.overrides.set(normalizedTitle, ranking);
		await this.save();
		Zotero.debug(`SJR & CORE Rankings: Set manual override for "${publicationTitle}" -> "${ranking}"`);
	},
	
	/**
	 * Remove a manual override
	 * @param {string} publicationTitle - The publication title
	 */
	remove: async function(publicationTitle) {
		const normalizedTitle = publicationTitle.toLowerCase().trim();
		this.overrides.delete(normalizedTitle);
		await this.save();
		Zotero.debug(`SJR & CORE Rankings: Removed manual override for "${publicationTitle}"`);
	},
	
	/**
	 * Get a manual override if it exists
	 * @param {string} publicationTitle - The publication title
	 * @returns {string|undefined} The ranking if override exists, undefined otherwise
	 */
	get: function(publicationTitle) {
		const normalizedTitle = publicationTitle.toLowerCase().trim();
		return this.overrides.get(normalizedTitle);
	},
	
	/**
	 * Check if a manual override exists for a publication
	 * @param {string} publicationTitle - The publication title
	 * @returns {boolean} True if override exists
	 */
	has: function(publicationTitle) {
		const normalizedTitle = publicationTitle.toLowerCase().trim();
		return this.overrides.has(normalizedTitle);
	},
	
	/**
	 * Get the total number of manual overrides
	 * @returns {number} Count of overrides
	 */
	count: function() {
		return this.overrides.size;
	},
	
	/**
	 * Clear all manual overrides
	 */
	clearAll: async function() {
		this.overrides.clear();
		await this.save();
		Zotero.debug("SJR & CORE Rankings: Cleared all manual overrides");
	}
};

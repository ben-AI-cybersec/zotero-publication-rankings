/*
 * SJR & CORE Rankings Plugin for Zotero 7
 * Window Manager - Window lifecycle tracking
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

/* global Zotero */

/**
 * Window Manager - Tracks Zotero windows and manages UI lifecycle
 * Simple, focused module for window state management
 */
var WindowManager = {
	windows: new Set(),
	
	/**
	 * Track a window as having plugin UI
	 * 
	 * @param {Window} window - Window to track
	 * 
	 * @example
	 * WindowManager.trackWindow(window);
	 */
	trackWindow: function(window) {
		this.windows.add(window);
		Zotero.debug(`SJR & CORE Rankings: Tracking window (${this.windows.size} total)`);
	},
	
	/**
	 * Stop tracking a window
	 * 
	 * @param {Window} window - Window to untrack
	 * 
	 * @example
	 * WindowManager.untrackWindow(window);
	 */
	untrackWindow: function(window) {
		this.windows.delete(window);
		Zotero.debug(`SJR & CORE Rankings: Untracked window (${this.windows.size} remaining)`);
	},
	
	/**
	 * Check if a window is already tracked
	 * 
	 * @param {Window} window - Window to check
	 * @returns {boolean} True if window is tracked
	 * 
	 * @example
	 * if (!WindowManager.hasWindow(window)) {
	 *   // Add UI to window
	 * }
	 */
	hasWindow: function(window) {
		return this.windows.has(window);
	},
	
	/**
	 * Get all tracked windows
	 * 
	 * @returns {Set<Window>} Set of tracked windows
	 * 
	 * @example
	 * for (let window of WindowManager.getAllWindows()) {
	 *   // Update UI in window
	 * }
	 */
	getAllWindows: function() {
		return this.windows;
	},
	
	/**
	 * Get count of tracked windows
	 * 
	 * @returns {number} Number of tracked windows
	 * 
	 * @example
	 * var count = WindowManager.getWindowCount();
	 */
	getWindowCount: function() {
		return this.windows.size;
	},
	
	/**
	 * Clear all tracked windows
	 * Used during cleanup/shutdown
	 * 
	 * @example
	 * WindowManager.clearAll();
	 */
	clearAll: function() {
		Zotero.debug(`SJR & CORE Rankings: Clearing ${this.windows.size} tracked windows`);
		this.windows.clear();
	}
};

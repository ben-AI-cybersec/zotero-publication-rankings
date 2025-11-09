/*
 * SJR & CORE Rankings Plugin for Zotero 7
 * Menu Manager - UI menu creation and management
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

/* global Zotero, getPref */

/**
 * Menu Manager - Handles all UI menu creation and management
 * Modular design makes it easy to add new menu items
 */
var MenuManager = {
	/**
	 * Add UI elements to a window
	 * 
	 * @param {Window} window - The window to add menus to
	 * @param {Object} handlers - Command handler callbacks
	 * @param {Function} handlers.onCheckRankings - Handler for "Check Rankings"
	 * @param {Function} handlers.onDebugMatch - Handler for "Debug Match"
	 * @param {Function} handlers.onSetManual - Handler for "Set Manual Ranking"
	 * @param {Function} handlers.onClearManual - Handler for "Clear Manual Ranking"
	 * 
	 * @example
	 * MenuManager.addToWindow(window, {
	 *   onCheckRankings: () => { ... },
	 *   onDebugMatch: () => { ... },
	 *   onSetManual: () => { ... },
	 *   onClearManual: () => { ... }
	 * });
	 */
	addToWindow: function(window, handlers) {
		var doc = window.document;
		
		Zotero.debug("SJR & CORE Rankings: Adding menu to window");
		
		// Wait for document to be ready
		if (doc.readyState !== 'complete') {
			Zotero.debug("SJR & CORE Rankings: Document not ready, waiting...");
			window.addEventListener('load', () => {
				this.addToWindow(window, handlers);
			}, { once: true });
			return;
		}
		
		// Add to Tools menu
		this.addToolsMenuItems(doc, handlers);
		
		// Add to item context menu (right-click)
		this.addContextMenuItems(doc, handlers);
	},
	
	/**
	 * Remove UI elements from a window
	 * 
	 * @param {Window} window - The window to remove menus from
	 * 
	 * @example
	 * MenuManager.removeFromWindow(window);
	 */
	removeFromWindow: function(window) {
		var doc = window.document;
		
		// Remove Tools menu items
		this.removeElement(doc, 'zotero-rankings-update');
		this.removeElement(doc, 'zotero-rankings-separator');
		
		// Remove context menu items
		this.removeElement(doc, 'zotero-rankings-context-update');
		this.removeElement(doc, 'zotero-rankings-context-debug');
		this.removeElement(doc, 'zotero-rankings-context-manual');
		this.removeElement(doc, 'zotero-rankings-context-clear');
		this.removeElement(doc, 'zotero-rankings-context-separator');
	},
	
	/**
	 * Add menu items to the Tools menu
	 * 
	 * @param {Document} doc - Document object
	 * @param {Object} handlers - Command handlers
	 * @private
	 */
	addToolsMenuItems: function(doc, handlers) {
		var toolsMenu = doc.getElementById('menu_ToolsPopup');
		if (!toolsMenu) {
			Zotero.debug("SJR & CORE Rankings: Tools menu not found");
			return;
		}
		
		// Add separator before our items for visual grouping
		var separator = doc.createXULElement('menuseparator');
		separator.id = 'zotero-rankings-separator';
		toolsMenu.appendChild(separator);
		
		// Create "Check SJR & CORE Rankings" menu item
		var menuItem = doc.createXULElement('menuitem');
		menuItem.id = 'zotero-rankings-update';
		menuItem.setAttribute('label', 'Check SJR & CORE Rankings');
		menuItem.addEventListener('command', handlers.onCheckRankings);
		toolsMenu.appendChild(menuItem);
		
		Zotero.debug("SJR & CORE Rankings: Menu item added to Tools menu");
	},
	
	/**
	 * Add menu items to the item context menu (right-click)
	 * 
	 * @param {Document} doc - Document object
	 * @param {Object} handlers - Command handlers
	 * @private
	 */
	addContextMenuItems: function(doc, handlers) {
		var contextMenu = doc.getElementById('zotero-itemmenu');
		if (!contextMenu) {
			Zotero.debug("SJR & CORE Rankings: Context menu not found");
			return;
		}
		
		// Add separator
		var separator = doc.createXULElement('menuseparator');
		separator.id = 'zotero-rankings-context-separator';
		contextMenu.appendChild(separator);
		
		// Define menu items to add (modular structure for easy additions)
		var menuItems = [
			{
				id: 'zotero-rankings-context-update',
				label: 'Check SJR & CORE Rankings',
				handler: handlers.onCheckRankings,
				condition: () => true  // Always show
			},
			{
				id: 'zotero-rankings-context-debug',
				label: 'Debug Ranking Match',
				handler: handlers.onDebugMatch,
				condition: () => getPref('debugMode')  // Only show if debug mode enabled
			},
			{
				id: 'zotero-rankings-context-manual',
				label: 'Set Manual Ranking...',
				handler: handlers.onSetManual,
				condition: () => true  // Always show
			},
			{
				id: 'zotero-rankings-context-clear',
				label: 'Clear Manual Ranking',
				handler: handlers.onClearManual,
				condition: () => true  // Always show
			}
		];
		
		// Create and add menu items
		for (let item of menuItems) {
			if (item.condition()) {
				let menuItem = this.createMenuItem(doc, item.id, item.label, item.handler);
				contextMenu.appendChild(menuItem);
			}
		}
		
		Zotero.debug("SJR & CORE Rankings: Context menu items added");
	},
	
	/**
	 * Create a menu item element
	 * 
	 * @param {Document} doc - Document object
	 * @param {string} id - Element ID
	 * @param {string} label - Menu item label
	 * @param {Function} handler - Command handler function
	 * @returns {Element} Menu item element
	 * @private
	 */
	createMenuItem: function(doc, id, label, handler) {
		var menuItem = doc.createXULElement('menuitem');
		menuItem.id = id;
		menuItem.setAttribute('label', label);
		menuItem.addEventListener('command', handler);
		return menuItem;
	},
	
	/**
	 * Add debug menu item dynamically (when debug mode is enabled)
	 * 
	 * @param {Document} doc - Document object
	 * @param {Function} handler - Debug command handler
	 * 
	 * @example
	 * MenuManager.addDebugMenuItem(doc, () => { ... });
	 */
	addDebugMenuItem: function(doc, handler) {
		var contextMenu = doc.getElementById('zotero-itemmenu');
		if (!contextMenu) {
			return;
		}
		
		// Don't add if already exists
		if (doc.getElementById('zotero-rankings-context-debug')) {
			return;
		}
		
		// Create debug menu item
		var debugMenuItem = this.createMenuItem(
			doc,
			'zotero-rankings-context-debug',
			'Debug Ranking Match',
			handler
		);
		
		// Insert after "Check Rankings" item
		var contextMenuItem = doc.getElementById('zotero-rankings-context-update');
		if (contextMenuItem && contextMenuItem.nextSibling) {
			contextMenu.insertBefore(debugMenuItem, contextMenuItem.nextSibling);
		} else if (contextMenuItem) {
			contextMenu.appendChild(debugMenuItem);
		}
		
		Zotero.debug("SJR & CORE Rankings: Debug menu item added");
	},
	
	/**
	 * Remove debug menu item (when debug mode is disabled)
	 * 
	 * @param {Document} doc - Document object
	 * 
	 * @example
	 * MenuManager.removeDebugMenuItem(doc);
	 */
	removeDebugMenuItem: function(doc) {
		this.removeElement(doc, 'zotero-rankings-context-debug');
		Zotero.debug("SJR & CORE Rankings: Debug menu item removed");
	},
	
	/**
	 * Helper to remove an element by ID
	 * 
	 * @param {Document} doc - Document object
	 * @param {string} id - Element ID to remove
	 * @private
	 */
	removeElement: function(doc, id) {
		var element = doc.getElementById(id);
		if (element) {
			element.remove();
		}
	}
};

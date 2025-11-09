/**
 * Database Registry Module
 * 
 * Central registry for all ranking databases (SJR, CORE, and future additions).
 * Provides a uniform interface for database plugins, making the system extensible.
 * 
 * Each database registers with a configuration:
 * - id: Unique identifier
 * - name: Display name
 * - prefKey: Preference key (null = always enabled)
 * - priority: Lower numbers checked first (0 = highest priority)
 * - matcher: Function(title, debugLog) that returns ranking or null
 */

var DatabaseRegistry = {
	/**
	 * Map of database ID to configuration
	 * @type {Map<string, Object>}
	 */
	databases: new Map(),

	/**
	 * Register a ranking database
	 * 
	 * @param {Object} config - Database configuration
	 * @param {string} config.id - Unique database identifier (e.g., 'sjr', 'core')
	 * @param {string} config.name - Display name (e.g., 'SCImago Journal Rankings')
	 * @param {string|null} config.prefKey - Preference key to enable/disable (null = always enabled)
	 * @param {number} config.priority - Priority order (lower = checked first, 0 = highest)
	 * @param {Function} config.matcher - Matching function(title, debugLog) returns ranking or null
	 */
	register: function(config) {
		if (!config.id || !config.name || !config.matcher) {
			throw new Error('Database registration requires id, name, and matcher');
		}

		if (this.databases.has(config.id)) {
			Zotero.debug(`SJR & CORE Rankings: Overwriting database registration for '${config.id}'`);
		}

		// Store the database configuration
		this.databases.set(config.id, {
			id: config.id,
			name: config.name,
			prefKey: config.prefKey || null,
			priority: config.priority || 999,
			matcher: config.matcher
		});

		Zotero.debug(`SJR & CORE Rankings: Registered database '${config.name}' (priority ${config.priority || 999})`);
	},

	/**
	 * Get all enabled databases sorted by priority
	 * 
	 * @returns {Array<Object>} Array of enabled database configs, sorted by priority (low to high)
	 */
	getEnabledDatabases: function() {
		var enabled = [];
		
		for (var db of this.databases.values()) {
			// Include if no preference key (always enabled) or preference is true
			if (db.prefKey === null || getPref(db.prefKey)) {
				enabled.push(db);
			}
		}

		// Sort by priority (lower numbers first)
		enabled.sort(function(a, b) {
			return a.priority - b.priority;
		});

		return enabled;
	},

	/**
	 * Check if a specific database is enabled
	 * 
	 * @param {string} dbId - Database ID
	 * @returns {boolean} True if database is registered and enabled
	 */
	isEnabled: function(dbId) {
		var db = this.databases.get(dbId);
		if (!db) {
			return false;
		}
		return db.prefKey === null || getPref(db.prefKey);
	},

	/**
	 * Get database configuration by ID
	 * 
	 * @param {string} dbId - Database ID
	 * @returns {Object|null} Database configuration or null if not found
	 */
	getDatabase: function(dbId) {
		return this.databases.get(dbId) || null;
	},

	/**
	 * Get all registered database IDs
	 * 
	 * @returns {Array<string>} Array of database IDs
	 */
	getAllIds: function() {
		return Array.from(this.databases.keys());
	},

	/**
	 * Clear all registered databases (mainly for testing)
	 */
	clear: function() {
		this.databases.clear();
		Zotero.debug('SJR & CORE Rankings: Database registry cleared');
	},

	/**
	 * Initialize the database registry
	 * This is called during plugin startup and can be extended
	 * if databases need initialization logic
	 */
	initialize: function() {
		Zotero.debug('SJR & CORE Rankings: Database registry initialized');
		Zotero.debug(`SJR & CORE Rankings: ${this.databases.size} databases registered`);
	}
};

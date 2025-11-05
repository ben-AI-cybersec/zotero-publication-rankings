/* global Services, Components */
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

function log(msg) {
	Zotero.debug("SJR & CORE Rankings: " + msg);
}

/**
 * Called when the extension is installed or updated
 */
function install(data, reason) {
	log("Installing plugin");
}

/**
 * Called when the extension is started
 */
async function startup({ id, version, rootURI }) {
	log("========================================");
	log("STARTUP CALLED - Version: " + version);
	log("========================================");
	
	// Set default preferences if not already set
	if (Zotero.Prefs.get('extensions.sjr-core-rankings.autoUpdate') === undefined) {
		Zotero.Prefs.set('extensions.sjr-core-rankings.autoUpdate', true);
	}
	
	// Set CORE database preference (enabled by default)
	if (Zotero.Prefs.get('extensions.sjr-core-rankings.enableCORE') === undefined) {
		Zotero.Prefs.set('extensions.sjr-core-rankings.enableCORE', true);
	}
	
	log("Preferences set");
	
	// Register preference pane using official Zotero 7 API
	log("Registering preference pane");
	Zotero.PreferencePanes.register({
		pluginID: 'sjr-core-rankings@zotero.org',
		src: rootURI + 'preferences.xhtml',
		label: 'Rankings'
	});
	log("Preference pane registered");
	
	// Create context for scripts
	const ctx = { rootURI, id, version };
	ctx._globalThis = ctx;
	
	// Load the ranking data and code with context (files are in root of XPI)
	log("rootURI: " + rootURI);
	log("Loading data.js from: " + rootURI + 'data.js');
	
	Services.scriptloader.loadSubScript(rootURI + 'data.js', ctx);
	log("data.js loaded successfully");
	
	Services.scriptloader.loadSubScript(rootURI + 'rankings.js', ctx);
	log("rankings.js loaded successfully");
	
	// Attach to Zotero object for global access
	if (!Zotero.SJRCoreRankings) {
		Zotero.SJRCoreRankings = ctx.ZoteroRankings;
	}
	
	log("Plugin attached to Zotero.SJRCoreRankings");
	
	// Initialize the plugin
	log("Calling init()");
	await Zotero.SJRCoreRankings.init({ id, version, rootURI });
	log("Init complete, calling addToAllWindows()");
	Zotero.SJRCoreRankings.addToAllWindows();
	log("Startup complete");
}

/**
 * Called when a main Zotero window is opened (Zotero 7)
 */
function onMainWindowLoad({ window }) {
	Zotero.SJRCoreRankings?.addToWindow(window);
}

/**
 * Called when a main Zotero window is closed (Zotero 7)
 */
function onMainWindowUnload({ window }) {
	Zotero.SJRCoreRankings?.removeFromWindow(window);
}

/**
 * Called when the extension is shutting down
 */
function shutdown({ id, version, resourceURI, rootURI }) {
	log("Shutting down plugin");
	
	if (Zotero.SJRCoreRankings) {
		Zotero.SJRCoreRankings.removeFromAllWindows();
		delete Zotero.SJRCoreRankings;
	}
}

/**
 * Called when the extension is uninstalled
 */
function uninstall(data, reason) {
	log("Uninstalling plugin");
}

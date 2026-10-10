/*
 * Publication Rankings - Mega-journal list
 * Flags broad-scope, very high-volume open-access journals that review for
 * technical soundness rather than novelty, so they can be cited with care.
 *
 * Copyright (C) 2025 Ben Stephens
 * Licensed under GNU GPL v3
 */

/* global MatchingUtils */

var MegaJournals = {
	/**
	 * Titles (and common abbreviations / variants) of mega-journals.
	 * Matched with MatchingUtils.lookup in strict mode: by ISSN, alias or exact
	 * (normalized) title only, never by substring or by dropping a subtitle, so
	 * that e.g. "Nature Communications" or "Medicine: Science and Practice" are
	 * not caught by "Medicine".
	 * Add new entries here; no other change is needed.
	 *
	 * Sources: Wikipedia "Mega journal"; Spezi et al., J. Documentation 2017/2018;
	 * Scholarly Kitchen megajournal coverage; Peeref largest-journals list.
	 */
	titles: [
		// Core mega-journals: named on Wikipedia and/or in the OAMJ literature
		'PLOS ONE', 'PLoS ONE', 'PLoS One',
		'Scientific Reports', 'Sci Rep', 'Sci. Rep.',
		'IEEE Access',
		'Heliyon',
		'ACS Omega',
		'SAGE Open',
		'Royal Society Open Science', 'R. Soc. Open Sci.',
		'BMJ Open',
		'PeerJ',
		'Medicine', 'Medicine (Baltimore)', 'Medicine (United States)', // LWW; not the UK review journal
		'Biology Open',
		'FEBS Open Bio',
		'AIP Advances',
		'G3: Genes, Genomes, Genetics', 'G3 Genes Genomes Genetics', 'G3 (Bethesda)',
		'Open Library of Humanities',
		// (bare "Journal of Engineering" is deliberately omitted: Hindawi publishes a different journal of that name)
		'IET The Journal of Engineering',

		// Other broad, soundness-only / high-volume open-access titles
		'Cureus',
		'PeerJ Computer Science',
		'PeerJ Life & Environment',
		'RSC Advances',
		'F1000Research',
		'Results in Engineering',
		'Results in Physics',
		'Cogent Engineering',
		'Cogent Social Sciences'
	],

	/**
	 * @param {string} publicationTitle - Journal/publication title from the item
	 * @param {Object} [context] - { issnTitle } from RankingEngine
	 * @returns {boolean} True if the title is a known mega-journal
	 *
	 * @example
	 * MegaJournals.isMegaJournal('PLoS ONE'); // true
	 * MegaJournals.isMegaJournal('Nature Communications'); // false
	 */
	isMegaJournal: function (publicationTitle, context) {
		if (!publicationTitle) return false;
		return !!MatchingUtils.lookup('mega', this.titles, publicationTitle, null, context, true);
	}
};

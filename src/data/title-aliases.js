/*
 * Publication Rankings - Title aliases
 * Alternative names for publications whose Zotero title differs from the name
 * used in the ranking lists, and which the automatic matching cannot work out
 * on its own (see issue #15).
 *
 * Format:  "Variant as it appears in Zotero": "Title as it appears in a ranking list"
 * Case, punctuation, accents, "&"/"and" and a leading "The" are ignored on both
 * sides, as are subtitles (": ...") and trailing "(...)" in most cases, so there
 * is no need to add those variations here.
 *
 * Copyright (C) 2025 Ben Stephens
 * Licensed under GNU GPL v3
 */

var titleAliases = {
	// Issue #11
	"Management Information Systems Quarterly": "MIS Quarterly: Management Information Systems",

	"PNAS": "Proceedings of the National Academy of Sciences of the United States of America",
	"Proceedings of the National Academy of Sciences": "Proceedings of the National Academy of Sciences of the United States of America",
	"Journal of the American Medical Association": "JAMA",
	"NEJM": "New England Journal of Medicine",

	// TCHES is the journal of the CHES conference (papers are presented at CHES), so
	// take CHES's CORE rank as well as the journal's own SJR rank
	"IACR Transactions on Cryptographic Hardware and Embedded Systems": "Workshop on Cryptographic Hardware and Embedded Systems",
	"TCHES": "Workshop on Cryptographic Hardware and Embedded Systems"
};

/*
 * Publication Rankings - UI Utilities Module
 * Helper functions for colors, sorting, and display formatting
 * 
 * Copyright (C) 2025 Ben Stephens
 * Licensed under GNU GPL v3
 */

var UIUtils = {
	/**
	 * Get color for a ranking badge
	 * @param {string} ranking - The ranking (e.g., "A*", "Q1", "Nat RU")
	 * @returns {string} CSS color code
	 */
	getRankingColor: function(ranking) {
		if (!ranking) return null;
		
		// SJR Quartiles (Green to Red gradient)
		if (ranking.startsWith('Q1')) {
			return '#2E7D32'; // Dark green (best)
		}
		if (ranking.startsWith('Q2')) {
			return '#0288D1'; // Blue
		}
		if (ranking.startsWith('Q3')) {
			return '#F57C00'; // Orange
		}
		if (ranking.startsWith('Q4')) {
			return '#D32F2F'; // Red (lowest)
		}
		
		// CORE Conference Rankings (same gradient)
		if (ranking === 'A*' || ranking.startsWith('A* ')) {
			return '#2E7D32'; // Dark green (best)
		}
		if (ranking === 'A' || ranking.startsWith('A ') || ranking.startsWith('A[')) {
			return '#0288D1'; // Blue
		}
		if (ranking === 'B' || ranking.startsWith('B ') || ranking.startsWith('B[')) {
			return '#F57C00'; // Orange
		}
		if (ranking === 'C' || ranking.startsWith('C ') || ranking.startsWith('C[')) {
			return '#D32F2F'; // Red
		}
		
		// Australasian Rankings (same gradient)
		if (ranking.startsWith('Au A')) {
			return '#0288D1'; // Blue
		}
		if (ranking.startsWith('Au B')) {
			return '#F57C00'; // Orange
		}
		if (ranking.startsWith('Au C')) {
			return '#D32F2F'; // Red
		}
		
		// National Rankings (use purple to distinguish from main tiers)
		if (ranking.startsWith('Nat ')) {
			return '#7B1FA2'; // Purple
		}
		
		// Default for other rankings (TBR, Unranked, etc.)
		return '#757575'; // Gray
	},

	/**
	 * Get numeric sort value for a ranking
	 * Higher numbers = better ranking (reverse of typical sorting)
	 * @param {string} ranking - The ranking string
	 * @returns {number} Sort value
	 */
	getRankingSortValue: function(ranking) {
		if (!ranking) return 0;
		
		// CORE A* = highest
		if (ranking === 'A*' || ranking.startsWith('A* ')) return 1000;
		
		// SJR Q1 / CORE A
		if (ranking.startsWith('Q1')) return 900;
		if (ranking === 'A' || ranking.startsWith('A ') || ranking.startsWith('A[')) return 850;
		
		// Australasian A
		if (ranking.startsWith('Au A')) return 840;
		
		// SJR Q2 / CORE B
		if (ranking.startsWith('Q2')) return 700;
		if (ranking === 'B' || ranking.startsWith('B ') || ranking.startsWith('B[')) return 650;
		
		// Australasian B
		if (ranking.startsWith('Au B')) return 640;
		
		// SJR Q3 / CORE C
		if (ranking.startsWith('Q3')) return 500;
		if (ranking === 'C' || ranking.startsWith('C ') || ranking.startsWith('C[')) return 450;
		
		// Australasian C
		if (ranking.startsWith('Au C')) return 440;
		
		// SJR Q4
		if (ranking.startsWith('Q4')) return 300;
		
		// National rankings
		if (ranking.startsWith('Nat A')) return 250;
		if (ranking.startsWith('Nat B')) return 200;
		if (ranking.startsWith('Nat C')) return 150;
		if (ranking.startsWith('Nat ')) return 100;
		
		// Other/Unknown rankings
		return 50;
	},

	/**
	 * Format ranking for display with zero-padded sort prefix
	 * This ensures proper alphabetical sorting in Zotero columns
	 * @param {string} ranking - The ranking string
	 * @returns {string} Formatted ranking with sort prefix
	 */
	formatRankingForDisplay: function(ranking) {
		if (!ranking) return '';
		
		// Get sort value and zero-pad to 4 digits
		var sortValue = this.getRankingSortValue(ranking);
		var sortPrefix = String(sortValue).padStart(4, '0');
		
		// Return with invisible prefix for sorting
		return sortPrefix + ' ' + ranking;
	},

	/**
	 * Strip sort prefix from displayed ranking
	 * @param {string} displayedRanking - The ranking with sort prefix
	 * @returns {string} Clean ranking without prefix
	 */
	stripSortPrefix: function(displayedRanking) {
		if (!displayedRanking) return '';
		
		// Remove the "0000 " prefix pattern
		return displayedRanking.replace(/^\d{4}\s+/, '');
	},

	/**
	 * Get a human-readable description of a ranking
	 * @param {string} ranking - The ranking
	 * @returns {string} Description
	 */
	getRankingDescription: function(ranking) {
		if (!ranking) return 'No ranking found';
		
		// CORE rankings
		if (ranking === 'A*') return 'CORE A* - Flagship conference';
		if (ranking === 'A') return 'CORE A - Excellent conference';
		if (ranking === 'B') return 'CORE B - Good conference';
		if (ranking === 'C') return 'CORE C - Solid conference';
		if (ranking.startsWith('Nat')) return 'CORE ' + ranking + ' - National ranking';
		
		// SJR quartiles
		if (ranking === 'Q1') return 'SJR Q1 - Top 25% of journals';
		if (ranking === 'Q2') return 'SJR Q2 - Top 50% of journals';
		if (ranking === 'Q3') return 'SJR Q3 - Top 75% of journals';
		if (ranking === 'Q4') return 'SJR Q4 - Bottom 25% of journals';
		
		return ranking;
	},

	/**
	 * Format statistics message for bulk operations
	 * @param {Object} stats - Statistics object with counts
	 * @returns {string} Formatted message
	 */
	formatStatsMessage: function(stats) {
		var { total, found, notFound, skipped, notFoundList } = stats;
		
		var message = "Total selected: " + total + " item" + (total !== 1 ? "s" : "") + "\n" +
			"Rankings found: " + found + " item" + (found !== 1 ? "s" : "") + "\n" +
			"Not found: " + notFound + " item" + (notFound !== 1 ? "s" : "") + "\n" +
			"Skipped: " + skipped + " item" + (skipped !== 1 ? "s" : "") + " (no publication title or not regular items)\n\n" +
			"Rankings are displayed in the 'Ranking' column.\n" +
			"Right-click the column headers to show/hide it.";
		
		// Show first 10 not found titles for debugging
		if (notFoundList && notFoundList.length > 0) {
			var displayCount = Math.min(10, notFoundList.length);
			message += "\n\nFirst " + displayCount + " not found title" + (displayCount !== 1 ? "s" : "") + ":";
			for (var j = 0; j < displayCount; j++) {
				message += "\n" + (j + 1) + ". " + notFoundList[j];
			}
		}
		
		return message;
	}
};

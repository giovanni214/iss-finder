// In libs/tle-finder.js

const fs = require("fs");

/**
 * Converts a TLE epoch string (e.g., "24196.53559491") into a JavaScript Date object.
 * @param {string} tleEpoch - The epoch string from line 1 of a TLE.
 * @returns {Date} A Date object representing the TLE's epoch.
 */
function tleEpochToDate(tleEpoch) {
	const yearStr = tleEpoch.substring(0, 2);
	const dayOfYear = parseFloat(tleEpoch.substring(2));

	// Determine the full year (handles the Y2K problem for TLEs)
	const year = parseInt(yearStr) < 57 ? 2000 + parseInt(yearStr) : 1900 + parseInt(yearStr);

	// Create a date object for the beginning of the year and add the days
	const date = new Date(Date.UTC(year, 0, 1)); // Start at Jan 1st
	date.setUTCDate(date.getUTCDate() + dayOfYear - 1);

	return date;
}

/**
 * Finds the closest TLE in a file to a target date without going past it.
 * @param {string} filePath - The path to the TLE file (e.g., 'zarya.txt').
 * @param {number} targetMillis - The target date as milliseconds since the UTC epoch.
 * @returns {{tle: string[], ageDays: number, date: Date} | null} The TLE data or null if none is found.
 */
function findClosestTle(filePath, targetMillis) {
	if (!fs.existsSync(filePath)) {
		console.error(`Error: File not found at ${filePath}`);
		return null;
	}

	const targetDate = new Date(targetMillis);
	const fileContent = fs.readFileSync(filePath, "utf-8");
	const lines = fileContent.split(/\r?\n/).filter((line) => line.trim() !== "");

	let closestTle = null;
	let smallestDiff = Infinity;

	for (let i = 0; i < lines.length - 1; i += 2) {
		const line1 = lines[i];
		const line2 = lines[i + 1];

		// Basic validation for a TLE line 1
		if (!line1.startsWith("1 ")) continue;

		const tleEpochStr = line1.substring(18, 32).trim();
		const tleDate = tleEpochToDate(tleEpochStr);

		// Calculate the difference in milliseconds
		const diff = targetDate.getTime() - tleDate.getTime();

		// We are looking for the smallest *positive* difference
		if (diff >= 0 && diff < smallestDiff) {
			smallestDiff = diff;
			closestTle = {
				tle: [line1, line2],
				date: tleDate
			};
		}
	}

	if (closestTle) {
		// Convert the final difference from milliseconds to days
		closestTle.ageDays = smallestDiff / (1000 * 60 * 60 * 24);
		return closestTle;
	}

	return null;
}

// Export the function to make it available to other files
module.exports = { findClosestTle };

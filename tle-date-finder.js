// In libs/tle-finder.js

const fs = require("fs");

/**
 * Converts a TLE epoch string (e.g., "24196.53559491") into a precise
 * JavaScript Date object, including the time of day.
 * @param {string} tleEpoch - The epoch string from line 1 of a TLE.
 * @returns {Date} A Date object representing the TLE's exact epoch.
 */
function tleEpochToDate(tleEpoch) {
	const yearStr = tleEpoch.substring(0, 2);
	const epochDay = parseFloat(tleEpoch.substring(2));

	// Determine the full year (handles the Y2K problem for TLEs)
	const year = parseInt(yearStr) < 57 ? 2000 + parseInt(yearStr) : 1900 + parseInt(yearStr);

	// Get the integer part of the day (the day of the year)
	const dayOfYear = Math.floor(epochDay);

	// Get the fractional part of the day
	const fractionOfDay = epochDay - dayOfYear;

	// Calculate the total milliseconds for the fractional day
	const millisecondsInDay = 86400000; // (1000 * 60 * 60 * 24)
	const epochMillis = Math.round(fractionOfDay * millisecondsInDay);

	// Create a date for the beginning of the year and add the full days
	const date = new Date(Date.UTC(year, 0, 1)); // Starts at Jan 1st, 00:00:00 UTC
	date.setUTCDate(date.getUTCDate() + dayOfYear - 1);

	// Add the milliseconds for the time of day
	date.setUTCMilliseconds(date.getUTCMilliseconds() + epochMillis);

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

		if (!line1.startsWith("1 ")) continue;

		const tleEpochStr = line1.substring(18, 32).trim();
		const tleDate = tleEpochToDate(tleEpochStr);

		const diff = targetDate.getTime() - tleDate.getTime();

		if (diff >= 0 && diff < smallestDiff) {
			smallestDiff = diff;
			closestTle = {
				tle: [line1, line2],
				date: tleDate
			};
		}
	}

	if (closestTle) {
		closestTle.ageDays = smallestDiff / (1000 * 60 * 60 * 24);
		return closestTle;
	}

	return null;
}

module.exports = { findClosestTle };

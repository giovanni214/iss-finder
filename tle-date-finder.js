// tle-date-finder.js

const fs = require("fs");
const path = require("path");

// --- Helper function to parse a TLE date ---
function parseTleDate(tleLine1) {
	const epochYear = parseInt(tleLine1.substring(18, 20));
	const epochDay = parseFloat(tleLine1.substring(20, 32));
	const year = epochYear < 57 ? 2000 + epochYear : 1900 + epochYear;
	const dayOfYear = Math.floor(epochDay);
	const fractionOfDay = epochDay - dayOfYear;
	const date = new Date(year, 0, dayOfYear);
	date.setSeconds(date.getSeconds() + fractionOfDay * 86400);
	return date;
}

// --- NEW: Function to load all TLEs into a cached array ---
function loadAllTles(filePath) {
	const fileContent = fs.readFileSync(filePath, "utf-8");
	const lines = fileContent.split(/\r?\n/);
	const tles = [];

	for (let i = 0; i < lines.length - 1; i += 2) {
		if (lines[i] && lines[i + 1]) {
			const tle = [lines[i], lines[i + 1]];
			const date = parseTleDate(lines[i]);
			tles.push({ date, tle });
		}
	}
	// Sort TLEs by date, oldest to newest
	return tles.sort((a, b) => a.date - b.date);
}

// --- Your existing function, now used for single lookups if needed ---
function findClosestTle(filePath, targetTime) {
	// This can still use the new loader for consistency
	const allTles = loadAllTles(filePath);
	let bestTle = null;
	for (const tleData of allTles) {
		if (tleData.date.getTime() <= targetTime) {
			bestTle = tleData;
		} else {
			break;
		}
	}
	return bestTle;
}

module.exports = {
	findClosestTle,
	loadAllTles, // Export the new function
	parseTleDate
};

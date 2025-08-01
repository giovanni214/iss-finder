// In example.js

const path = require("path");
const { findClosestTle } = require("./tle-date-finder"); // Import the module

// --- Main Execution ---

// The target date as milliseconds since the UTC epoch
// Example: July 15, 2024, 00:00:00 UTC
const targetTimestamp = 1721037600000;

// Path to your TLE data file
const tleFilePath = path.join(__dirname, "zarya.txt");

const result = findClosestTle(tleFilePath, targetTimestamp);

if (result) {
	const targetDate = new Date(targetTimestamp);
	console.log(`Target Date: ${targetDate.toUTCString()}`);
	console.log("--- Found Closest TLE ---");
	console.log(result.tle[0]);
	console.log(result.tle[1]);
	console.log(`\nEpoch Date: ${result.date.toUTCString()}`);
	console.log(`Age of TLE: ${result.ageDays.toFixed(2)} days`);
} else {
	const targetDate = new Date(targetTimestamp);
	console.log(`No TLE found on or before ${targetDate.toUTCString()} in the file.`);
}

// server.js

const express = require("express");
const { generateMapImage } = require("./map-generator"); // Import the new drawing module

// --- Import your calculation modules ---
const getSunPosition = require("./libs/get-sun-position");
const getMoonPosition = require("./libs/get-moon-position");
const getMoonPhase = require("./libs/get-moon-phase");

const { degToRad } = require("./libs/math");
const satellite = require("satellite.js");
const Satellite = require("./libs/sat");

// --- Configuration ---
const app = express();
const port = 5000;

// =============================================================================
// MAIN API ROUTE
// =============================================================================

app.get("/map", async (__, res) => {
	try {
		const currentTime = new Date();

		// 1. GATHER DATA: All calculations happen here, in the API layer.
		console.log("Calculating astronomical data...");
		const sunData = getSunPosition(currentTime);
		const moonData = getMoonPosition(currentTime);
		const moonPhase = getMoonPhase(currentTime);
		const issTLE = [
			"1 25544U 98067A   25165.81361073  .00010333  00000+0  18747-3 0  9997",
			"2 25544  51.6371 318.8403 0001501 246.5954 113.4877 15.50200772514790"
		];
		const iss = new Satellite(issTLE);

		// 2. GENERATE IMAGE: Call the dedicated drawing module, passing in the data.
		console.log("Handing off to map generator...");
		const imageBuffer = await generateMapImage({
			sunData,
			moonData,
			moonPhase,
			iss,
			currentTime
		});

		// 3. SEND RESPONSE: The API layer's only other job is to send the result.
		console.log("Sending final image to client.");
		res.setHeader("Content-Type", "image/png");
		res.send(imageBuffer);
	} catch (error) {
		console.error("Failed to generate map:", error);
		res.status(500).send("Error generating map.");
	}
});

async function getTLE(link, name) {
	const response = await fetch(link);
	if (!response.ok) {
		throw new Error(`Failed to fetch TLE data: ${response.statusText}`);
	}
	let data = await response.text();
	data = data.split(/\r?\n/).map((line) => line.trim());
	const startOfData = data.indexOf(name);
	if (startOfData === -1) {
		throw new Error(`Satellite with name "${name}" not found in TLE data.`);
	}
	return [data[startOfData + 1], data[startOfData + 2]];
}

app.get("/predict", async (__, res) => {
	const tleData = [
		"1 25544U 98067A   25208.16578800  .00012255  00000+0  22132-3 0  9999",
		"2 25544  51.6347 108.9215 0001985 120.4338 239.6847 15.50135736521360"
	]; //await getTLE("https://celestrak.org/NORAD/elements/gp.php?CATNR=25544", "ISS (ZARYA)");
	const iss = new Satellite(tleData);
	const oneDayInMillis = 86400000;
	const startTime = new Date();
	const endTime = new Date(startTime.getTime() + oneDayInMillis * 10);
	const mylocation = {
		latitude: satellite.degreesToRadians(36.58018),
		longitude: satellite.degreesToRadians(-87.21605),
		height: 0.15 // in kilometers
	};

	const passes = iss.predict(mylocation, startTime, endTime, 30, 15);

	console.log(`TLE Data: ${tleData}\nCurrent Date: ${new Date().toLocaleString()}`);

	for (let pass of passes) {
		const startTime = pass.pass[0].time;
		let text = new Date(startTime).toLocaleString();
		console.log(text, pass.pass[0].isEclipsed);
	}
	res.json(passes);
});

app.listen(port, () => {
	console.log(`Server running on port ${port}. Access map at http://localhost:${port}/map`);
});

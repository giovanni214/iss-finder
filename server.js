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
// HELPER FUNCTION FOR VISIBILITY
// =============================================================================

/**
 * Converts the Sun's astronomical coordinates (RA, Dec) to an ECI vector.
 * @param {number} ra_deg - Right Ascension in degrees.
 * @param {number} dec_deg - Declination in degrees.
 * @param {number} dist_au - Distance in Astronomical Units.
 * @returns {object} The Sun's position vector {x, y, z} in km.
 */
function getSunEciVector(ra_deg, dec_deg, dist_au) {
	const AU_IN_KM = 149597870.7;
	const ra_rad = satellite.degreesToRadians(ra_deg);
	const dec_rad = satellite.degreesToRadians(dec_deg);
	const dist_km = dist_au * AU_IN_KM;

	const x = dist_km * Math.cos(dec_rad) * Math.cos(ra_rad);
	const y = dist_km * Math.cos(dec_rad) * Math.sin(ra_rad);
	const z = dist_km * Math.sin(dec_rad);

	return { x, y, z };
}

// =============================================================================
// API ROUTES
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
			"1 25544U 98067A   25212.99608426  .00012187  00000+0  21918-3 0  9998",
			"2 25544  51.6364  84.9763 0002287 136.8880 197.5582 15.50259437522105"
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

// app.get("/predict", async (__, res) => {
// 	const tleData = [
// 		"1 25544U 98067A   25212.99608426  .00012187  00000+0  21918-3 0  9998",
// 		"2 25544  51.6364  84.9763 0002287 136.8880 197.5582 15.50259437522105"
// 	]; //await getTLE("https://celestrak.org/NORAD/elements/gp.php?CATNR=25544", "ISS (ZARYA)");
// 	const iss = new Satellite(tleData);
// 	const oneDayInMillis = 86400000;
// 	const startTime = new Date();
// 	const endTime = new Date(startTime.getTime() + oneDayInMillis * 30);
// 	const mylocation = {
// 		latitude: satellite.degreesToRadians(36.58018),
// 		longitude: satellite.degreesToRadians(-87.21605),
// 		height: 0.15 // in kilometers
// 	};

// 	// 1. Get all potential passes from the satellite.js library
// 	const allPasses = iss.predict(mylocation, startTime, endTime, 30, 15);

// 	// 2. Filter these passes to find only the ones that are actually visible
// 	const visiblePasses = [];
// 	for (const pass of allPasses) {
// 		let isPassVisible = false;
// 		for (const point of pass.pass) {
// 			// Condition 1: The ISS must NOT be in Earth's shadow.
// 			if (point.isInShadow) {
// 				continue; // If it's in shadow, we can't see it.
// 			}

// 			// Condition 2: The observer on the ground must be in darkness.
// 			const time = new Date(point.time);
// 			const gmst = satellite.gstime(time);

// 			// Get the sun's position and check its elevation
// 			const sunData = getSunPosition(time);
// 			const sunEci = getSunEciVector(sunData.rightAscension, sunData.declination, sunData.distanceAU);
// 			const sunEcf = satellite.eciToEcf(sunEci, gmst);
// 			const sunLookAngles = satellite.ecfToLookAngles(mylocation, sunEcf);

// 			// If the sun is less than -6 degrees below the horizon (civil twilight),
// 			// it's dark enough to see the ISS.
// 			if (satellite.degreesLat(sunLookAngles.elevation) < -6) {
// 				isPassVisible = true;
// 				break; // We found a visible point, so the whole pass is visible.
// 			}
// 		}

// 		if (isPassVisible) {
// 			visiblePasses.push(pass);
// 		}
// 	}

// 	console.log(`TLE Data: ${tleData}\nCurrent Date: ${new Date().toLocaleString()}`);
// 	console.log("--- Found Visible Passes ---");
// 	for (let pass of visiblePasses) {
// 		const startTime = pass.pass[0].time;
// 		let text = new Date(startTime).toLocaleString();
// 		console.log(text);
// 	}

// 	res.json(visiblePasses);
// });
app.get("/predict", async (__, res) => {
	// Using your TLE from the zarya.txt file for the historical test
	const tleData = [
		"1 25544U 98067A   04366.01945963  .00025332  00000-0  19288-3 0  4829",
		"2 25544  51.6400  40.8325 0003751 148.3751 290.3898 15.72088056349248"
	];
	const iss = new Satellite(tleData);

	const startTime = new Date(Date.UTC(2024, 6, 15, 0, 0, 0)); // July is month 6
	const endTime = new Date(Date.UTC(2024, 6, 16, 0, 0, 0));

	const mylocation = {
		latitude: satellite.degreesToRadians(36.58018),
		longitude: satellite.degreesToRadians(-87.21605),
		height: 0.15
	};

	const allPasses = iss.predict(mylocation, startTime, endTime, 30, 15);
	const visiblePasses = [];

	for (const pass of allPasses) {
		let isPassVisible = false;
		for (const point of pass.pass) {
			if (point.isInShadow) continue;

			const time = new Date(point.time);
			const sunData = getSunPosition(time);
			const sunEci = getSunEciVector(sunData.rightAscension, sunData.declination, sunData.distanceAU);
			const gmst = satellite.gstime(time); // Using the library's gstime is fine here as it's only for the sun check now
			const sunEcf = satellite.eciToEcf(sunEci, gmst);
			const sunLookAngles = satellite.ecfToLookAngles(mylocation, sunEcf);

			if (satellite.degreesLat(sunLookAngles.elevation) < -6) {
				isPassVisible = true;
				break;
			}
		}
		if (isPassVisible) {
			visiblePasses.push(pass);
		}
	}

	console.log(`TESTING WITH YOUR TLE: ${tleData[0]}`);
	console.log("--- Found Visible Pass (Historical) ---");

	const timeZone = "America/Chicago";
	for (let pass of visiblePasses) {
		const passStartTime = new Date(pass.pass[0].time);
		const formattedTime = passStartTime.toLocaleString("en-US", {
			timeZone,
			hour12: true,
			month: "numeric",
			day: "numeric",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit"
		});
		console.log(`Visible pass starts at: ${formattedTime}`);
	}

	res.json(visiblePasses);
});

app.listen(port, () => {
	console.log(`Server running on port ${port}. Access map at http://localhost:${port}/map`);
});

// server.js

const express = require("express");
const path = require("path");
const { generateMapImage } = require("./map-generator");
const getSunPosition = require("./libs/get-sun-position");
const getMoonPosition = require("./libs/get-moon-position");
const getMoonPhase = require("./libs/get-moon-phase");
const satellite = require("satellite.js");
const Satellite = require("./libs/sat");

const app = express();
const port = 5000;

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

app.get("/map", async (__, res) => {
	try {
		const currentTime = new Date();
		const sunData = getSunPosition(currentTime);
		const moonData = getMoonPosition(currentTime);
		const moonPhase = getMoonPhase(currentTime);

		const tleData = [
			"1 25544U 98067A   26027.14328213  .00011252  00000+0  21756-3 0  9995",
			"2 25544  51.6321 277.7306 0011150  34.3982 325.7726 15.48216781549899"
		];

		const iss = new Satellite(tleData);

		const imageBuffer = await generateMapImage({ sunData, moonData, moonPhase, iss, currentTime });
		res.setHeader("Content-Type", "image/png");
		res.send(imageBuffer);
	} catch (error) {
		console.error("Failed to generate map:", error);
		res.status(500).send("Error generating map.");
	}
});

app.get("/predict", async (__, res) => {
	try {
		const startTime = new Date(Date.UTC(2025, 6, 19, 0, 0, 0)); // July 19th, 2025
		const endTime = new Date(Date.UTC(2025, 6, 27, 0, 0, 0)); // July 27th, 2025

		const tleFilePath = path.join(__dirname, "iss_tle.txt");

		// --- 🚀 Optimized TLE Loading ---
		const tleCache = loadAllTles(tleFilePath);
		if (tleCache.length === 0) {
			return res.status(404).json({ error: "No TLEs found in iss_tle.txt" });
		}

		const initialTleResult = findClosestTle(tleFilePath, startTime.getTime());
		if (!initialTleResult) {
			return res.status(404).json({ error: `No TLE found on or before ${startTime.toUTCString()}` });
		}
		const iss = new Satellite(initialTleResult.tle);
		// --- End of Optimization ---

		const mylocation = {
			latitude: satellite.degreesToRadians(36.58018),
			longitude: satellite.degreesToRadians(-87.21605),
			height: 0.15
		};

		const allPasses = iss.predict(mylocation, startTime, endTime, {
			stepSeconds: 30,
			minElevationAngle: 10, // Lowered to 10 to match SpotTheStation
			tleCache: tleCache
		});

		const visiblePasses = [];
		for (const pass of allPasses) {
			let isPassVisible = false;
			for (const point of pass.pass) {
				if (point.isInShadow) continue;

				const time = new Date(point.time);
				const sunData = getSunPosition(time);
				const sunEci = getSunEciVector(sunData.rightAscension, sunData.declination, sunData.distanceAU);
				const gmst = satellite.gstime(time);
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

		console.log("\n--- Found Visible Passes ---");
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
	} catch (error) {
		console.error("Error during prediction:", error);
		res.status(500).json({ error: "An error occurred during prediction." });
	}
});

app.listen(port, () => {
	console.log(`Server running on port ${port}. Access map at http://localhost:${port}/map`);
});

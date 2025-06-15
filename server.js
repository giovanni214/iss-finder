// server.js

const express = require("express");
const { generateMapImage } = require("./map-generator"); // Import the new drawing module

// --- Import your calculation modules ---
const getSunPosition = require("./libs/get-sun-position");
const getMoonPosition = require("./libs/get-moon-position");
const getMoonPhase = require("./libs/get-moon-phase");
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

// --- Add future routes here! ---
// app.get("/other-endpoint", async (req, res) => { ... });

// --- Run the server ---
app.listen(port, () => {
	console.log(`Server running on port ${port}. Access map at http://localhost:${port}/map`);
});

const path = require("node:path");
const { createCanvas, loadImage } = require("canvas");
const express = require("express");
const Satellite = require("./libs/sat");
const getSunPosition = require("./libs/get-sun-position");

const app = express();
const port = 5000;

// --- TLE Fetching (Unchanged) ---
async function getTLE(link, name) {
	// ... (your existing TLE code)
}

function addSeconds(date, seconds) {
	const dateCopy = new Date(date);
	dateCopy.setSeconds(date.getSeconds() + seconds);
	return dateCopy;
}

// --- CORRECTED PROJECTION FUNCTION ---
/**
 * Converts latitude and longitude to pixel X, Y coordinates
 * relative to the CENTER of the map.
 */
function latLonToXY(mapW, mapH, lat, lon) {
	// The x coordinate is the longitude mapped to the width
	const x = (lon / 180) * (mapW / 2);
	// The y coordinate is the latitude mapped to the height
	const y = (lat / 90) * (mapH / 2);
	return { x, y };
}

app.get("/map", async (__, res) => {
	const currentTime = new Date();

	// Using a hardcoded TLE for stability, as you did
	const issTLE = [
		"1 25544U 98067A   24203.84428501  .00019094  00000+0  33970-3 0  9990",
		"2 25544  51.6390 143.6425 0010114  91.5697   3.9534 15.50124891463929",
	];

	// 1. Get Sun Position for the background map
	const { latitude: sunLat, longitude: sunLon } = getSunPosition(currentTime);

	// 2. Load images
	const mapImg = await loadImage(
		`http://localhost:3000/?lat=${sunLat}&lon=${sunLon}`
	);
	const issImg = await loadImage(path.join(__dirname, "images", "iss.png"));
	const canvas = createCanvas(mapImg.width, mapImg.height);
	const ctx = canvas.getContext("2d");

	// 3. Draw the background map
	ctx.drawImage(mapImg, 0, 0);

	// 4. Prepare the canvas for centered drawing
	// This is the key: we do this ONCE and all subsequent coordinates are relative to the center.
	ctx.translate(canvas.width / 2, canvas.height / 2);

	// 5. Calculate the ISS orbital path
	const iss = new Satellite(issTLE);
	const paths = [];
	const orbitMinutes = 90; // Calculate one full orbit
	const stepSeconds = 30; // A point every 30 seconds
	for (let i = 0; i < (orbitMinutes * 60) / stepSeconds; i++) {
		const time = addSeconds(currentTime, i * stepSeconds);
		const issLoc = iss.getLocation(time, "latlon");
		paths.push(latLonToXY(mapImg.width, mapImg.height, issLoc.latitude, issLoc.longitude));
	}

	// 6. Draw the ISS path correctly
	ctx.beginPath();
	ctx.moveTo(paths[0].x, paths[0].y);
	for (let i = 1; i < paths.length; i++) {
		const p1 = paths[i - 1];
		const p2 = paths[i];
		// Check for map wrap-around by seeing if the x-distance is huge
		if (Math.abs(p2.x - p1.x) > canvas.width / 2) {
			ctx.moveTo(p2.x, p2.y); // Start a new line segment
		} else {
			ctx.lineTo(p2.x, p2.y); // Continue the current line
		}
	}
	ctx.lineWidth = 3;
	ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
	ctx.stroke();

	// 7. Draw the Sun icon
	const sunPosition = latLonToXY(mapImg.width, mapImg.height, sunLat, sunLon);
	ctx.beginPath();
	ctx.arc(sunPosition.x, sunPosition.y, 10, 0, Math.PI * 2);
	ctx.fillStyle = "rgba(255, 255, 0, 0.8)";
	ctx.fill();

	// 8. Draw the ISS icon and its arrow
	const issCurrentPos = paths[0];
	const issNextPos = paths[1];

	// Calculate rotation angle to point the ISS in its direction of travel
	const angle = Math.atan2(
		issNextPos.y - issCurrentPos.y,
		issNextPos.x - issCurrentPos.x
	);

	ctx.save();
	ctx.translate(issCurrentPos.x, issCurrentPos.y);
	ctx.rotate(angle);
	// Draw a simple arrow shape for the ISS
	ctx.beginPath();
	ctx.moveTo(10, 0);
	ctx.lineTo(-5, -5);
	ctx.lineTo(-5, 5);
	ctx.closePath();
	ctx.fillStyle = "red";
	ctx.fill();
	ctx.restore();

	// 9. Send the final image to the client
	const stream = canvas.toBuffer("image/png", {
		compressionLevel: 1,
		filters: canvas.PNG_FILTER_NONE,
	});
	res.setHeader("Content-Type", "image/png");
	res.send(stream);
});

app.listen(port, () => {
	console.log(`Running on port ${port}/map!`);
});

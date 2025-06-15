const path = require("node:path");
const { createCanvas, loadImage } = require("canvas");
const express = require("express");

const Satellite = require("./libs/sat");
const getSunPosition = require("./libs/get-sun-position");
const getMoonPosition = require("./libs/get-moon-position");
const getMoonPhase = require("./libs/get-moon-phase");

// --- Configuration ---
const app = express();
const port = 5000;
const RENDERER_API_URL = "http://localhost:3000";

// =============================================================================
// HELPER & UTILITY FUNCTIONS
// =============================================================================

function addSeconds(date, seconds) {
	const dateCopy = new Date(date);
	dateCopy.setSeconds(date.getSeconds() + seconds);
	return dateCopy;
}

function equirectangularProjection(mapW, mapH, lat, lon) {
	const sin = (x) => Math.sin((x * Math.PI) / 180);
	const cos = (x) => Math.cos((x * Math.PI) / 180);
	const xcirc = cos(lon);
	const ycirc = sin(lon);
	const lonBounded = (Math.atan2(ycirc, xcirc) * 180) / Math.PI;
	const x = lonBounded * (mapW / 360.0);
	const y = -lat * (mapH / 180.0);
	return [x, y];
}

// =============================================================================
// DRAWING FUNCTIONS
// =============================================================================

// --- THE FINAL FIX IS HERE ---
// The function is now self-contained and manages its own coordinate system.
function drawMoonPhase(ctx, lat, lon, radius, cycleAngle) {
	const a = (cycleAngle * Math.PI) / 180;
	const w = Math.cos(a) * radius;
	const PI = Math.PI;
	const PI_HALF = Math.PI / 2;
	const epsilon = 0.01;

	ctx.save();
	// 1. Move the origin to the center of the canvas, just like the other functions.
	ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);

	// 2. Calculate the pixel coordinates relative to the new center origin.
	const [x, y] = equirectangularProjection(ctx.canvas.width, ctx.canvas.height, lat, lon);

	// 3. Translate locally to the moon's drawing position.
	ctx.translate(x, y);

	const litColor = "rgb(230, 230, 230)";
	const darkColor = "rgb(40, 40, 40)";
	const leftSemicircle = () => ctx.arc(0, 0, radius, PI_HALF - epsilon, -PI_HALF + epsilon);
	const rightSemicircle = () => ctx.arc(0, 0, radius, -PI_HALF - epsilon, PI_HALF + epsilon);
	ctx.lineWidth = 0;

	if (cycleAngle <= 1 || cycleAngle >= 359) {
		ctx.fillStyle = darkColor;
		ctx.beginPath();
		ctx.arc(0, 0, radius, 0, 2 * PI);
		ctx.fill();
	} else if (cycleAngle < 90) {
		ctx.fillStyle = litColor;
		ctx.beginPath();
		rightSemicircle();
		ctx.fill();
		ctx.fillStyle = darkColor;
		ctx.beginPath();
		leftSemicircle();
		ctx.fill();
		ctx.beginPath();
		ctx.ellipse(0, 0, Math.abs(w), radius, 0, -PI_HALF, PI_HALF);
		ctx.fill();
	} else if (cycleAngle < 180) {
		ctx.fillStyle = darkColor;
		ctx.beginPath();
		leftSemicircle();
		ctx.fill();
		ctx.fillStyle = litColor;
		ctx.beginPath();
		rightSemicircle();
		ctx.fill();
		ctx.beginPath();
		ctx.ellipse(0, 0, Math.abs(w), radius, 0, PI_HALF, -PI_HALF);
		ctx.fill();
	} else if (cycleAngle < 270) {
		ctx.fillStyle = darkColor;
		ctx.beginPath();
		rightSemicircle();
		ctx.fill();
		ctx.fillStyle = litColor;
		ctx.beginPath();
		leftSemicircle();
		ctx.fill();
		ctx.beginPath();
		ctx.ellipse(0, 0, Math.abs(w), radius, 0, -PI_HALF, PI_HALF);
		ctx.fill();
	} else {
		ctx.fillStyle = litColor;
		ctx.beginPath();
		leftSemicircle();
		ctx.fill();
		ctx.fillStyle = darkColor;
		ctx.beginPath();
		rightSemicircle();
		ctx.fill();
		ctx.beginPath();
		ctx.ellipse(0, 0, Math.abs(w), radius, 0, PI_HALF, -PI_HALF);
		ctx.fill();
	}
	ctx.restore();
}

function calculateIssPath(iss, startTime, mapW, mapH) {
	const paths = [];
	for (let i = 0; i < 120 * 9; i++) {
		const time = addSeconds(startTime, i * 5);
		let issLoc = iss.getLocation(time, "latlon");
		const [x, y] = equirectangularProjection(mapW, mapH, issLoc.latitude, issLoc.longitude);
		paths.push({ x, y });
	}
	return paths;
}

function drawIssPathAndArrow(ctx, paths) {
	const canvas = ctx.canvas;
	ctx.save();
	ctx.translate(canvas.width / 2, canvas.height / 2);

	const strokePath = (style, width) => {
		ctx.beginPath();
		ctx.moveTo(paths[0].x, paths[0].y);
		for (let i = 1; i < paths.length; i++) {
			if (Math.abs(paths[i].x - paths[i - 1].x) > canvas.width * 0.9) {
				ctx.moveTo(paths[i].x, paths[i].y);
			} else {
				ctx.lineTo(paths[i].x, paths[i].y);
			}
		}
		ctx.strokeStyle = style;
		ctx.lineWidth = width;
		ctx.stroke();
	};

	strokePath("rgba(0, 0, 0, 0.6)", 5);
	strokePath("#82FAFF", 2);

	ctx.lineWidth = 1;
	ctx.save();
	const lastPositions = paths.slice(-2);
	ctx.translate(lastPositions[1].x, lastPositions[1].y);
	const pointToAngle =
		Math.atan2(lastPositions[1].y - lastPositions[0].y, lastPositions[1].x - lastPositions[0].x) + Math.PI / 2;
	ctx.rotate(pointToAngle);
	ctx.beginPath();
	ctx.moveTo(-8, 0);
	ctx.lineTo(0, -16);
	ctx.lineTo(8, 0);
	ctx.closePath();
	ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
	ctx.fill();
	ctx.strokeStyle = "rgb(0, 0, 0)";
	ctx.restore();

	ctx.restore();
}

function drawIssIcon(ctx, paths, issImg, diameter) {
	ctx.save();
	ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);

	const currentPos = paths[0];
	const nextPos = paths[5];

	// Calculate the new height to maintain the original aspect ratio
	const aspectRatio = issImg.height / issImg.width;
	const newHeight = diameter * aspectRatio;

	// The halo radius is half the new diameter plus some padding
	const haloRadius = diameter / 2 + 20;

	// --- Draw the Halo ---
	ctx.beginPath();
	ctx.arc(currentPos.x, currentPos.y, haloRadius, 0, 2 * Math.PI);
	ctx.fillStyle = "rgba(240, 240, 240, 0.3)";
	ctx.fill();

	// Use the halo's path to clip the area where the ISS will be drawn
	ctx.save();
	ctx.clip();

	// --- Draw the Rotated and Resized ISS Image ---
	ctx.save();
	ctx.translate(currentPos.x, currentPos.y);
	const pointToAngle = Math.atan2(nextPos.y - currentPos.y, nextPos.x - currentPos.x) + Math.PI / 2;
	ctx.rotate(pointToAngle);

	// Draw the image, centered and scaled to the new diameter
	ctx.drawImage(issImg, -diameter / 2, -newHeight / 2, diameter, newHeight);

	ctx.restore(); // Undoes the image's rotation and translation

	ctx.restore(); // Undoes the clipping
	ctx.restore(); // Undoes the main canvas translation
}

function drawSunIcon(ctx, mapW, mapH, lat, lon) {
	ctx.save();
	ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
	const [x, y] = equirectangularProjection(mapW, mapH, lat, lon);
	ctx.beginPath();
	ctx.arc(x, y, 25, 0, Math.PI * 2);
	ctx.fillStyle = "rgb(255, 255, 0)";
	ctx.fill();
	ctx.restore();
}

// =============================================================================
// MAIN API ROUTE
// =============================================================================

app.get("/map", async (__, res) => {
	try {
		const currentTime = new Date();

		const sunData = getSunPosition(currentTime);
		const moonData = getMoonPosition(currentTime);
		const moonPhase = getMoonPhase(currentTime);
		const issTLE = [
			"1 25544U 98067A   25165.81361073  .00010333  00000+0  18747-3 0  9997",
			"2 25544  51.6371 318.8403 0001501 246.5954 113.4877 15.50200772514790"
		];
		const iss = new Satellite(issTLE);

		const mapImg = await loadImage(`${RENDERER_API_URL}/?lat=${sunData.latitude}&lon=${sunData.longitude}`);
		const issImg = await loadImage(path.join(__dirname, "images", "iss.png"));

		const canvas = createCanvas(mapImg.width, mapImg.height);
		const ctx = canvas.getContext("2d");
		ctx.drawImage(mapImg, 0, 0);

		const issPath = calculateIssPath(iss, currentTime, mapImg.width, mapImg.height);

		drawIssPathAndArrow(ctx, issPath);
		drawSunIcon(ctx, mapImg.width, mapImg.height, sunData.latitude, sunData.longitude);
		// --- THE CHANGE IS HERE ---
		// The call is now cleaner and self-contained.
		drawMoonPhase(
			ctx,
			moonData.latitude,
			moonData.longitude,
			30, // radius
			moonPhase.cycleAngle
		);
		drawIssIcon(ctx, issPath, issImg, 80);

		const stream = canvas.toBuffer("image/png", {
			compressionLevel: 1,
			filters: canvas.PNG_FILTER_NONE
		});
		res.setHeader("Content-Type", "image/png");
		res.send(stream);
	} catch (error) {
		console.error("Failed to generate map:", error);
		res.status(500).send("Error generating map.");
	}
});

// --- Run the server ---
app.listen(port, () => {
	console.log(`Running on port ${port}/map!`);
});

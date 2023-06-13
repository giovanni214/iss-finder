const path = require("node:path");

const { createCanvas, loadImage } = require("canvas");

const express = require("express");
const app = express();
const port = 3000;

const { getTLE } = require("./utils");
const Satellite = require("./get-sat-position");

function addMinutes(date, minutes) {
	const dateCopy = new Date(date);
	dateCopy.setMinutes(date.getMinutes() + minutes);

	return dateCopy;
}

function millerProjection(mapWidth, lat, lng) {
	const toRadian = deg => (deg * Math.PI) / 180;

	lng = toRadian(lng);
	lat = toRadian(lat);

	const scale = mapWidth / Math.PI / 2;

	// Miller Projection
	const x = lng * scale;
	const y = -1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat)) * scale;

	return [x, y];
}

app.get("/map", async (__, res) => {
	//get the latest iss TLE data
	// const issTLE = await getTLE(
	// 	"https://celestrak.org/NORAD/elements/gp.php?CATNR=25544",
	// 	"ISS (ZARYA)"
	// );
	const issTLE = [
		"1 25544U 98067A   23164.01811053  .00012000  00000+0  21251-3 0  9991",
		"2 25544  51.6423 349.1942 0005364  76.5424  61.7713 15.50711488401146"
	];

	const mapImg = await loadImage(path.join(__dirname, "images", "map.jpg"));
	const issImg = await loadImage(path.join(__dirname, "images", "iss.png"));
	const canvas = createCanvas(mapImg.width, mapImg.height);
	const ctx = canvas.getContext("2d");
	ctx.drawImage(mapImg, 0, 0);

	//get path of iss
	const iss = new Satellite(issTLE);
	const paths = [];
	for (let i = 0; i < 1000; i++) {
		let issLoc = iss.getLocation(addMinutes(new Date(), i), "latlon");
		issLoc = millerProjection(canvas.width, issLoc.latitude, issLoc.longitude);
		paths.push(issLoc);
	}

	ctx.save();
	ctx.translate(canvas.width / 2, canvas.height / 2);
	ctx.beginPath();
	for (let i = 0; i < paths.length; i++) {
		if (i === 0) {
			ctx.moveTo(paths[i][0], paths[i][1]);
		} else {
			if (paths[i - 1][0] < paths[i][0]) ctx.lineTo(paths[i][0], paths[i][1]);
			else ctx.moveTo(paths[i][0], paths[i][1]);
		}
	}
	ctx.stroke();
	//draw the iss in the middle of point
	ctx.drawImage(
		issImg,
		paths[0][0] - issImg.width / 2,
		paths[0][1] - issImg.height / 2
	);
	ctx.restore();

	//send canvas to client
	const stream = canvas.toBuffer("image/png", {
		compressionLevel: 1, //for speed 1-9, 1 is fastest 9 is slowest
		filters: canvas.PNG_FILTER_NONE
	});
	res.setHeader("Content-Type", "image/png");
	res.send(stream);
});

app.listen(port, () => {
	console.log(`Running`);
});

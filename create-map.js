const path = require("node:path");
const { createCanvas, loadImage } = require("canvas");

const express = require("express");
const app = express();
const port = 5000;

const Satellite = require("./libs/sat");

async function getTLE(link, name) {
	let data = await (await fetch(link)).text();
	data = data.split(/\r?\n/);
	for (let i = 0; i < data.length; i++) data[i] = data[i].trim();
	const startOfData = data.indexOf(name);
	if (startOfData === -1) return;
	return [data[startOfData + 1], data[startOfData + 2]];
}

function addMinutes(date, minutes) {
	const dateCopy = new Date(date);
	dateCopy.setMinutes(date.getMinutes() + minutes);

	return dateCopy;
}

function equirectangularProjection(mapW, mapH, lat, lon) {
	const sin = x => Math.sin(x * Math.PI/180)
	const cos = x => Math.cos(x * Math.PI/180)

	const xcirc = cos(lon)
	const ycirc = sin(lon)

	const lonBounded = Math.atan2(ycirc, xcirc) * 180 / Math.PI

	const x = lonBounded * (mapW / 360.0);
	const y = - lat * (mapH / 180.0);
	return [x, y];
}

app.get("/map", async (__, res) => {
	//get the latest iss TLE data
	// const issTLE = await getTLE(
	// 	"https://celestrak.org/NORAD/elements/gp.php?CATNR=25544",
	// 	"ISS (ZARYA)"
	// );
	const issTLE = [
		"1 25544U 98067A   24010.04438150  .00013191  00000+0  23692-3 0  9991",
		"2 25544  51.6415  23.8738 0003896  17.2441  77.4364 15.50212827433879"
	];

	//load images and screen
	const mapImg = await loadImage("http://localhost:3000/?lat=0&lon=0");
	const issImg = await loadImage(path.join(__dirname, "images", "iss.png"));
	const canvas = createCanvas(mapImg.width, mapImg.height);
	const ctx = canvas.getContext("2d");
	ctx.drawImage(mapImg, 0, 0);

	//predict the path of iss
	const iss = new Satellite(issTLE);
	const paths = [];
	for (let i = 0; i < 100; i++) {
		let issLoc = iss.getLocation(addMinutes(new Date(), i), "latlon");
		issLoc = equirectangularProjection(mapImg.width, mapImg.height, issLoc.latitude, issLoc.longitude);
		paths.push(issLoc);
	}

	//draw the iss path
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

	//draw the circle the iss will go in
	ctx.save();
	ctx.beginPath();
	ctx.fillStyle = "rgba(200, 200, 255, 0.3)";
	ctx.arc(paths[0][0], paths[0][1], issImg.width / 2 + 20, 0, 2 * Math.PI); //circle
	ctx.stroke();
	ctx.fill();
	ctx.clip();

	//point the iss in the direction it's going and draw it
	ctx.save();
	ctx.translate(paths[0][0], paths[0][1]); //doing this so rotate works properly
	let pointToAngle = Math.atan2(paths[3][1], paths[3][0]);
	if (pointToAngle < 0) pointToAngle += 2 * Math.PI;
	ctx.rotate(pointToAngle);
	ctx.drawImage(issImg, -issImg.width / 2, -issImg.height / 2);
	ctx.restore();

	ctx.restore(); //seperated for clarity
	ctx.restore();

	//send canvas to client
	const stream = canvas.toBuffer("image/png", {
		compressionLevel: 1, //for speed 1-9, 1 is fastest 9 is slowest
		filters: canvas.PNG_FILTER_NONE
	});
	res.setHeader("Content-Type", "image/png");
	res.send(stream);
});

//run the server on a port
app.listen(port, () => {
	console.log(`Running`);
});

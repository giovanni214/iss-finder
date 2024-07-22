const path = require("node:path");
const { createCanvas, loadImage } = require("canvas");

const express = require("express");
const app = express();
const port = 5000;

const Satellite = require("./libs/sat");
const getSunPosition = require("./libs/get-sun-position");

async function getTLE(link, name) {
	let data = await (await fetch(link)).text();
	data = data.split(/\r?\n/);
	for (let i = 0; i < data.length; i++) data[i] = data[i].trim();
	const startOfData = data.indexOf(name);
	if (startOfData === -1) return;
	return [data[startOfData + 1], data[startOfData + 2]];
}

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

app.get("/map", async (__, res) => {
  const currentTime = new Date();
  let pointToAngle;
	//get the latest iss TLE data
	// const issTLE = await getTLE(
	// 	"https://celestrak.org/NORAD/elements/gp.php?CATNR=25544",
	// 	"ISS (ZARYA)"
	// );
	const issTLE = [
		"1 25544U 98067A   24203.84428501  .00019094  00000+0  33970-3 0  9990",
		"2 25544  51.6390 143.6425 0010114  91.5697   3.9534 15.50124891463929"
	];

  const {latitude, longitude} = getSunPosition(currentTime);

	//load images and screen
	const mapImg = await loadImage(`http://localhost:3000/?lat=${latitude}&lon=${longitude}`);
	const issImg = await loadImage(path.join(__dirname, "images", "iss.png"));
	const canvas = createCanvas(mapImg.width, mapImg.height);
	const ctx = canvas.getContext("2d");
	ctx.drawImage(mapImg, 0, 0);

	//predict the path of iss
	const iss = new Satellite(issTLE);
	const paths = [];
	for (let i = 0; i < 120 * 9; i++) {
		let issLoc = iss.getLocation(addSeconds(currentTime, i * 5), "latlon");
		issLoc = equirectangularProjection(mapImg.width, mapImg.height, issLoc.latitude, issLoc.longitude);
		paths.push({ x: issLoc[0], y: issLoc[1] });
	}

	//draw the iss path
	ctx.save();
	ctx.translate(canvas.width / 2, canvas.height / 2);
	ctx.beginPath();
	for (let i = 0; i < paths.length; i++) {
		if (i === 0) {
			ctx.moveTo(paths[i].x, paths[i].y);
		} else {
			if (paths[i - 1].x < paths[i].x) ctx.lineTo(paths[i].x, paths[i].y);
			else ctx.moveTo(paths[i].x, paths[i].y);
		}
	}
  ctx.lineWidth = 8;
  ctx.strokeStyle = "rgba(200, 0, 0, 0.8)";
	ctx.stroke();
  ctx.lineWidth = 1;

  //Draw Arrow to the "future" point
  ctx.save()
  const lastPositions = [...paths].slice(-2); 
  ctx.translate(lastPositions[1].x, lastPositions[1].y);
  pointToAngle = Math.atan2(lastPositions[1].y - lastPositions[0].y, lastPositions[1].x - lastPositions[0].x) + Math.PI / 2
  ctx.rotate(pointToAngle);
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(0, -16);
  ctx.lineTo(8, 0);
  ctx.closePath();
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.fill();
  ctx.strokeStyle = "rgb(0, 0, 0)";

  ctx.restore(); //Escapes the translation for rotation

	//draw the circle the iss will go in
	ctx.save();
	ctx.beginPath();
	ctx.arc(paths[0].x, paths[0].y, issImg.width / 2 + 20, 0, 2 * Math.PI); //circle
	ctx.clip();

	//point the iss in the direction it's going and draw it
	ctx.save();
	ctx.translate(paths[0].x, paths[0].y); //doing this so rotate works properly
	pointToAngle = Math.atan2(paths[5].y - paths[0].y, paths[5].x - paths[0].x) + Math.PI / 2;
	ctx.rotate(pointToAngle);
	ctx.drawImage(issImg, -issImg.width / 2, -issImg.height / 2); 
	ctx.restore(); //Gets rid of translation needed for rotation
  
	ctx.restore(); //Escapes the clip used to fit ISS in circle

  //Draw the sun
  const sunPosition = equirectangularProjection(mapImg.width, mapImg.height, latitude, longitude);
  ctx.beginPath();
  ctx.arc(sunPosition[0], sunPosition[1], 25, 0, Math.PI * 2);
  ctx.fillStyle = "rgb(255, 255, 0)";
  ctx.fill();
	ctx.restore(); //Escapes translation to center of screen

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
	console.log(`Running on port ${port}/map!`);
});

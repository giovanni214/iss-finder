const fetch = (...args) =>
	import("node-fetch").then(({ default: fetch }) => fetch(...args));

const satellite = require("satellite.js");

function radToDeg(radians) {
	return radians * (180 / Math.PI);
}

function degToRad(degrees) {
	return degrees * (Math.PI / 180);
}

function normalizeAngle(angle) {
	return angle - 360 * Math.floor(angle / 360);
}

//sin but in degrees instead of radians
function sin(x) {
	x = degToRad(x);
	return Math.sin(x);
}

//cos but in degrees instead of radians
function cos(x) {
	x = degToRad(x);
	return Math.cos(x);
}

function arcSecToDeg(x) {
	return x / 3600;
}

function AuToKilometers(x) {
	return x * 149597870;
}

function getJulianDate(date) {
	return date / 86400000 + 2440587.5;
}

function getT(JDE) {
	return (JDE - 2451545) / 36525;
}

function eclipticToEquatorial(longitude, latitude, trueObliquity) {
	//converting from Ecliptic to Equatorial coordinates
	const rightAscension = Math.atan2(
		cos(latitude) * sin(longitude) * cos(trueObliquity) -
			sin(latitude) * sin(trueObliquity),
		cos(latitude) * cos(longitude)
	);

	const declination = Math.asin(
		cos(trueObliquity) * sin(latitude) +
			sin(trueObliquity) * cos(latitude) * sin(longitude)
	);

	return { rightAscension, declination };
}

function getZenithPoint(time, rightAscension, declination) {
	const gmst = satellite.gstime(time);
	const latitude = radToDeg(declination);
	const longitude = radToDeg(rightAscension - gmst);
	return { latitude, longitude };
}

async function getTLE(link, name) {
	let data = await (await fetch(link)).text();
	data = data.split(/\r?\n/);
	for (let i = 0; i < data.length; i++) data[i] = data[i].trim();
	const startOfData = data.indexOf(name);
	if (startOfData === -1) return;
	return [data[startOfData + 1], data[startOfData + 2]];
}

module.exports = {
	radToDeg,
	degToRad,
	normalizeAngle,
	sin,
	cos,
	arcSecToDeg,
	AuToKilometers,
	getJulianDate,
	getT,
	eclipticToEquatorial,
	getZenithPoint,
	getTLE
};

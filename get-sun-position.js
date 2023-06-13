const { radToDeg, degToRad, getJulianDate, obliquity } = require("./utils");
const satellite = require("satellite.js");

//https://en.wikipedia.org/wiki/Position_of_the_Sun#Ecliptic_coordinates
function getSunPosition(time = new Date()) {
	const gmst = satellite.gstime(time);
	let n = getJulianDate(time) - 2451545;
	let L = 280.46 + 0.9856474 * n;
	let g = 357.528 + 0.9856003 * n;

	L %= 360;
	g %= 360;

	g = degToRad(g);

	let el = L + 1.915 * radToDeg(Math.sin(g)) + 0.02 * radToDeg(Math.sin(2 * g));
	let R =
		1.00014 -
		0.01671 * radToDeg(Math.cos(g)) -
		0.00014 * radToDeg(Math.cos(2 * g));

	let o = obliquity(time);
	o = degToRad(o);
	el = degToRad(el);

	let ra = Math.atan2(Math.cos(o) * Math.sin(el), Math.cos(el));
	const dec = Math.asin(Math.sin(o) * Math.sin(el));
	ra = radToDeg(ra);

	//the only reason this code worked:
	//https://astronomy.stackexchange.com/questions/20560/how-to-calculate-the-position-of-the-sun-in-long-lat
	const sha = 360 - ra;
	const ghaA = 15 * gmst;
	const gha = sha + ghaA;
	console.log(`${gha}, ${radToDeg(dec)}`);

	console.log("AHHHHHHHHHH");
}

getSunPosition();

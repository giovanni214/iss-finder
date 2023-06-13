const fetch = (...args) =>
	import("node-fetch").then(({ default: fetch }) => fetch(...args));

function radToDeg(radians) {
	return radians * (180 / Math.PI);
}

function degToRad(degrees) {
	return degrees * (Math.PI / 180);
}

function getJulianDate(date) {
	return date / 86400000 + 2440587.5;
}

//literally just Earths axil tilt
function obliquity(time) {
	const n = getJulianDate(time) - 2451545;
	//Julian centuries since J2000.0
	const T = n / 36525;
	const epsilon =
		23.43929111 -
		T *
			(46.836769 / 3600 -
				T *
					(0.0001831 / 3600 +
						T *
							(0.0020034 / 3600 -
								T * (0.576e-6 / 3600 - (T * 4.34e-8) / 3600))));
	return epsilon;
}

async function getTLE(link, name) {
	let data = await (await fetch(link)).text();
	data = data.split(/\r?\n/);
	for (let i = 0; i < data.length; i++) data[i] = data[i].trim();
	const startOfData = data.indexOf(name);
	if (startOfData === -1) return;
	return [data[startOfData + 1], data[startOfData + 2]];
}

module.exports = { radToDeg, degToRad, getJulianDate, obliquity, getTLE };

// In libs/get-sun-position.js

const { sin, cos, arcSecToDeg, normalizeAngle, radToDeg, atan2, asin, tan } = require("./math");
const { dateToJulian } = require("./dates");
const getObliquity = require("./get-obliquity");
const satellite = require("satellite.js"); // <-- **CRITICAL ADDITION**

function eclipticToEquatorial(longitude, latitude, trueObliquity) {
	const rightAscension = atan2(
		sin(longitude) * cos(trueObliquity) - tan(latitude) * sin(trueObliquity),
		cos(longitude)
	);
	const declination = asin(sin(latitude) * cos(trueObliquity) + cos(latitude) * sin(trueObliquity) * sin(longitude));
	return {
		rightAscension: normalizeAngle(rightAscension),
		declination: declination
	};
}

function getZenithPoint(gmst, rightAscension, declination) {
	const latitude = declination;
	const longitude = rightAscension - gmst;
	return {
		geographicLatitude: latitude,
		geographicLongitude: normalizeAngle(longitude)
	};
}

function getSunPosition(time) {
	const JDE = dateToJulian(time);
	const t = (JDE - 2451545) / 365250;
	const T = 10 * t;

	// --- All the long LTerms, BTerms, and RTerms arrays stay here ---
	// (Omitted for brevity, but they are correct and should remain)
	const LTerms = [
		[
			[175347046, 0, 0],
			[3341656, 4.6692568, 6283.07585],
			[34894, 4.6261, 12566.1517],
			[3497, 2.7441, 5753.3849],
			[3418, 2.8289, 3.5231],
			[3136, 3.6277, 77713.7715],
			[2676, 4.4181, 7860.4194],
			[2343, 6.1352, 3930.2097],
			[1324, 0.7425, 11506.7698],
			[1273, 2.0371, 529.691],
			[1199, 1.1096, 1577.3435],
			[990, 5.2335, 884.927],
			[902, 2.045, 26.298],
			[857, 3.508, 398.149],
			[780, 1.179, 5223.694],
			[753, 2.533, 5507.553],
			[505, 4.583, 18849.228],
			[492, 4.205, 775.523],
			[357, 2.92, 0.067],
			[317, 5.849, 11790.629],
			[284, 1.899, 796.298],
			[271, 0.315, 10977.079],
			[243, 0.345, 5486.778],
			[206, 4.806, 2544.314],
			[205, 1.869, 5573.143],
			[202, 2.458, 6069.777],
			[156, 0.833, 213.299],
			[132, 3.411, 2942.463],
			[126, 1.083, 20.775],
			[115, 0.645, 0.98],
			[103, 0.636, 4694.003],
			[102, 0.976, 15720.839],
			[102, 4.267, 7.114],
			[99, 6.21, 2146.17],
			[98, 0.68, 155.42],
			[86, 5.98, 161000.69],
			[85, 1.3, 6275.96],
			[85, 3.67, 71430.7],
			[80, 1.81, 17260.15],
			[79, 3.04, 12036.46],
			[75, 1.76, 5088.63],
			[74, 3.5, 3154.69],
			[74, 4.68, 801.82],
			[70, 0.83, 9437.76],
			[62, 3.98, 8827.39],
			[61, 1.82, 7084.9],
			[57, 2.78, 6286.6],
			[56, 4.39, 14143.5],
			[56, 3.47, 6279.55],
			[52, 0.19, 12139.55],
			[52, 1.33, 1748.02],
			[51, 0.28, 5856.48],
			[49, 0.49, 1194.45],
			[41, 5.37, 8429.24],
			[41, 2.4, 19651.05],
			[39, 6.17, 10447.39],
			[37, 6.04, 10213.29],
			[37, 2.57, 1059.38],
			[36, 1.71, 2352.87],
			[36, 1.78, 6812.77],
			[33, 0.59, 17789.85],
			[30, 0.44, 83996.85],
			[30, 2.74, 1349.87],
			[25, 3.16, 4690.48]
		],
		[
			[628331966747, 0, 0],
			[206059, 2.678235, 6283.07585],
			[4303, 2.6351, 12566.1517],
			[425, 1.59, 3.523],
			[119, 5.796, 26.298],
			[109, 2.966, 1577.344],
			[93, 2.59, 18849.23],
			[72, 1.14, 529.69],
			[68, 1.87, 398.15],
			[67, 4.41, 5507.55],
			[59, 2.89, 5223.69],
			[56, 2.17, 155.42],
			[45, 0.4, 796.3],
			[36, 0.47, 775.52],
			[29, 2.65, 7.11],
			[21, 5.34, 0.98],
			[19, 1.85, 5486.78],
			[19, 4.97, 213.3],
			[17, 2.99, 6275.96],
			[16, 0.03, 2544.31],
			[16, 1.43, 2146.17],
			[15, 1.21, 10977.08],
			[12, 2.83, 1748.02],
			[12, 3.26, 5088.63],
			[12, 5.27, 1194.45],
			[12, 2.08, 4694.0],
			[11, 0.77, 553.57],
			[10, 1.3, 6286.6],
			[10, 4.24, 1549.87],
			[9, 2.7, 242.73],
			[9, 5.64, 951.72],
			[8, 5.3, 2352.87],
			[6, 2.65, 9437.76],
			[6, 4.67, 4690.48]
		],
		[
			[52919, 0, 0],
			[8720, 1.0721, 6283.0758],
			[309, 0.867, 12566.152],
			[27, 0.05, 3.52],
			[16, 5.19, 26.3],
			[16, 3.68, 155.42],
			[10, 0.76, 18849.23],
			[9, 2.06, 77713.77],
			[7, 0.83, 775.52],
			[5, 4.66, 1577.34],
			[4, 1.03, 7.11],
			[4, 3.44, 5573.14],
			[3, 5.14, 796.3],
			[3, 6.05, 5507.55],
			[3, 1.19, 242.73],
			[3, 6.12, 529.69],
			[3, 0.31, 398.15],
			[3, 2.28, 553.57],
			[2, 4.38, 5223.69],
			[2, 3.75, 0.98]
		],
		[
			[289, 5.844, 6283.076],
			[35, 0, 0],
			[17, 5.49, 12566.15],
			[3, 5.2, 155.42],
			[1, 4.72, 3.52],
			[1, 5.3, 18849.23],
			[1, 5.97, 242.73]
		],
		[
			[114, 3.142, 0],
			[8, 4.13, 6283.08],
			[1, 3.84, 12566.15]
		],
		[[1, 3.14, 0]]
	];
	const BTerms = [
		[
			[280, 3.199, 84334.662],
			[102, 5.422, 5507.553],
			[80, 3.88, 5223.69],
			[44, 3.7, 2352.87],
			[32, 4.0, 1577.34]
		],
		[
			[9, 3.9, 5507.55],
			[6, 1.73, 5223.69]
		]
	];
	const RTerms = [
		[
			[100013989, 0, 0],
			[1670700, 3.0984635, 6283.07585],
			[13956, 3.05525, 12566.151],
			[3084, 5.1985, 77713.7715],
			[1628, 1.1739, 5753.3849],
			[1576, 2.8469, 7860.4194],
			[925, 5.453, 11506.77],
			[542, 4.564, 3930.21],
			[472, 3.661, 5884.927],
			[346, 0.964, 5507.553],
			[329, 5.9, 5223.694],
			[307, 0.299, 5573.143],
			[243, 4.273, 11790.629],
			[212, 5.847, 1577.344],
			[186, 5.022, 10977.079],
			[175, 3.012, 18849.228],
			[110, 5.055, 5486.778],
			[98, 0.89, 6069.78],
			[86, 5.69, 15720.84],
			[86, 1.27, 161000.69],
			[65, 0.27, 17260.15],
			[63, 0.92, 529.69],
			[57, 2.01, 83996.85],
			[56, 5.24, 71430.7],
			[49, 3.25, 2544.31],
			[47, 2.58, 775.52],
			[45, 5.54, 9437.76],
			[43, 6.01, 6275.96],
			[39, 5.36, 4694.0],
			[38, 2.39, 8827.39],
			[37, 0.83, 19651.05],
			[37, 4.9, 12139.55],
			[36, 1.67, 12036.46],
			[35, 1.84, 2942.46],
			[33, 0.24, 7084.9],
			[32, 0.18, 5088.63],
			[32, 1.78, 398.15],
			[28, 1.21, 6286.6],
			[28, 1.9, 6279.55],
			[26, 4.59, 10447.39]
		],
		[
			[103019, 1.10749, 6283.07585],
			[1721, 1.0644, 12566.1517],
			[702, 3.142, 0],
			[32, 1.02, 18849.23],
			[31, 2.84, 5507.55],
			[25, 1.32, 5223.69],
			[18, 1.42, 1577.34],
			[10, 5.91, 10977.08],
			[9, 1.42, 6275.96],
			[9, 0.27, 5486.78]
		],
		[
			[4359, 5.7846, 6283.0758],
			[124, 5.579, 12566.152],
			[12, 3.14, 0],
			[9, 3.63, 77713.77],
			[6, 1.87, 5573.14],
			[3, 5.47, 18849.23]
		],
		[
			[145, 4.273, 6283.076],
			[7, 3.92, 12566.15]
		],
		[[4, 2.56, 6283.08]]
	];

	let L = 0,
		B = 0,
		R = 0;

	for (let i = 0; i < LTerms.length; i++) {
		let sum = 0;
		for (const term of LTerms[i]) {
			sum += term[0] * Math.cos(term[1] + term[2] * t);
		}
		L += sum * t ** i;
	}

	for (let i = 0; i < BTerms.length; i++) {
		let sum = 0;
		for (const term of BTerms[i]) {
			sum += term[0] * Math.cos(term[1] + term[2] * t);
		}
		B += sum * t ** i;
	}

	for (let i = 0; i < RTerms.length; i++) {
		let sum = 0;
		for (const term of RTerms[i]) {
			sum += term[0] * Math.cos(term[1] + term[2] * t);
		}
		R += sum * t ** i;
	}

	L /= 10 ** 8;
	B /= 10 ** 8;
	R /= 10 ** 8;
	L = radToDeg(L);
	B = radToDeg(B);

	let lon = L + 180;
	let lat = -B;

	const lonP = lon - 1.397 * T - 0.00031 * T ** 2;
	lon += arcSecToDeg(-0.09033);
	lat += arcSecToDeg(0.03916) * (cos(lonP) - sin(lonP));

	const { longitudeNutation, trueObliquity } = getObliquity(time);
	const nutation = longitudeNutation;

	const k = 20.49552;
	const aberration = -arcSecToDeg(k) / R;

	lon = normalizeAngle(lon);
	let apparentLongitude = lon + nutation + aberration;
	apparentLongitude = normalizeAngle(apparentLongitude);

	const { rightAscension, declination } = eclipticToEquatorial(apparentLongitude, lat, trueObliquity);

	// **THE FIX**: Use the accurate gstime function from the satellite.js library
	const gmst = satellite.gstime(time);

	const { geographicLatitude, geographicLongitude } = getZenithPoint(gmst, rightAscension, declination);

	return {
		latitude: geographicLatitude,
		longitude: geographicLongitude,
		rightAscension,
		declination,
		distanceAU: R,
		apparentEclipticLongitude: apparentLongitude
	};
}

module.exports = getSunPosition;

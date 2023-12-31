const { radToDeg, normalizeAngle, sin, cos } = require("./math");
const { greenwichTime, dateToJulian } = require("./dates");

function eclipticToEquatorial(longitude, latitude, trueObliquity) {
	const rightAscension = Math.atan2(
		cos(latitude) * sin(longitude) * cos(trueObliquity) - sin(latitude) * sin(trueObliquity),
		cos(latitude) * cos(longitude)
	);

	const declination = Math.asin(
		cos(trueObliquity) * sin(latitude) + sin(trueObliquity) * cos(latitude) * sin(longitude)
	);

	return {
		rightAscension: radToDeg(rightAscension),
		declination: radToDeg(declination)
	};
}

function getZenithPoint(time, rightAscension, declination) {
	const gmst = greenwichTime(time);
	const latitude = declination;
	const longitude = radToDeg(degToRad(rightAscension) - gmst);
	return { latitude, longitude };
}

const getObliquity = require("./get-obliquity");

//The process was from chapter 47 of the book Astronomical Algorithms V2
//All variables are expressed in degrees
function getMoonPosition(time = new Date()) {
	const JDE = dateToJulian(time); //julian date
	const T = (JDE - 2451545) / 36525;

	//Moon's mean longitude
	let Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T ** 2 + T ** 3 / 538841 - T ** 4 / 65194000;

	//Mean elongation of the Moon
	let D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T ** 2 + T ** 3 / 545868 - T ** 4 / 113065000;

	//Sun's mean anomaly
	let M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T ** 2 + T ** 3 / 24490000;

	//Moon's mean anomaly
	let Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T ** 2 + T ** 3 / 69699 - T ** 4 / 14712000;

	//Moon's argument of latitude (mean distance of the Moon from its ascending node)
	let F = 93.272095 + 483202.0175233 * T - 0.0036539 * T ** 2 - T ** 3 / 3526000 + T ** 4 / 863310000;

	let A1 = 119.75 + 131.849 * T;
	let A2 = 53.09 + 479264.29 * T;
	let A3 = 313.45 + 481266.484 * T;

	//Eccentricty of the Earth's orbit around the Sun
	const E = 1 - 0.002516 * T - 0.0000074 * T ** 2;

	Lp = normalizeAngle(Lp);
	D = normalizeAngle(D);
	M = normalizeAngle(M);
	Mp = normalizeAngle(Mp);
	F = normalizeAngle(F);
	A1 = normalizeAngle(A1);
	A2 = normalizeAngle(A2);
	A3 = normalizeAngle(A3);

	//Table contains [D, M, Mp, F, Coefficient]
	//This is a list of periodic terms for the Moon's longitude
	//Values are represented in 0.000001 degree (10^-6)
	const periodicLongitudes = [
		[0, 0, 1, 0, 6288774],
		[2, 0, -1, 0, 1274027],
		[2, 0, 0, 0, 658314],
		[0, 0, 2, 0, 213618],
		[0, 1, 0, 0, -185116],
		[0, 0, 0, 2, -114332],
		[2, 0, -2, 0, 58793],
		[2, -1, -1, 0, 57066],
		[2, 0, 1, 0, 53322],
		[2, -1, 0, 0, 45758],
		[0, 1, -1, 0, -40923],
		[1, 0, 0, 0, -34720],
		[0, 1, 1, 0, -30383],
		[2, 0, 0, -2, 15327],
		[0, 0, 1, 2, -12528],
		[0, 0, 1, -2, 10980],
		[4, 0, -1, 0, 10675],
		[0, 0, 3, 0, 10034],
		[4, 0, -2, 0, 8548],
		[2, 1, -1, 0, -7888],
		[2, 1, 0, 0, -6766],
		[1, 0, -1, 0, -5163],
		[1, 1, 0, 0, 4987],
		[2, -1, 1, 0, 4036],
		[2, 0, 2, 0, 3994],
		[4, 0, 0, 0, 3861],
		[2, 0, -3, 0, 3665],
		[0, 1, -2, 0, -2689],
		[2, 0, -1, 2, -2602],
		[2, -1, -2, 0, 2390],
		[1, 0, 1, 0, -2348],
		[2, -2, 0, 0, 2236],
		[0, 1, 2, 0, -2120],
		[0, 2, 0, 0, -2069],
		[2, -2, -1, 0, 2048],
		[2, 0, 1, -2, -1773],
		[2, 0, 0, 2, -1595],
		[4, -1, -1, 0, 1215],
		[0, 0, 2, 2, -1110],
		[3, 0, -1, 0, -892],
		[2, 1, 1, 0, -810],
		[4, -1, -2, 0, 759],
		[0, 2, -1, 0, -713],
		[2, 2, -1, 0, -700],
		[2, 1, -2, 0, 691],
		[2, -1, 0, -2, 596],
		[4, 0, 1, 0, 549],
		[0, 0, 4, 0, 537],
		[4, -1, 0, 0, 520],
		[1, 0, -2, 0, -487],
		[2, 1, 0, -2, -399],
		[0, 0, 2, -2, -381],
		[1, 1, 1, 0, 351],
		[3, 0, -2, 0, -340],
		[4, 0, -3, 0, 330],
		[2, -1, 2, 0, 327],
		[0, 2, 1, 0, -323],
		[1, 1, -1, 0, 299],
		[2, 0, 3, 0, 294]
	];

	//Periodic terms for the distance of the Moon
	//Unit is in 0.001 kilometers (10^-3)
	const periodicDistances = [
		[0, 0, 1, 0, -20905355],
		[2, 0, -1, 0, -3699111],
		[2, 0, 0, 0, -2955968],
		[0, 0, 2, 0, -569925],
		[0, 1, 0, 0, 48888],
		[0, 0, 0, 2, -3149],
		[2, 0, -2, 0, 246158],
		[2, -1, -1, 0, -152138],
		[2, 0, 1, 0, -170733],
		[2, -1, 0, 0, -204586],
		[0, 1, -1, 0, -129620],
		[1, 0, 0, 0, 108743],
		[0, 1, 1, 0, 104755],
		[2, 0, 0, -2, 10321],
		[0, 0, 1, -2, 79661],
		[4, 0, -1, 0, -34782],
		[0, 0, 3, 0, -23210],
		[4, 0, -2, 0, -21636],
		[2, 1, -1, 0, 24208],
		[2, 1, 0, 0, 30824],
		[1, 0, -1, 0, -8379],
		[1, 1, 0, 0, -16675],
		[2, -1, 1, 0, -12831],
		[2, 0, 2, 0, -10445],
		[4, 0, 0, 0, -11650],
		[2, 0, -3, 0, 14403],
		[0, 1, -2, 0, -7003],
		[2, -1, -2, 0, 10056],
		[1, 0, 1, 0, 6322],
		[2, -2, 0, 0, -9884],
		[0, 1, 2, 0, 5751],
		[2, -2, -1, 0, -4950],
		[2, 0, 1, -2, 4130],
		[4, -1, -1, 0, -3958],
		[3, 0, -1, 0, 3258],
		[2, 1, 1, 0, 2616],
		[4, -1, -2, 0, -1897],
		[0, 2, -1, 0, -2117],
		[2, 2, -1, 0, 2354],
		[4, 0, 1, 0, -1423],
		[0, 0, 4, 0, -1117],
		[4, -1, 0, 0, -1571],
		[1, 0, -2, 0, -1739],
		[0, 0, 2, -2, -4421],
		[0, 2, 1, 0, 1165],
		[2, 0, -1, -2, 8752]
	];

	//conatins a list of perodic terms for the latitude of the moon
	//values are in 0.000001 degrees (10^-6)
	const periodicLatitudes = [
		[0, 0, 0, 1, 5128122],
		[0, 0, 1, 1, 280602],
		[0, 0, 1, -1, 277693],
		[2, 0, 0, -1, 173237],
		[2, 0, -1, 1, 55413],
		[2, 0, -1, -1, 46271],
		[2, 0, 0, 1, 32573],
		[0, 0, 2, 1, 17198],
		[2, 0, 1, -1, 9266],
		[0, 0, 2, -1, 8822],
		[2, -1, 0, -1, 8216],
		[2, 0, -2, -1, 4324],
		[2, 0, 1, 1, 4200],
		[2, 1, 0, -1, -3359],
		[2, -1, -1, 1, 2463],
		[2, -1, 0, 1, 2211],
		[2, -1, -1, -1, 2065],
		[0, 1, -1, -1, -1870],
		[4, 0, -1, -1, 1828],
		[0, 1, 0, 1, -1794],
		[0, 0, 0, 3, -1749],
		[0, 1, -1, 1, -1565],
		[1, 0, 0, 1, -1491],
		[0, 1, 1, 1, -1475],
		[0, 1, 1, -1, -1410],
		[0, 1, 0, -1, -1344],
		[1, 0, 0, -1, -1335],
		[0, 0, 3, 1, 1107],
		[4, 0, 0, -1, 1021],
		[4, 0, -1, 1, 833],
		[0, 0, 1, -3, 777],
		[4, 0, -2, 1, 671],
		[2, 0, 0, -3, 607],
		[2, 0, 2, -1, 596],
		[2, -1, 1, -1, 491],
		[2, 0, -2, 1, -451],
		[0, 0, 3, -1, 439],
		[2, 0, 2, 1, 422],
		[2, 0, -3, -1, 421],
		[2, 1, -1, 1, -366],
		[2, 1, 0, 1, -351],
		[4, 0, 0, 1, 331],
		[2, -1, 1, 1, 315],
		[2, -2, 0, -1, 302],
		[0, 0, 1, 3, -283],
		[2, 1, 1, -1, -229],
		[1, 1, 0, -1, 223],
		[1, 1, 0, 1, 223],
		[0, 1, -2, -1, -220],
		[2, 1, -1, -1, -220],
		[1, 0, 1, 1, -185],
		[2, -1, -2, -1, 181],
		[0, 1, 2, 1, -177],
		[4, 0, -2, -1, 176],
		[4, -1, -1, -1, 166],
		[1, 0, 1, -1, -164],
		[4, 0, 1, -1, 132],
		[1, 0, -1, -1, -119],
		[4, -1, 0, -1, 115],
		[2, -2, 0, 1, 107]
	];

	function getEfromM(MCoefficient) {
		let eValue;
		const Mcoef = Math.abs(MCoefficient);
		if (Mcoef === 2) eValue = E ** 2;
		else if (Mcoef === 1) eValue = E;
		else eValue = 1;

		return eValue;
	}

	let sumOfLongitudes = 0;
	let sumOfLatitudes = 0;
	let sumofDistances = 0;

	//add longitudes with formula
	for (let i = 0; i < periodicLongitudes.length; i++) {
		const term = periodicLongitudes[i];
		const eValue = getEfromM(term[1]);

		sumOfLongitudes += term[4] * eValue * sin(term[0] * D + term[1] * M + term[2] * Mp + term[3] * F);
	}

	//add latitudes with formula
	for (let i = 0; i < periodicLatitudes.length; i++) {
		const term = periodicLatitudes[i];
		const eValue = getEfromM(term[1]);

		sumOfLatitudes += term[4] * eValue * sin(term[0] * D + term[1] * M + term[2] * Mp + term[3] * F);
	}

	//add distances with formula
	for (let i = 0; i < periodicDistances.length; i++) {
		const term = periodicDistances[i];
		const eValue = getEfromM(term[1]);

		sumofDistances += term[4] * eValue * cos(term[0] * D + term[1] * M + term[2] * Mp + term[3] * F);
	}

	sumOfLongitudes += 3958 * sin(A1); //Venus
	sumOfLongitudes += 1962 * sin(Lp - F); //Flattening of Earth
	sumOfLongitudes += 318 * sin(A2); //Jupiter

	sumOfLatitudes += -2235 * sin(Lp); //Flattening of Earth
	sumOfLatitudes += 382 * sin(A3); //not sure lol
	sumOfLatitudes += 175 * sin(A1 - F); //Venus
	sumOfLatitudes += 175 * sin(A1 + F); //Venus
	sumOfLatitudes += 127 * sin(Lp - Mp); //Flattening of Earth
	sumOfLatitudes += -115 * sin(Lp + Mp); //Flattening of Earth

	const { trueObliquity, longitudeNutation } = getObliquity(time);
	const EclipticLongitude = Lp + sumOfLongitudes / 10 ** 6 + longitudeNutation;
	const EclipticLatitude = sumOfLatitudes / 10 ** 6;
	const distanceKilometers = 385000.56 + sumofDistances / 10 ** 3;
	//Equatorial Horizontal Parallax = EHP
	const EHP = radToDeg(Math.asin(6378.14 / distanceKilometers));

	//converting from Ecliptic to Equatorial coordinates
	const { rightAscension, declination } = eclipticToEquatorial(EclipticLongitude, EclipticLatitude, trueObliquity);

	const { latitude, longitude } = getZenithPoint(time, rightAscension, declination);

	return {
		latitude,
		longitude,
		rightAscension,
		declination,
		EclipticLatitude,
		EclipticLongitude,
		distance,
		EHP
	};
}

module.exports = getMoonPosition;

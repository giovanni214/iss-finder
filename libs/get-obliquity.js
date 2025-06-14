// CRITICAL FIX: Added arcSecToDeg to the import list
const { sin, cos, arcSecToDeg } = require("./math");
const { dateToJulian } = require("./dates");

function getObliquity(time = new Date()) {
	const JDE = dateToJulian(time);
	const T = (JDE - 2451545) / 36525;

	// Mean elongation of the Moon from the Sun
	const D = 297.85036 + 445267.11148 * T - 0.0019142 * T ** 2 + T ** 3 / 189474;

	// Mean anomaly of the Sun (Earth)
	const M = 357.52772 + 35999.05034 * T - 0.0001603 * T ** 2 - T ** 3 / 300000;

	// Mean anomaly of the Moon
	const Mp = 134.96298 + 477198.867398 * T + 0.0086972 * T ** 2 + T ** 3 / 56250;

	// Moon's argument of latitude
	const F = 93.27191 + 483202.017538 * T - 0.0036825 * T ** 2 + T ** 3 / 327270;

	// Longitude of the ascending node of the Moon's mean orbit on the ecliptic
	const Omega = 125.04452 - 1934.136261 * T + 0.0020708 * T ** 2 + T ** 3 / 450000;

	// Periodic terms for the nutation in longitude (Δψ)
	const lonT = [
		[0, 0, 0, 0, 1, -171996, -174.2],
		[-2, 0, 0, 2, 2, -13187, -1.6],
		[0, 0, 0, 2, 2, -2274, -0.2],
		[0, 0, 0, 0, 2, 2062, 0.2],
		[0, 1, 0, 0, 0, 1426, -3.4],
		[0, 0, 1, 0, 0, 712, 0.1],
		[-2, 1, 0, 2, 2, -517, 1.2],
		[0, 0, 0, 2, 1, -386, -0.4],
		[0, 0, 1, 2, 2, -301],
		[-2, -1, 0, 2, 2, 217, -0.5],
		[-2, 0, 1, 0, 0, -158],
		[-2, 0, 0, 2, 1, 129, 0.1],
		[0, 0, -1, 2, 2, 123],
		[2, 0, 0, 0, 0, 63],
		[0, 0, 1, 0, 1, 63, 0.1],
		[2, 0, -1, 2, 2, -59],
		[0, 0, -1, 0, 1, -58, -0.1],
		[0, 0, 1, 2, 1, -51],
		[-2, 0, 2, 0, 0, 48],
		[0, 0, -2, 2, 1, 46],
		[2, 0, 0, 2, 2, -38],
		[0, 0, 2, 2, 2, -31],
		[0, 0, 2, 0, 0, 29],
		[-2, 0, 1, 2, 2, 29],
		[0, 0, 0, 2, 0, 26],
		[-2, 0, 0, 2, 0, -22],
		[0, 0, -1, 2, 1, 21],
		[0, 2, 0, 0, 0, 17, -0.1],
		[2, 0, -1, 0, 1, 16],
		[-2, 2, 0, 2, 2, -16, 0.1],
		[0, 1, 0, 0, 1, -15],
		[-2, 0, 1, 0, 1, -13],
		[0, -1, 0, 0, 1, -12],
		[0, 0, 2, -2, 0, 11],
		[2, 0, -1, 2, 1, -10],
		[2, 0, 1, 2, 2, -8],
		[0, 1, 0, 2, 2, 7],
		[-2, 1, 1, 0, 0, -7],
		[0, -1, 0, 2, 2, -7],
		[2, 0, 0, 2, 1, -7],
		[2, 0, 1, 0, 0, 6],
		[-2, 0, 2, 2, 2, 6],
		[-2, 0, 1, 2, 1, 6],
		[2, 0, -2, 0, 1, -6],
		[2, 0, 0, 0, 1, -6],
		[0, -1, 1, 0, 0, 5],
		[-2, -1, 0, 2, 1, -5],
		[-2, 0, 0, 0, 1, -5],
		[0, 0, 2, 2, 1, -5],
		[-2, 0, 2, 0, 1, 4],
		[-2, 1, 0, 2, 1, 4],
		[0, 0, 1, -2, 0, 4],
		[-1, 0, 1, 0, 0, -4],
		[-2, 1, 0, 0, 0, -4],
		[1, 0, 0, 0, 0, -4],
		[0, 0, 1, 2, 0, 3],
		[0, 0, -2, 2, 2, -3],
		[-1, -1, 1, 0, 0, -3],
		[0, 1, 1, 0, 0, -3],
		[0, -1, 1, 2, 2, -3],
		[2, -1, -1, 2, 2, -3],
		[0, 0, 3, 2, 2, -3],
		[2, -1, 0, 2, 2, -3],
	];

	// Periodic terms for the nutation in obliquity (Δε)
	const oblT = [
		[0, 0, 0, 0, 1, 92025, 8.9],
		[-2, 0, 0, 2, 2, 5736, -3.1],
		[0, 0, 0, 2, 2, 977, -0.5],
		[0, 0, 0, 0, 2, -895, 0.5],
		[0, 1, 0, 0, 0, -87, 0.5],
		[0, 0, 1, 0, 0, -7],
		[-2, 1, 0, 2, 2, 224, -0.6],
		[0, 0, 0, 2, 1, 200],
		[0, 0, 1, 2, 2, 129, -0.1],
		[-2, -1, 0, 2, 2, -95, 0.3],
		[-2, 0, 0, 2, 1, -70],
		[0, 0, -1, 2, 2, -53],
		[0, 0, 1, 0, 1, -33],
		[2, 0, -1, 2, 2, 26],
		[0, 0, -1, 0, 1, 32],
		[0, 0, 1, 2, 1, 27],
		[0, 0, -2, 2, 1, -24],
		[2, 0, 0, 2, 2, 16],
		[0, 0, 2, 2, 2, 13],
		[-2, 0, 1, 2, 2, -12],
		[0, 0, -1, 2, 1, -10],
		[2, 0, -1, 0, 1, -8],
		[-2, 2, 0, 2, 2, 7],
		[0, 1, 0, 0, 1, 9],
		[-2, 0, 1, 0, 1, 7],
		[0, -1, 0, 0, 1, 6],
		[2, 0, -1, 2, 1, 5],
		[2, 0, 1, 2, 2, 3],
		[0, 1, 0, 2, 2, -3],
		[0, -1, 0, 2, 2, 3],
		[2, 0, 0, 2, 1, 3],
		[-2, 0, 2, 2, 2, -3],
		[-2, 0, 1, 2, 1, -3],
		[2, 0, -2, 0, 1, 3],
		[2, 0, 0, 0, 1, 3],
		[-2, -1, 0, 2, 1, 3],
		[-2, 0, 0, 0, 1, 3],
		[0, 0, 2, 2, 1, 3],
	];

	let sumOfLongitudes = 0; // in 0.0001"
	let sumOfObliquity = 0; // in 0.0001"

	for (const term of lonT) {
		const S_t = term[5] || 0;
		const C_t = term[6] || 0;
		const angle = term[0] * D + term[1] * M + term[2] * Mp + term[3] * F + term[4] * Omega;
		sumOfLongitudes += (S_t + C_t * T) * sin(angle);
	}

	for (const term of oblT) {
		const S_t = term[5] || 0;
		const C_t = term[6] || 0;
		const angle = term[0] * D + term[1] * M + term[2] * Mp + term[3] * F + term[4] * Omega;
		sumOfObliquity += (S_t + C_t * T) * cos(angle);
	}

	// Convert from 0.0001" to degrees
	const longitudeNutation = sumOfLongitudes / 10000 / 3600;
	const obliquityNutation = sumOfObliquity / 10000 / 3600;

	const U = T / 100;
	// Calculate Mean Obliquity of the Ecliptic (E0)
	const E0 =
		23.43929111 -
		arcSecToDeg(4680.93) * U -
		arcSecToDeg(1.55) * U ** 2 +
		arcSecToDeg(1999.25) * U ** 3 -
		arcSecToDeg(51.38) * U ** 4 -
		arcSecToDeg(249.67) * U ** 5 -
		arcSecToDeg(39.05) * U ** 6 +
		arcSecToDeg(7.12) * U ** 7 +
		arcSecToDeg(27.87) * U ** 8 +
		arcSecToDeg(5.79) * U ** 9 +
		arcSecToDeg(2.45) * U ** 10;

	// True Obliquity = Mean Obliquity + Nutation in Obliquity
	const trueObliquity = E0 + obliquityNutation;

	return { trueObliquity, longitudeNutation };
}

module.exports = getObliquity;

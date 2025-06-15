// in libs/get-moon-phase.js

const { sin, cos, acos, atan2, AuToKilometers, normalizeAngle } = require("./math"); // Add normalizeAngle
const getMoonPosition = require("./get-moon-position");
const getSunPosition = require("./get-sun-position");

/**
 * Calculates the phase of the Moon using Jean Meeus' algorithms.
 * @param {Date} [time=new Date()] The date for the calculation.
 * @returns An object containing detailed phase information.
 */
function getMoonPhase(time = new Date()) {
	const moon = getMoonPosition(time);
	const sun = getSunPosition(time);

	// Geocentric elongation of the Moon from the Sun (in degrees)
	const elongation = acos(cos(moon.eclipticLatitude) * cos(moon.eclipticLongitude - sun.apparentEclipticLongitude));

	// Phase angle of the Moon (i), from the Sun-Earth-Moon triangle
	const sunDistKm = AuToKilometers(sun.distanceAU);
	const i = atan2(sunDistKm * sin(elongation), moon.distanceKm - sunDistKm * cos(elongation));

	// Illuminated fraction of the Moon's disk (k).
	const k = (1 + cos(i)) / 2;

	// Position angle of the Moon's bright limb (x).
	const xNumerator = cos(sun.declination) * sin(sun.rightAscension - moon.rightAscension);
	const xDenominator =
		sin(sun.declination) * cos(moon.declination) -
		cos(sun.declination) * sin(moon.declination) * cos(sun.rightAscension - moon.rightAscension);
	const x = atan2(xNumerator, xDenominator);

	// --- THE FIX IS HERE ---

	// 1. Calculate the true cycle angle based on the difference in longitudes.
	// This is the value your drawing function needs (0-360).
	const cycleAngle = normalizeAngle(moon.eclipticLongitude - sun.apparentEclipticLongitude);

	// 2. Determine the direction based on this new cycle angle.
	const direction = cycleAngle >= 180 ? "Waning" : "Waxing";

	return {
		// The angle needed for drawing the shape correctly (0-360)
		cycleAngle: cycleAngle,

		// The angle at the moon's vertex, good for scientific data (0-180)
		illuminationAngle: i,

		// The "percentage" from 0.0 to 1.0
		illuminatedFraction: k,

		// The tilt of the crescent
		positionAngle: x,

		// "Waxing" or "Waning"
		direction,

		// Angular separation in the sky
		elongation
	};
}

module.exports = getMoonPhase;

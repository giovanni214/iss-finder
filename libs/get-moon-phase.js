const { sin, cos, acos, atan2, AuToKilometers } = require("./math");
const getMoonPosition = require("./get-moon-position");
const getSunPosition = require("./get-sun-position");

/**
 * Calculates the phase of the Moon.
 * @param {Date} [time=new Date()] The date for the calculation.
 * @returns An object containing phase info.
 */
function getMoonPhase(time = new Date()) {
	const moon = getMoonPosition(time);
	const sun = getSunPosition(time);

	// Geocentric elongation of the Moon from the Sun (in degrees)
	const elongation = acos(cos(moon.eclipticLatitude) * cos(moon.eclipticLongitude - sun.apparentEclipticLongitude));

	// Phase angle of the Moon (i), from the Sun-Earth-Moon triangle
	const sunDistKm = AuToKilometers(sun.distanceAU); // FIX: Use correct property name
	const i = atan2(sunDistKm * sin(elongation), moon.distanceKm - sunDistKm * cos(elongation)); // FIX: Use correct property name

	// Illuminated fraction of the Moon's disk (k).
	// 0.0 = New Moon, 1.0 = Full Moon.
	const k = (1 + cos(i)) / 2;

	// Position angle of the Moon's bright limb (x).
	// This determines the "tilt" of the crescent.
	const xNumerator = cos(sun.declination) * sin(sun.rightAscension - moon.rightAscension);
	const xDenominator =
		sin(sun.declination) * cos(moon.declination) -
		cos(sun.declination) * sin(moon.declination) * cos(sun.rightAscension - moon.rightAscension);
	const x = atan2(xNumerator, xDenominator);

	// Determine if the moon is waxing or waning efficiently.
	// This checks if the Moon is ahead of or behind the Sun in longitude.
	const longitudeDifference = moon.eclipticLongitude - sun.apparentEclipticLongitude;
	const direction = sin(longitudeDifference) >= 0 ? "Waning" : "Waxing";

	return {
		phaseAngle: i, // The angle of the moon's phase
		illuminatedFraction: k, // The "percentage" from 0.0 to 1.0
		positionAngle: x, // The tilt of the crescent
		direction, // "Waxing" or "Waning"
		elongation, // Angular separation of Sun and Moon
	};
}

module.exports = getMoonPhase;

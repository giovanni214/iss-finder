const { sin, cos, acos, atan2, AuToKilometers } = require("./utils");

const getMoonPosition = require("./get-moon-position");
const getSunPosition = require("./get-sun-position");

//Find direction checks if a moon is Waning or Waxing
function getMoonPhase(time, findDirection = true) {
	const moon = getMoonPosition(time);
	const sun = getSunPosition(time);

	//Geocentric elongation of the Moon From the Sun
	const elongation = acos(
		cos(moon.EclipticLatitude) *
			cos(moon.EclipticLongitude - sun.apparentLongitude)
	);

	//Phase angle of the moon (i)
	const R = AuToKilometers(sun.R);
	const i = atan2(R * sin(elongation), moon.distance - R * cos(elongation));

	//This is the illumination of the moon that is lit, you're welcome.
	const k = (1 + cos(i)) / 2;

	//Position angle of the Moon's midpoint of illumination (x)
	//This mumber can be used to calculate the tilt of the moon based off an observers language
	const xNumerator =
		cos(sun.declination) * sin(sun.rightAscension - moon.rightAscension);
	const xDenominator =
		sin(sun.declination) * cos(moon.declination) -
		cos(sun.declination) *
			sin(moon.declination) *
			cos(sun.rightAscension - moon.rightAscension);
	let x = atan2(xNumerator, xDenominator);
	if (x < 0) x += 360;

	//Run the function again in the future to see difference in k
	if (findDirection) {
		const futureMoon = getMoonPhase(time.getTime() + 1, false); //false prevents an infinite loop
		const direction = futureMoon.k - k > 0 ? "Waxing" : "Waning";
		return { i, k, x, direction };
	}

	return { i, k, x };
}

module.exports = getMoonPhase;

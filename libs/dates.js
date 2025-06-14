const {degToRad} = require("./math")

// It now takes the Julian Day as input
function greenwichTime(jd) {
	// 1. Calculate JD for the previous midnight
	const jd0 = Math.floor(jd - 0.5) + 0.5;
	// 2. Days since J2000.0
	const d = jd - 2451545.0;
	const d0 = jd0 - 2451545.0;
	// 3. Julian centuries since J2000.0
	const T = d / 36525.0;

	// 4. Calculate GMST in degrees
	let gmst = 280.46061837 + 360.98564736629 * d + 0.000387933 * T * T - (T * T * T) / 38710000;

	// 5. Normalize to 0-360 degrees
	return gmst - 360 * Math.floor(gmst / 360);
}

function dateToJulian(date) {
	return date / 86400000 + 2440587.5;
}

function julianToDate(julian) {
	const DAY = 86400000;
	const UNIX_EPOCH_JULIAN_DATE = 2440587.5;
	return new Date((Number(julian) - UNIX_EPOCH_JULIAN_DATE) * DAY);
}

function addDays(date, days) {
	var result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

module.exports = {
	greenwichTime,
  julianToDate,
	dateToJulian,
	addDays,
};

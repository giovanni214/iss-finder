const {degToRad} = require("./math")

function greenwichTime(date) {
	var tut1 = (date - 2451545.0) / 36525.0; //julian centuries from jan 1, 2000 12 h epoch
	var temp =
		-6.2e-6 * tut1 * tut1 * tut1 + 0.093104 * tut1 * tut1 + (876600.0 * 3600 + 8640184.812866) * tut1 + 67310.54841;
	temp = (degToRad(temp) / 240.0) % Math.PI * 2; // 360/86400 = 1/240, to deg, to rad

	//check quadrants
	if (temp < 0.0) {
		temp += Math.PI * 2;
	}

	return temp;
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

function radToDeg(radians) {
	return radians * (180 / Math.PI);
}

function degToRad(degrees) {
	return degrees * (Math.PI / 180);
}

function normalizeAngle(angle) {
	return angle - 360 * Math.floor(angle / 360);
}

//All trig functions but in degrees :)
function sin(x) {
	x = degToRad(x);
	return Math.sin(x);
}

function cos(x) {
	x = degToRad(x);
	return Math.cos(x);
}

function acos(x) {
	x = Math.acos(x);
	return radToDeg(x);
}

function atan2(y, x) {
	return radToDeg(Math.atan2(y, x));
}

function arcSecToDeg(x) {
	return x / 3600;
}

function AuToKilometers(x) {
	return x * 149597870;
}

module.exports = {
  radToDeg,
  degToRad,
  normalizeAngle,
  sin,
  cos,
  acos,
  atan2,
  arcSecToDeg,
  AuToKilometers
}
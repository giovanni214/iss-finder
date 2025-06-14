const { radToDeg } = require("./math");
const satellite = require("satellite.js");

async function getTLE(link, name) {
	const response = await fetch(link);
	if (!response.ok) {
		throw new Error(`Failed to fetch TLE data: ${response.statusText}`);
	}
	let data = await response.text();
	data = data.split(/\r?\n/).map((line) => line.trim()); // Simplified with .map
	const startOfData = data.indexOf(name);
	if (startOfData === -1) {
		throw new Error(`Satellite with name "${name}" not found in TLE data.`);
	}
	return [data[startOfData + 1], data[startOfData + 2]];
}

class Satellite {
	constructor(tle) {
		if (!tle || tle.length < 2) {
			throw new Error("Invalid TLE data provided to constructor.");
		}
		this.satrec = satellite.twoline2satrec(tle[0], tle[1]);
	}

	// Private helper for validation to keep code DRY
	_validateDate(time) {
		if (!(time instanceof Date) || isNaN(time)) {
			throw new Error(`"${time}" is not a valid date.`);
		}
	}

	getLocation(time, type = "latlon") {
		this._validateDate(time);

		const gmst = satellite.gstime(time);
		const { position, velocity } = satellite.propagate(this.satrec, time);

		if (type === "latlon") {
			const latlon = satellite.eciToGeodetic(position, gmst);
			latlon.latitude = satellite.degreesLat(latlon.latitude);
			latlon.longitude = satellite.degreesLong(latlon.longitude);
			return latlon;
		}
		if (type === "eci") {
			return { position, velocity };
		}
		if (type === "ecf") {
			return satellite.eciToEcf(position, gmst);
		}
		throw new Error(`Invalid location type "${type}" specified.`);
	}

	predict(
		location,
		startTime,
		endTime,
		stepSeconds = 30,
		minElevationAngle = 0
	) {
		this._validateDate(startTime);
		this._validateDate(endTime);

		const stepMillis = stepSeconds * 1000;
		const startMillis = startTime.getTime();
		const endMillis = endTime.getTime();

		const passes = [];
		let currentPass = [];
		let peakElevation = -Infinity;

		for (
			let time = startMillis;
			time < endMillis;
			time += stepMillis
		) {
			const dateObj = new Date(time);
			const gmst = satellite.gstime(dateObj);
			const { position } = satellite.propagate(this.satrec, dateObj);
			const positionEcf = satellite.eciToEcf(position, gmst);
			const observerPOV = satellite.ecfToLookAngles(
				location,
				positionEcf
			);

			const elevation = radToDeg(observerPOV.elevation);

			if (elevation >= 0) {
				observerPOV.elevation = elevation;
				observerPOV.azimuth = radToDeg(observerPOV.azimuth);
				currentPass.push({ time: dateObj, ...observerPOV });

				if (elevation > peakElevation) {
					peakElevation = elevation;
				}
			} else {
				if (currentPass.length > 0) {
					passes.push({ peak: peakElevation, pass: currentPass });
					currentPass = [];
					peakElevation = -Infinity;
				}
			}
		}

		// BUG FIX: Save the final pass if it was still in progress when the loop ended.
		if (currentPass.length > 0) {
			passes.push({ peak: peakElevation, pass: currentPass });
		}

		return passes.filter((pass) => pass.peak >= minElevationAngle);
	}
}

// Example function remains the same, it was already correct.
async function predictISS() {
	const tleData = await getTLE(
		"https://celestrak.org/NORAD/elements/gp.php?CATNR=25544",
		"ISS (ZARYA)"
	);
	const iss = new Satellite(tleData);
	const oneDayInMillis = 86400000;
	const startTime = new Date();
	const endTime = new Date(startTime.getTime() + oneDayInMillis * 10);
	const mylocation = {
		latitude: satellite.degreesToRadians(36.527279),
		longitude: satellite.degreesToRadians(-87.360336),
		height: 0.15, // in kilometers
	};

	const passes = iss.predict(mylocation, startTime, endTime, 30, 15);
	console.log(
		`Found ${passes.length} passes of the ISS over the next 10 days.`
	);
	// console.log(passes);
}

module.exports = Satellite;

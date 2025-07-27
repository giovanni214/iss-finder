const { radToDeg } = require("./math");
const satellite = require("satellite.js");

// ... (getTLE, constructor, _validateDate, getLocation methods are all fine) ...

class Satellite {
	constructor(tle) {
		if (!tle || tle.length < 2) {
			throw new Error("Invalid TLE data provided to constructor.");
		}
		this.satrec = satellite.twoline2satrec(tle[0], tle[1]);
		if (this.satrec.error) {
			// Added error checking for robustness
			throw new Error(`TLE Parsing Error: ${this.satrec.error}`);
		}
	}

	_validateDate(time) {
		if (!(time instanceof Date) || isNaN(time)) {
			throw new Error(`"${time}" is not a valid date.`);
		}
	}

	getLocation(time, type = "latlon") {
		// This function was already correct
		this._validateDate(time);
		const gmst = satellite.gstime(time);
		const positionAndVelocity = satellite.propagate(this.satrec, time);
		if (positionAndVelocity === false) {
			return false;
		}
		const { position } = positionAndVelocity;
		if (type === "latlon") {
			const latlon = satellite.eciToGeodetic(position, gmst);
			latlon.latitude = satellite.degreesLat(latlon.latitude);
			latlon.longitude = satellite.degreesLong(latlon.longitude);
			return latlon;
		}
		if (type === "ecf") {
			return satellite.eciToEcf(position, gmst);
		}
		throw new Error(`Invalid location type "${type}" specified.`);
	}

	predict(location, startTime, endTime, stepSeconds = 30, minElevationAngle = 0) {
		this._validateDate(startTime);
		this._validateDate(endTime);

		const stepMillis = stepSeconds * 1000;
		const startMillis = startTime.getTime();
		const endMillis = endTime.getTime();

		const passes = [];
		let currentPass = [];
		let peakElevation = -Infinity;

		for (let time = startMillis; time < endMillis; time += stepMillis) {
			const dateObj = new Date(time);
			const gmst = satellite.gstime(dateObj);

			const positionAndVelocity = satellite.propagate(this.satrec, dateObj);
			if (positionAndVelocity === false) {
				// Skips this step if the satellite has decayed
				continue;
			}

			const positionEcf = satellite.eciToEcf(positionAndVelocity.position, gmst);

			// ✅ FIX: This is the correct usage per the documentation.
			// The observer `location` must be GEODETIC.
			const observerPOV = satellite.ecfToLookAngles(location, positionEcf);

			const elevation = radToDeg(observerPOV.elevation);

			if (elevation >= 0) {
				observerPOV.elevation = elevation;
				observerPOV.azimuth = radToDeg(observerPOV.azimuth);
				currentPass.push({ time: dateObj.getTime(), ...observerPOV });

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

		if (currentPass.length > 0) {
			passes.push({ peak: peakElevation, pass: currentPass });
		}

		return passes.filter((pass) => pass.peak >= minElevationAngle);
	}
}

module.exports = Satellite;

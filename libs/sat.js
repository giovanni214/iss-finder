const { radToDeg } = require("./math");
const satellite = require("satellite.js");
const getSunPosition = require("./get-sun-position.js"); // For Sun calculations

// --- Physical Constants ---
const AU_IN_KM = 149597870.7;
const EARTH_RADIUS_KM = 6371.0084; // WGS84 mean radius

// --- Helper Functions for Eclipse Calculation ---

/**\
 * Converts the Sun's astronomical coordinates (RA, Dec) to an ECI vector.
 * @param {number} ra_deg - Right Ascension in degrees.
 * @param {number} dec_deg - Declination in degrees.
 * @param {number} dist_au - Distance in Astronomical Units.
 * @returns {object} The Sun's position vector {x, y, z} in km.
 */
function getSunEciVector(ra_deg, dec_deg, dist_au) {
	const ra_rad = satellite.degreesToRadians(ra_deg);
	const dec_rad = satellite.degreesToRadians(dec_deg);
	const dist_km = dist_au * AU_IN_KM;

	const x = dist_km * Math.cos(dec_rad) * Math.cos(ra_rad);
	const y = dist_km * Math.cos(dec_rad) * Math.sin(ra_rad);
	const z = dist_km * Math.sin(dec_rad);

	return { x, y, z };
}

/**
 * Determines if a satellite is in the Earth's shadow using a cylindrical model.
 * @param {object} satEciPos - The satellite's ECI position vector {x, y, z} in km.
 * @param {object} sunEciPos - The Sun's ECI position vector {x, y, z} in km.
 * @returns {boolean} True if the satellite is in shadow, false otherwise.
 */
function isSatInSunShadow(satEciPos, sunEciPos) {
	const dot = (v1, v2) => v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
	const sunDist = Math.sqrt(dot(sunEciPos, sunEciPos));
	const sunUnitVector = { x: sunEciPos.x / sunDist, y: sunEciPos.y / sunDist, z: sunEciPos.z / sunDist };

	// Project satellite's position onto the Sun vector.
	// A positive value means it's on the sunlit side of Earth.
	const satProjection = dot(satEciPos, sunUnitVector);
	if (satProjection >= 0) {
		return false;
	}

	// Use Pythagorean theorem to find the satellite's perpendicular distance
	// from the Earth-Sun line. If it's less than Earth's radius, it's in the shadow.
	const satDistanceSquared = dot(satEciPos, satEciPos);
	const perpendicularDistSq = satDistanceSquared - satProjection * satProjection;

	return perpendicularDistSq < EARTH_RADIUS_KM * EARTH_RADIUS_KM;
}

class Satellite {
	constructor(tle) {
		if (!tle || tle.length < 2) {
			throw new Error("Invalid TLE data provided to constructor.");
		}
		this.satrec = satellite.twoline2satrec(tle[0], tle[1]);
		if (this.satrec.error) {
			throw new Error(`TLE Parsing Error: ${this.satrec.error}`);
		}
	}

	_validateDate(time) {
		if (!(time instanceof Date) || isNaN(time)) {
			throw new Error(`"${time}" is not a valid date.`);
		}
	}

	getLocation(time, type = "latlon") {
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
				continue; // Satellite has decayed, skip this step
			}

			// We need the ECI position for the shadow calculation
			const positionEci = positionAndVelocity.position;
			const positionEcf = satellite.eciToEcf(positionEci, gmst);
			const observerPOV = satellite.ecfToLookAngles(location, positionEcf);

			const elevation = radToDeg(observerPOV.elevation);

			if (elevation >= 0) {
				// --- ✨ ECLIPSE CALCULATION ADDED HERE ---
				// 1. Get the Sun's position for the current time
				const sunData = getSunPosition(dateObj); // Returns { ra, dec, distance }

				// 2. Convert Sun's coordinates to an ECI vector
				const sunEciPosition = getSunEciVector(sunData.rightAscension, sunData.declination, sunData.distanceAU);

				// 3. Determine if the satellite is in shadow
				const isEclipsed = isSatInSunShadow(positionEci, sunEciPosition);
				// --- END ECLIPSE CALCULATION ---

				observerPOV.elevation = elevation;
				observerPOV.azimuth = radToDeg(observerPOV.azimuth);

				// Add the eclipse status to the pass data point
				currentPass.push({
					time: dateObj.getTime(),
					...observerPOV,
					isEclipsed: isEclipsed // ✅ New property
				});

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

// libs/sat.js

const { radToDeg } = require("./math");
const satellite = require("satellite.js");
const { dateToJulian, greenwichTime } = require("./dates.js");
const getSunPosition = require("./get-sun-position.js"); // For Sun calculations

// --- Physical Constants ---
const AU_IN_KM = 149597870.7;
const EARTH_RADIUS_KM = 6371.0084; // WGS84 mean radius
const SUN_RADIUS_KM = 696340; // Sun's mean radius

// --- Helper Functions for Eclipse Calculation ---

/**
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

function isSatInSunShadow(satEciPos, sunEciPos) {
	const dot = (v1, v2) => v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
	const sunDist = Math.sqrt(dot(sunEciPos, sunEciPos));
	const sunUnitVector = {
		x: sunEciPos.x / sunDist,
		y: sunEciPos.y / sunDist,
		z: sunEciPos.z / sunDist
	};

	// Project the satellite's position onto the Sun vector.
	// A positive value means the satellite is on the sunlit side of Earth.
	const satProjection = dot(satEciPos, sunUnitVector);
	if (satProjection >= 0) {
		return false;
	}

	// Calculate the angle of the penumbra cone (the region of partial shadow).
	const penumbraAngle = Math.atan((SUN_RADIUS_KM + EARTH_RADIUS_KM) / sunDist);

	// Calculate the radius of the penumbra at the satellite's distance.
	const penumbraRadius = Math.abs(satProjection) * Math.tan(penumbraAngle);

	// Use Pythagorean theorem to find the satellite's perpendicular distance
	// from the Earth-Sun line.
	const satDistanceSquared = dot(satEciPos, satEciPos);
	const perpendicularDistSq = satDistanceSquared - satProjection * satProjection;
	const perpendicularDist = Math.sqrt(perpendicularDistSq);

	// The satellite is in shadow if its distance from the Earth-Sun line
	// is less than the radius of the penumbra at that point.
	return perpendicularDist < penumbraRadius;
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
		const JDE = dateToJulian(time);
		const gmst = greenwichTime(JDE);
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

	predict(location, startTime, endTime, options = {}) {
		this._validateDate(startTime);
		this._validateDate(endTime);

		const {
			stepSeconds = 30,
			minElevationAngle = 0,
			tleCache = [] // Expect a pre-loaded TLE cache
		} = options;

		if (!tleCache || tleCache.length === 0) {
			throw new Error("A non-empty tleCache must be provided for predictions.");
		}

		const stepMillis = stepSeconds * 1000;
		const startMillis = startTime.getTime();
		const endMillis = endTime.getTime();

		const passes = [];
		let currentPass = [];
		let peakElevation = -Infinity;
		let tleIndex = 0; // Use an index to efficiently find the next TLE

		for (let time = startMillis; time < endMillis; time += stepMillis) {
			const dateObj = new Date(time);

			// --- Efficient in-memory TLE search ---
			// Advance our TLE index as we move forward in time
			while (tleIndex < tleCache.length - 1 && tleCache[tleIndex + 1].date.getTime() <= time) {
				tleIndex++;
			}
			const currentTle = tleCache[tleIndex].tle;
			this.satrec = satellite.twoline2satrec(currentTle[0], currentTle[1]);
			// --- End of efficient search ---

			const JDE = dateToJulian(dateObj);
			const gmst = greenwichTime(JDE);

			const positionAndVelocity = satellite.propagate(this.satrec, dateObj);
			if (!positionAndVelocity.position) {
				continue;
			}

			const positionEci = positionAndVelocity.position;
			const positionEcf = satellite.eciToEcf(positionEci, gmst);
			const observerPOV = satellite.ecfToLookAngles(location, positionEcf);
			const elevation = radToDeg(observerPOV.elevation);

			if (elevation >= 0) {
				const sunData = getSunPosition(dateObj);
				const sunEciPosition = getSunEciVector(sunData.rightAscension, sunData.declination, sunData.distanceAU);
				const eclipseStatus = isSatInSunShadow(positionEci, sunEciPosition);

				observerPOV.elevation = elevation;
				observerPOV.azimuth = radToDeg(observerPOV.azimuth);

				currentPass.push({
					time: dateObj.getTime(),
					...observerPOV,
					isInShadow: eclipseStatus,
					humanTime: dateObj.toLocaleString("en-US", { timeZone: "America/Chicago" })
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

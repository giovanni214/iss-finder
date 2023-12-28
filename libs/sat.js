const { radToDeg } = require("./math");
const satellite = require("satellite.js");

const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
async function getTLE(link, name) {
	let data = await (await fetch(link)).text();
	data = data.split(/\r?\n/);
	for (let i = 0; i < data.length; i++) data[i] = data[i].trim();
	const startOfData = data.indexOf(name);
	if (startOfData === -1) return;
	return [data[startOfData + 1], data[startOfData + 2]];
}

class Satellite {
	constructor(tle) {
		this.satrec = satellite.twoline2satrec(tle[0], tle[1]);
	}

	getLocation(time, type = "latlon") {
		if (!(time instanceof Date) || isNaN(time)) {
			throw new Error(`"${time}" is not a valid date.`);
		}

		const gmst = satellite.gstime(time);
		//ECI coordinates (x, y, z) for satellite
		let { position, velocity } = satellite.propagate(this.satrec, time);

		if (type === "latlon") {
			//converting it to human readable format
			let latlon = satellite.eciToGeodetic(position, gmst);
			latlon.latitude = satellite.degreesLat(latlon.latitude);
			latlon.longitude = satellite.degreesLong(latlon.longitude);
			return latlon;
		} else if (type === "eci") {
			return { position, velocity };
		} else if (type === "ecf") {
			return satellite.eciToEcf(position, gmst);
		}
	}

	/*
	location MUST be like this
	const observerGd = {
		longitude: satellite.degreesToRadians(-122.0308),
		latitude: satellite.degreesToRadians(36.9613422),
		height: 0.370
	};
	*/
	predict(
		location, //Should be like observerGd above
		startTime, //Should be in Date() format
		endTime, // Should be in Date() format
		errorInSeconds = 30,
		minElevationAngle = 0
	) {
		//check for missing properties needed for calculation
		let missing = [];
		const observerGdKeys = ["latitude", "longitude", "height"];
		const locationKeys = Object.keys(location);
		observerGdKeys.forEach((key) => {
			if (!locationKeys.includes(key)) missing.push(key);
		});

		if (missing.length > 0) {
			const missingStr = missing.join(", ");
			throw new Error(`Missing {${missingStr}} ${missing.length === 1 ? "property" : "properties"} from object.`);
		}

		if (!(startTime instanceof Date) || isNaN(startTime)) {
			throw new Error(`"${startTime}" is not a valid date.`);
		}

		if (!(endTime instanceof Date) || isNaN(endTime)) {
			throw new Error(`"${endTime}" is not a valid date.`);
		}

		errorInSeconds *= 1000; //1second = 1000millis
		startTime = startTime.getTime(); //convert to millis
		endTime = endTime.getTime();

		let passes = [];
		let pass = [];
		let peak = -Infinity;
		for (let time = startTime; time < endTime; time += errorInSeconds) {
			//grab the satellite position relative to you
			const position = this.getLocation(new Date(time), "ecf");
			const observerPOV = satellite.ecfToLookAngles(location, position);
			observerPOV.elevation = radToDeg(observerPOV.elevation); //no one likes radians
			observerPOV.azimuth = radToDeg(observerPOV.azimuth);

			//Check if satellite is above the horizon, if it is then add to array
			if (observerPOV.elevation >= 0) {
				pass.push({
					time,
					...observerPOV
				});

				//checking for the peak elevation to filter later
				if (observerPOV.elevation > peak) {
					peak = observerPOV.elevation;
				}
			} else {
				//check to see if this is the end of a pass, if so add it to the full list
				if (pass.length > 0) {
					passes.push({ peak, pass });
					pass = [];
					peak = -Infinity;
				}
			}
		}

		//Checking to see if passes meet the elevation requirement
		passes = passes.filter((pass) => pass.peak > minElevationAngle);
		return passes;
	}
}

//example function to predict the ISS
async function predictISS() {
	//ISS (ZARYA) from https://celestrak.org/NORAD/elements/gp.php?CATNR=25544
	const tleData = await getTLE("https://celestrak.org/NORAD/elements/gp.php?CATNR=25544", "ISS (ZARYA)");
	const iss = new Satellite(tleData);
	const oneDayInMillis = 86400000;
	const startTime = new Date();
	const endTime = new Date(startTime.getTime() + oneDayInMillis * 10); //10 days later
	const mylocation = {
		latitude: satellite.degreesToRadians(36.527279),
		longitude: satellite.degreesToRadians(-87.360336),
		height: 0.15 //kilometers
	};

	let passes = iss.predict(mylocation, startTime, endTime, 30, 15);
	console.log(passes);
}

module.exports = Satellite;

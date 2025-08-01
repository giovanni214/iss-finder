// server.js

const express = require("express");
const path = require("path"); // Import the 'path' module
const { findClosestTle } = require("./tle-date-finder"); // Import your TLE finder module
const { generateMapImage } = require("./map-generator");
const getSunPosition = require("./libs/get-sun-position");
const getMoonPosition = require("./libs/get-moon-position");
const getMoonPhase = require("./libs/get-moon-phase");
const satellite = require("satellite.js");
const Satellite = require("./libs/sat");

const app = express();
const port = 5000;

function getSunEciVector(ra_deg, dec_deg, dist_au) {
    const AU_IN_KM = 149597870.7;
    const ra_rad = satellite.degreesToRadians(ra_deg);
    const dec_rad = satellite.degreesToRadians(dec_deg);
    const dist_km = dist_au * AU_IN_KM;
    const x = dist_km * Math.cos(dec_rad) * Math.cos(ra_rad);
    const y = dist_km * Math.cos(dec_rad) * Math.sin(ra_rad);
    const z = dist_km * Math.sin(dec_rad);
    return { x, y, z };
}

// Your /map route remains the same
app.get("/map", async (__, res) => {
    try {
        const currentTime = new Date();
        const sunData = getSunPosition(currentTime);
        const moonData = getMoonPosition(currentTime);
        const moonPhase = getMoonPhase(currentTime);
        
        // Dynamically find the TLE for the map as well
        const tleFilePath = path.join(__dirname, 'iss_tle.txt');
        const tleResult = findClosestTle(tleFilePath, currentTime.getTime());

        if (!tleResult) {
            throw new Error("Could not find a suitable TLE for the current time in zarya.txt");
        }

        const iss = new Satellite(tleResult.tle);
        
        const imageBuffer = await generateMapImage({ sunData, moonData, moonPhase, iss, currentTime });
        res.setHeader("Content-Type", "image/png");
        res.send(imageBuffer);
    } catch (error) {
        console.error("Failed to generate map:", error);
        res.status(500).send("Error generating map.");
    }
});


app.get("/predict", async (__, res) => {
    try {
        // Define the prediction window
        const startTime = new Date(Date.UTC(2025, 6, 18, 0, 0, 0)); // July is month 6
        const endTime = new Date(Date.UTC(2025, 6, 19, 0, 0, 0));

        // --- DYNAMIC TLE LOOKUP ---
        const tleFilePath = path.join(__dirname, 'iss_tle.txt');
        const tleResult = findClosestTle(tleFilePath, startTime.getTime());

        // Error handling if no TLE is found
        if (!tleResult) {
            return res.status(404).json({ error: `No TLE found in zarya.txt on or before ${startTime.toUTCString()}` });
        }
        
        const tleData = tleResult.tle;
        const iss = new Satellite(tleData);
        // --- END DYNAMIC TLE LOOKUP ---

        const mylocation = {
            latitude: satellite.degreesToRadians(36.58018),
            longitude: satellite.degreesToRadians(-87.21605),
            height: 0.15
        };

        const allPasses = iss.predict(mylocation, startTime, endTime, 30, 15);
        const visiblePasses = [];

        for (const pass of allPasses) {
            let isPassVisible = false;
            for (const point of pass.pass) {
                if (point.isInShadow) continue;

                const time = new Date(point.time);
                const sunData = getSunPosition(time);
                const sunEci = getSunEciVector(sunData.rightAscension, sunData.declination, sunData.distanceAU);
                const gmst = satellite.gstime(time);
                const sunEcf = satellite.eciToEcf(sunEci, gmst);
                const sunLookAngles = satellite.ecfToLookAngles(mylocation, sunEcf);

                if (satellite.degreesLat(sunLookAngles.elevation) < -6) {
                    isPassVisible = true;
                    break;
                }
            }
            if (isPassVisible) {
                visiblePasses.push(pass);
            }
        }

        console.log(`Using TLE from ${tleResult.date.toUTCString()} (Age: ${tleResult.ageDays.toFixed(2)} days)`);
        console.log(tleData[0]);
        console.log("--- Found Visible Pass (Historical) ---");

        const timeZone = "America/Chicago";
        for (let pass of visiblePasses) {
            const passStartTime = new Date(pass.pass[0].time);
            const formattedTime = passStartTime.toLocaleString("en-US", { timeZone, hour12: true, month: 'numeric', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
            console.log(`Visible pass starts at: ${formattedTime}`);
        }

        res.json(visiblePasses);

    } catch (error) {
        console.error("Error during prediction:", error);
        res.status(500).json({ error: "An error occurred during prediction." });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}. Access map at http://localhost:${port}/map`);
});
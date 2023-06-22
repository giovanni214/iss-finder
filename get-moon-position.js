const { radToDeg, degToRad, getJulianDate, obliquity } = require("./utils");
const satellite = require("satellite.js");

function getObliquity(time = new Date()) {
  const JDE = getJulianDate(time); //julian date
  const T = (JDE - 2451545) / 36525;

  //Mean elongation of the Moon from the Sun
  const D = 297.85036 + 445267.11148 * T - 0.0019142 * T ** 2 + T ** 3 / 189474;

  //Mean anomaly of the Sun (Earth)
  const M = 357.52772 + 35999.05034 * T - 0.0001603 * T ** 2 - T ** 3 / 300000;

  //Mean anomaly of the Moon
  const Mp =
    134.96298 + 477198.867398 * T + 0.0086972 * T ** 2 + T ** 3 / 56250;

  //Moon's argument of latitude
  const F = 93.27191 + 483202.017538 * T - 0.0036825 * T ** 2 + T ** 3 / 327270;

  //Longitude of the ascending node of the Moon's mean orbit on the ecliptic, measured from the mean equinox of the date
  const Omega =
    125.04452 - 1934.136261 * T + 0.0020708 * T ** 2 + T ** 3 / 450000;

  //Periodic terms for the nutation in longitude
  //Nutation in Longitude = lonT
  const lonT = [
    [0, 0, 0, 0, 1, -171996, -174.2],
    [-2, 0, 0, 2, 2, -13187, -1.6],
    [0, 0, 0, 2, 2, -2274, -0.2],
    [0, 0, 0, 0, 2, 2062, 0.2],
    [0, 1, 0, 0, 0, 1426, -3.4],
    [0, 0, 1, 0, 0, 712, 0.1],
    [-2, 1, 0, 2, 2, -517, 1.2],
    [0, 0, 0, 2, 1, -386, -0.4],
    [0, 0, 1, 2, 2, -301],
    [-2, -1, 0, 2, 2, 217, -0.5],
    [-2, 0, 1, 0, 0, -158],
    [-2, 0, 0, 2, 1, 129, 0.1],
    [0, 0, -1, 2, 2, 123],
    [2, 0, 0, 0, 0, 63],
    [0, 0, 1, 0, 1, 63, 0.1],
    [2, 0, -1, 2, 2, -59],
    [0, 0, -1, 0, 1, -58, -0.1],
    [0, 0, 1, 2, 1, -51],
    [-2, 0, 2, 0, 0, 48],
    [0, 0, -2, 2, 1, 46],
    [2, 0, 0, 2, 2, -38],
    [0, 0, 2, 2, 2, -31],
    [0, 0, 2, 0, 0, 29],
    [-2, 0, 1, 2, 2, 29],
    [0, 0, 0, 2, 0, 26],
    [-2, 0, 0, 2, 0, -22],
    [0, 0, -1, 2, 1, 21],
    [0, 2, 0, 0, 0, 17, -0.1],
    [2, 0, -1, 0, 1, 16],
    [-2, 2, 0, 2, 2, -16, 0.1],
    [0, 1, 0, 0, 1, -15],
    [-2, 0, 1, 0, 1, -13],
    [0, -1, 0, 0, 1, -12],
    [0, 0, 2, -2, 0, 11],
    [2, 0, -1, 2, 1, -10],
    [2, 0, 1, 2, 2, -8],
    [0, 1, 0, 2, 2, 7],
    [-2, 1, 1, 0, 0, -7],
    [0, -1, 0, 2, 2, -7],
    [2, 0, 0, 2, 1, -7],
    [2, 0, 1, 0, 0, 6],
    [-2, 0, 2, 2, 2, 6],
    [-2, 0, 1, 2, 1, 6],
    [2, 0, -2, 0, 1, -6],
    [2, 0, 0, 0, 1, -6],
    [0, -1, 1, 0, 0, 5],
    [-2, -1, 0, 2, 1, -5],
    [-2, 0, 0, 0, 1, -5],
    [0, 0, 2, 2, 1, -5],
    [-2, 0, 2, 0, 1, 4],
    [-2, 1, 0, 2, 1, 4],
    [0, 0, 1, -2, 0, 4],
    [-1, 0, 1, 0, 0, -4],
    [-2, 1, 0, 0, 0, -4],
    [1, 0, 0, 0, 0, -4],
    [0, 0, 1, 2, 0, 3],
    [0, 0, -2, 2, 2, -3],
    [-1, -1, 1, 0, 0, -3],
    [0, 1, 1, 0, 0, -3],
    [0, -1, 1, 2, 2, -3],
    [2, -1, -1, 2, 2, -3],
    [0, 0, 3, 2, 2, -3],
    [2, -1, 0, 2, 2, -3],
  ];

  //Periodic terms for the nutation in obliquity
  //Nutation in obliquity = oblT
  //fix this
  const oblT = [
    [0, 0, 0, 0, 1, 92025, 8.9],
    [-2, 0, 0, 2, 2, 5736, -3.1],
    [0, 0, 0, 2, 2, 977, -0.5],
    [0, 0, 0, 0, 2, -895, 0.5],
    [0, 1, 0, 0, 0, 54, -0.1],
    [0, 0, 1, 0, 0, -7],
    [-2, 1, 0, 2, 2, 224, -0.6],
    [0, 0, 0, 2, 1, 200],
    [0, 0, 1, 2, 2, 129, -0.1],
    [-2, -1, 0, 2, 2, -95, 0.3],
    [-2, 0, 0, 2, 1, -70],
    [0, 0, -1, 2, 2, -53],
    [0, 0, 1, 0, 1, -33],
    [2, 0, -1, 2, 2, 26],
    [0, 0, -1, 0, 1, 32],
    [0, 0, 1, 2, 1, 27],
    [0, 0, -2, 2, 1, -24],
    [2, 0, 0, 2, 2, 16],
    [0, 0, 2, 2, 2, 13],
    [-2, 0, 1, 2, 2, -12],
    [0, 0, -1, 2, 1, -10],
    [2, 0, -1, 0, 1, -8],
    [-2, 2, 0, 2, 2, 7],
    [0, 1, 0, 0, 1, 9],
    [-2, 0, 1, 0, 1, 7],
    [0, -1, 0, 0, 1, 6],
    [2, 0, -1, 2, 1, 5],
    [2, 0, 1, 2, 2, 3],
    [0, 1, 0, 2, 2, -3],
    [0, -1, 0, 2, 2, 3],
    [2, 0, 0, 2, 1, 3],
    [-2, 0, 2, 2, 2, -3],
    [-2, 0, 1, 2, 1, -3],
    [2, 0, -2, 0, 1, 3],
    [2, 0, 0, 0, 1, 3],
    [-2, -1, 0, 2, 1, 3],
    [-2, 0, 0, 0, 1, 3],
    [0, 0, 2, 2, 1, 3],
  ];

  //sin but in degrees instead of radians
  function sin(x) {
    x = degToRad(x);
    return Math.sin(x);
  }

  //cos but in degrees instead of radians
  function cos(x) {
    x = degToRad(x);
    return Math.cos(x);
  }

  let sumOfLongitudes = 0;
  let sumOfObliquity = 0;

  for (let i = 0; i < lonT.length; i++) {
    const term = lonT[i];
    if (!term[6]) term[6] = 0;
    sumOfLongitudes +=
      (term[5] + term[6] * T) *
      sin(
        term[0] * D + term[1] * M + term[2] * Mp + term[3] * F + term[4] * Omega
      );
  }

  for (let i = 0; i < oblT.length; i++) {
    const term = oblT[i];
    //check if we need to multiply by T
    if (!term[6]) term[6] = 0;

    sumOfObliquity +=
      (term[5] + term[6] * T) *
      cos(
        term[0] * D + term[1] * M + term[2] * Mp + term[3] * F + term[4] * Omega
      );
  }

  sumOfLongitudes /= 10 ** 4;
  sumOfObliquity /= 10 ** 4;

  const U = T / 100;
  const E0 =
    23.439291 -
    1.300258 * U -
    1.55 * U ** 2 +
    1999.25 * U ** 3 -
    51.38 * U ** 4 -
    249.67 * U ** 5 -
    39.05 * U ** 6 +
    7.12 * U ** 7 +
    27.87 * U ** 8 +
    5.79 * U ** 9 +
    2.45 * U ** 10;

  //turns out these values are in arc seconds :|
  sumOfLongitudes /= 3600;
  sumOfObliquity /= 3600;

  const trueObliquity = E0 + sumOfObliquity;
  return { trueObliquity, longitudeNutation: sumOfLongitudes };
}

//The process was from chapter 47 of the book Astronomical Algorithms V2
function getMoonPosition(time = new Date()) {
  function normalizeAngle(angle) {
    return angle - 360 * Math.floor(angle / 360);
  }

  //sin but in degrees instead of radians
  function sin(x) {
    x = degToRad(x);
    x = Math.sin(x);
    return x;
  }

  //cos but in degrees instead of radians
  function cos(x) {
    x = degToRad(x);
    x = Math.cos(x);
    return x;
  }

  const JDE = getJulianDate(time); //julian date
  const T = (JDE - 2451545) / 36525;

  //All variables are expressed in degrees
  //Moon's mean longitude
  let Lp =
    218.3164477 +
    481267.88123421 * T -
    0.0015786 * T ** 2 +
    T ** 3 / 538841 -
    T ** 4 / 65194000;

  //Mean elongation of the Moon
  let D =
    297.8501921 +
    445267.1114034 * T -
    0.0018819 * T ** 2 +
    T ** 3 / 545868 -
    T ** 4 / 113065000;

  //Sun's mean anomaly
  let M =
    357.5291092 + 35999.0502909 * T - 0.0001536 * T ** 2 + T ** 3 / 24490000;

  //Moon's mean anomaly
  let Mp =
    134.9633964 +
    477198.8675055 * T +
    0.0087414 * T ** 2 +
    T ** 3 / 69699 -
    T ** 4 / 14712000;

  //Moon's argument of latitude (mean distance of the Moon from its ascending node)
  let F =
    93.272095 +
    483202.0175233 * T -
    0.0036539 * T ** 2 -
    T ** 3 / 3526000 +
    T ** 4 / 863310000;

  let A1 = 119.75 + 131.849 * T;
  let A2 = 53.09 + 479264.29 * T;
  let A3 = 313.45 + 481266.484 * T;

  //Eccentricty of the Earth's orbit around the Sun
  const E = 1 - 0.002516 * T - 0.0000074 * T ** 2;

  Lp = normalizeAngle(Lp);
  D = normalizeAngle(D);
  M = normalizeAngle(M);
  Mp = normalizeAngle(Mp);
  F = normalizeAngle(F);
  A1 = normalizeAngle(A1);
  A2 = normalizeAngle(A2);
  A3 = normalizeAngle(A3);

  //Table is [D, M, Mp, F, Coefficient]
  //Periodic terms for the Moon's longitude
  //Unit is in 0.000001 degree (10^-6)
  //longitude terms = lonT
  const lonT = [
    [0, 0, 1, 0, 6288774],
    [2, 0, -1, 0, 1274027],
    [2, 0, 0, 0, 658314],
    [0, 0, 2, 0, 213618],
    [0, 1, 0, 0, -185116],
    [0, 0, 0, 2, -114332],
    [2, 0, -2, 0, 58793],
    [2, -1, -1, 0, 57066],
    [2, 0, 1, 0, 53322],
    [2, -1, 0, 0, 45758],
    [0, 1, -1, 0, -40923],
    [1, 0, 0, 0, -34720],
    [0, 1, 1, 0, -30383],
    [2, 0, 0, -2, 15327],
    [0, 0, 1, 2, -12528],
    [0, 0, 1, -2, 10980],
    [4, 0, -1, 0, 10675],
    [0, 0, 3, 0, 10034],
    [4, 0, -2, 0, 8548],
    [2, 1, -1, 0, -7888],
    [2, 1, 0, 0, -6766],
    [1, 0, -1, 0, -5163],
    [1, 1, 0, 0, 4987],
    [2, -1, 1, 0, 4036],
    [2, 0, 2, 0, 3994],
    [4, 0, 0, 0, 3861],
    [2, 0, -3, 0, 3665],
    [0, 1, -2, 0, -2689],
    [2, 0, -1, 2, -2602],
    [2, -1, -2, 0, 2390],
    [1, 0, 1, 0, -2348],
    [2, -2, 0, 0, 2236],
    [0, 1, 2, 0, -2120],
    [0, 2, 0, 0, -2069],
    [2, -2, -1, 0, 2048],
    [2, 0, 1, -2, -1773],
    [2, 0, 0, 2, -1595],
    [4, -1, -1, 0, 1215],
    [0, 0, 2, 2, -1110],
    [3, 0, -1, 0, -892],
    [2, 1, 1, 0, -810],
    [4, -1, -2, 0, 759],
    [0, 2, -1, 0, -713],
    [2, 2, -1, 0, -700],
    [2, 1, -2, 0, 691],
    [2, -1, 0, -2, 596],
    [4, 0, 1, 0, 549],
    [0, 0, 4, 0, 537],
    [4, -1, 0, 0, 520],
    [1, 0, -2, 0, -487],
    [2, 1, 0, -2, -399],
    [0, 0, 2, -2, -381],
    [1, 1, 1, 0, 351],
    [3, 0, -2, 0, -340],
    [4, 0, -3, 0, 330],
    [2, -1, 2, 0, 327],
    [0, 2, 1, 0, -323],
    [1, 1, -1, 0, 299],
    [2, 0, 3, 0, 294],
  ];

  //Periodic terms for the distance of the Moon
  //Unit is in 0.001 kilometers (10^-3)
  //distanceTerms = disT
  const disT = [
    [0, 0, 1, 0, -20905355],
    [2, 0, -1, 0, -3699111],
    [2, 0, 0, 0, -2955968],
    [0, 0, 2, 0, -569925],
    [0, 1, 0, 0, 48888],
    [0, 0, 0, 2, -3149],
    [2, 0, -2, 0, 246158],
    [2, -1, -1, 0, -152138],
    [2, 0, 1, 0, -170733],
    [2, -1, 0, 0, -204586],
    [0, 1, -1, 0, -129620],
    [1, 0, 0, 0, 108743],
    [0, 1, 1, 0, 104755],
    [2, 0, 0, -2, 10321],
    [0, 0, 1, -2, 79661],
    [4, 0, -1, 0, -34782],
    [0, 0, 3, 0, -23210],
    [4, 0, -2, 0, -21636],
    [2, 1, -1, 0, 24208],
    [2, 1, 0, 0, 30824],
    [1, 0, -1, 0, -8379],
    [1, 1, 0, 0, -16675],
    [2, -1, 1, 0, -12831],
    [2, 0, 2, 0, -10445],
    [4, 0, 0, 0, -11650],
    [2, 0, -3, 0, 14403],
    [0, 1, -2, 0, -7003],
    [2, -1, -2, 0, 10056],
    [1, 0, 1, 0, 6322],
    [2, -2, 0, 0, -9884],
    [0, 1, 2, 0, 5751],
    [2, -2, -1, 0, -4950],
    [2, 0, 1, -2, 4130],
    [4, -1, -1, 0, -3958],
    [3, 0, -1, 0, 3258],
    [2, 1, 1, 0, 2616],
    [4, -1, -2, 0, -1897],
    [0, 2, -1, 0, -2117],
    [2, 2, -1, 0, 2354],
    [4, 0, 1, 0, -1423],
    [0, 0, 4, 0, -1117],
    [4, -1, 0, 0, -1571],
    [1, 0, -2, 0, -1739],
    [0, 0, 2, -2, -4421],
    [0, 2, 1, 0, 1165],
    [2, 0, -1, -2, 8752],
  ];

  //Perodic terms for the latitude of the moon
  //Unit is in 0000001 degrees (10^-6)
  //latitude terms = latT
  const latT = [
    [0, 0, 0, 1, 5128122],
    [0, 0, 1, 1, 280602],
    [0, 0, 1, -1, 277693],
    [2, 0, 0, -1, 173237],
    [2, 0, -1, 1, 55413],
    [2, 0, -1, -1, 46271],
    [2, 0, 0, 1, 32573],
    [0, 0, 2, 1, 17198],
    [2, 0, 1, -1, 9266],
    [0, 0, 2, -1, 8822],
    [2, -1, 0, -1, 8216],
    [2, 0, -2, -1, 4324],
    [2, 0, 1, 1, 4200],
    [2, 1, 0, -1, -3359],
    [2, -1, -1, 1, 2463],
    [2, -1, 0, 1, 2211],
    [2, -1, -1, -1, 2065],
    [0, 1, -1, -1, -1870],
    [4, 0, -1, -1, 1828],
    [0, 1, 0, 1, -1794],
    [0, 0, 0, 3, -1749],
    [0, 1, -1, 1, -1565],
    [1, 0, 0, 1, -1491],
    [0, 1, 1, 1, -1475],
    [0, 1, 1, -1, -1410],
    [0, 1, 0, -1, -1344],
    [1, 0, 0, -1, -1335],
    [0, 0, 3, 1, 1107],
    [4, 0, 0, -1, 1021],
    [4, 0, -1, 1, 833],
    [0, 0, 1, -3, 777],
    [4, 0, -2, 1, 671],
    [2, 0, 0, -3, 607],
    [2, 0, 2, -1, 596],
    [2, -1, 1, -1, 491],
    [2, 0, -2, 1, -451],
    [0, 0, 3, -1, 439],
    [2, 0, 2, 1, 422],
    [2, 0, -3, -1, 421],
    [2, 1, -1, 1, -366],
    [2, 1, 0, 1, -351],
    [4, 0, 0, 1, 331],
    [2, -1, 1, 1, 315],
    [2, -2, 0, -1, 302],
    [0, 0, 1, 3, -283],
    [2, 1, 1, -1, -229],
    [1, 1, 0, -1, 223],
    [1, 1, 0, 1, 223],
    [0, 1, -2, -1, -220],
    [2, 1, -1, -1, -220],
    [1, 0, 1, 1, -185],
    [2, -1, -2, -1, 181],
    [0, 1, 2, 1, -177],
    [4, 0, -2, -1, 176],
    [4, -1, -1, -1, 166],
    [1, 0, 1, -1, -164],
    [4, 0, 1, -1, 132],
    [1, 0, -1, -1, -119],
    [4, -1, 0, -1, 115],
    [2, -2, 0, 1, 107],
  ];

  //check if term of M is 2, if so make E --> E^2
  function getEfromM(MCoefficient) {
    let eValue;
    const Mcoef = Math.abs(MCoefficient);
    if (Mcoef === 2) eValue = E ** 2;
    else if (Mcoef === 1) eValue = E;
    else eValue = 1;

    return eValue;
  }

  //Add values from the table
  let sumOfLongitudes = 0;
  let sumOfLatitudes = 0;
  let sumofDistances = 0;

  //sum longitudes
  for (let i = 0; i < lonT.length; i++) {
    const term = lonT[i];
    const eValue = getEfromM(term[1]);

    sumOfLongitudes +=
      term[4] *
      eValue *
      sin(term[0] * D + term[1] * M + term[2] * Mp + term[3] * F);
  }

  //sun latitudes
  for (let i = 0; i < latT.length; i++) {
    const term = latT[i];
    const eValue = getEfromM(term[1]);

    sumOfLatitudes +=
      term[4] *
      eValue *
      sin(term[0] * D + term[1] * M + term[2] * Mp + term[3] * F);
  }

  //sum distances
  for (let i = 0; i < disT.length; i++) {
    const term = disT[i];
    const eValue = getEfromM(term[1]);

    sumofDistances +=
      term[4] *
      eValue *
      cos(term[0] * D + term[1] * M + term[2] * Mp + term[3] * F);
  }

  //extra terms needed
  sumOfLongitudes += 3958 * sin(A1); //Venus
  sumOfLongitudes += 1962 * sin(Lp - F); //Flattening of Earth
  sumOfLongitudes += 318 * sin(A2); //Jupiter

  sumOfLatitudes += -2235 * sin(Lp); //Flattening of Earth
  sumOfLatitudes += 382 * sin(A3); //not sure lol
  sumOfLatitudes += 175 * sin(A1 - F); //Venus
  sumOfLatitudes += 175 * sin(A1 + F); //Venus
  sumOfLatitudes += 127 * sin(Lp - Mp); //Flattening of Earth
  sumOfLatitudes += -115 * sin(Lp + Mp); //Flattening of Earth

  const { trueObliquity, longitudeNutation } = getObliquity(time);
  const Eclipticlongitude = Lp + sumOfLongitudes / 10 ** 6 + longitudeNutation; //degrees
  const Eclipticlatitude = sumOfLatitudes / 10 ** 6; //degrees
  const distance = 385000.56 + sumofDistances / 10 ** 3; //kilometers
  //Equatorial Horizontal Parallax = EHP
  const EHP = radToDeg(Math.asin(6378.14 / distance));

  const rightAscension = Math.atan2(
    cos(Eclipticlatitude) * sin(Eclipticlongitude) * cos(trueObliquity) -
      sin(Eclipticlatitude) * sin(trueObliquity),
    cos(Eclipticlatitude) * cos(Eclipticlongitude)
  );

  const declination = Math.asin(
    cos(trueObliquity) * sin(Eclipticlatitude) +
      sin(trueObliquity) * cos(Eclipticlatitude) * sin(Eclipticlongitude)
  );

  const gmst = satellite.gstime(time);
  const longitude = radToDeg(rightAscension - gmst);
  const latitude = radToDeg(declination);

  console.dir({
    latitude,
    longitude,
  });

  return {
    latitude,
    longitude,
    Eclipticlatitude,
    Eclipticlongitude,
    distance,
    EHP,
  };
}

Date.prototype.addHours = function (h) {
  this.setTime(this.getTime() + h * 60 * 60 * 1000);
  return this;
};

const currentTime = new Date(703036800050);

getMoonPosition(currentTime);

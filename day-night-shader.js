const fs = require("node:fs");
const path = require("node:path");
const vertexSrc = fs.readFileSync(path.join(__dirname, "vertex.vert")).toString();
const fragmentSrc = fs.readFileSync(path.join(__dirname, "day-night-shader.frag")).toString();

const { createCanvas, createImageData } = require("canvas");

const getPixels = require("get-pixels");
async function getImagePixels(path) {
	return new Promise((resolve, reject) => {
		getPixels(path, function (err, pixels) {
			if (err) return reject(err);
			resolve(pixels);
		});
	});
}

async function go() {
	//get pixel data of images
	const dayMapPixels = await getImagePixels(path.join(__dirname, "images", "earth_day.png"));
	const nightMapPixels = await getImagePixels(path.join(__dirname, "images", "earth_night.png"));

	//constant variables
	const width = 2048;
	const height = width / 2;
	const latitude = 36.53;
	const longitude = -87.35;

	const gl = require("gl")(width, height);

	gl.viewport(0, 0, width, height);
	gl.clearColor(1, 0, 1, 1);

	let vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, vertexSrc);
	gl.compileShader(vertexShader);

	let vertexStatus = gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS);
	if (!vertexStatus) {
		// Something went wrong during compilation; get the error
		const lastError = gl.getShaderInfoLog(vertexShader);
		console.log(lastError);
		gl.deleteShader(vertexShader);
		return;
	}

	let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragmentShader, fragmentSrc);
	gl.compileShader(fragmentShader);

	let fragmentStatus = gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS);
	if (!fragmentStatus) {
		// Something went wrong during compilation; get the error
		const lastError = gl.getShaderInfoLog(fragmentShader);
		console.log(lastError);
		gl.deleteShader(fragmentShader);
		return;
	}

	let program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.useProgram(program);

	//get locations of uniform variables
	const resLocation = gl.getUniformLocation(program, "u_resolution");
	const dayLocation = gl.getUniformLocation(program, "u_map_day");
	const nightLocation = gl.getUniformLocation(program, "u_map_night");
	const sunLocation = gl.getUniformLocation(program, "u_sun_dir");

	//create day texture and map it to texture 0
	const dayMap = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, dayMap);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, dayMapPixels.data);

	//create night texture and map it to texture 1
	const nightMap = gl.createTexture();
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, nightMap);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, nightMapPixels.data);

	//degrees to radians
	let slat = (latitude * Math.PI) / 180;
	let slon = (longitude * Math.PI) / 180;
	gl.uniform3f(sunLocation, Math.cos(slat) * Math.cos(slon), Math.cos(slat) * Math.sin(lon), Math.sin(slat));
	// shader.set_uniform_vec3(
	//     "u_sun_dir",
	//     sfml::graphics::glsl::Vec3::new(
	//         f32::cos(slat) * f32::cos(slon),
	//         f32::cos(slat) * f32::sin(slon),
	//         f32::sin(slat),
	//     ),
	// );

	//set variables
	gl.uniform2f(resLocation, width, height); //vec2
	gl.uniform1i(dayLocation, 0); //texture number
	gl.uniform1i(nightLocation, 1); //texture number

	gl.linkProgram(program);

	//Write output as a PPM formatted image
	let pixels = new Uint8ClampedArray(width * height * 4);
	gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

	for (let i = 0; i < pixels.length; i++) {
		if (pixels[i]) console.log(i);
	}
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext("2d");

	// console.log(pixels);
	let imageData = createImageData(pixels, width, height);
	ctx.putImageData(imageData, 0, 0);

	const out = fs.createWriteStream(path.join(__dirname, "test.png"));
	const stream = canvas.createPNGStream();
	stream.pipe(out);
	out.on("finish", () => console.log("The PNG file was created."));
	// console.log(pixels);
}

go();

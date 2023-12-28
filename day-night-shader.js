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

// Fills the buffer with the values that define a rectangle.
function setRectangle(gl, x, y, width, height) {
	var x1 = x;
	var x2 = x + width;
	var y1 = y;
	var y2 = y + height;

	// NOTE: gl.bufferData(gl.ARRAY_BUFFER, ...) will affect
	// whatever buffer is bound to the `ARRAY_BUFFER` bind point
	// but so far we only have one buffer. If we had more than one
	// buffer we'd want to bind that buffer to `ARRAY_BUFFER` first.

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), gl.STATIC_DRAW);
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

	const gl = require("gl")(width, height, { preserveDrawingBuffer: true });

	gl.viewport(0, 0, width, height);

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
	gl.linkProgram(program);

	// look up where the vertex data needs to go.
	let positionLocation = gl.getAttribLocation(program, "a_position");
	let texcoordLocation = gl.getAttribLocation(program, "a_texCoord");
	var resolutionLocation = gl.getUniformLocation(program, "u_resolution");

	// Create a buffer to put three 2d clip space points in
	var positionBuffer = gl.createBuffer();

	// Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	setRectangle(gl, 0, 0, width, height);

	// provide texture coordinates for the rectangle.
	var texcoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]),
		gl.STATIC_DRAW
	);

	//get locations of uniform variables
	const resLocation = gl.getUniformLocation(program, "u_resolution");
	const dayLocation = gl.getUniformLocation(program, "u_map_day");
	const nightLocation = gl.getUniformLocation(program, "u_map_night");
	const sunLocation = gl.getUniformLocation(program, "u_sun_dir");
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	//create day texture
	const dayMap = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, dayMap);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, dayMapPixels.data);

	//create night texture
	const nightMap = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, nightMap);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, nightMapPixels.data);

	//degrees to radians
	let slat = (latitude * Math.PI) / 180;
	let slon = (longitude * Math.PI) / 180;
	gl.uniform3f(sunLocation, Math.cos(slat) * Math.cos(slon), Math.cos(slat) * Math.sin(slon), Math.sin(slat));

	//set variables
	gl.uniform2f(resLocation, width, height); //vec2
	gl.uniform1i(dayLocation, 0); //texture number
	gl.uniform1i(nightLocation, 1); //texture number

	// Tell WebGL how to convert from clip space to pixels
	gl.viewport(0, 0, width, height);

	// Clear the canvas
	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	// Tell it to use our program (pair of shaders)
	gl.useProgram(program);

	// Turn on the position attribute
	gl.enableVertexAttribArray(positionLocation);

	// Bind the position buffer.
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

	// Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
	var size = 2; // 2 components per iteration
	var type = gl.FLOAT; // the data is 32bit floats
	var normalize = false; // don't normalize the data
	var stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
	var offset = 0; // start at the beginning of the buffer
	gl.vertexAttribPointer(positionLocation, size, type, normalize, stride, offset);

	// Turn on the texcoord attribute
	gl.enableVertexAttribArray(texcoordLocation);

	// bind the texcoord buffer.
	gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);

	// Tell the texcoord attribute how to get data out of texcoordBuffer (ARRAY_BUFFER)
	var size = 2; // 2 components per iteration
	var type = gl.FLOAT; // the data is 32bit floats
	var normalize = false; // don't normalize the data
	var stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
	var offset = 0; // start at the beginning of the buffer
	gl.vertexAttribPointer(texcoordLocation, size, type, normalize, stride, offset);

	// set the resolution
	gl.uniform2f(resolutionLocation, width, height);

	// Draw the rectangle.
	var primitiveType = gl.TRIANGLES;
	var offset = 0;
	var count = 6;
	gl.drawArrays(primitiveType, offset, count); //draw the screen rectangle
	// const buffer = gl.createBuffer();

	// gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	// gl.bufferData(
	// 	gl.ARRAY_BUFFER,
	// 	new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]),
	// 	gl.STATIC_DRAW
	// );
	// gl.enableVertexAttribArray(aPositionLocation);
	// gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);
	// gl.clearColor(1, 0 , 0, 1);
	// gl.clear(gl.COLOR_BUFFER_BIT);

	// gl.drawArrays(gl.TRIANGLES, 0, 6);

	//Write output as a PPM formatted image and concert to png
	let pixels = new Uint8Array(width * height * 4);
	gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

	let clampedPixels = new Uint8ClampedArray(width * height * 4);

	for (let i = 0; i < pixels.length; i += 1) {
		clampedPixels[i] = pixels[i];
	}

	// for (let i = 0; i < pixels.length; i+=4) {
	// 	console.log(pixels[i] +  ' ' + clampedPixels[i+1] +  ' ' + pixels[i+2] + ' ' + pixels[i+3])
	// }

	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext("2d");

	// console.log(pixels);
	let imageData = createImageData(clampedPixels, width, height);
	ctx.putImageData(imageData, 0, 0);

	const out = fs.createWriteStream(path.join(__dirname, "test.png"));
	const stream = canvas.createPNGStream();
	stream.pipe(out);
	out.on("finish", () => console.log("The PNG file was created."));
	// console.log(pixels);
}

go();

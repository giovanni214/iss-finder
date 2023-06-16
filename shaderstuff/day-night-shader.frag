#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.141592653589793
#define E 2.718281828459045

#define CIVIL_TWILIGHT 90.0 * PI/180.0
#define NAUTICAL_TWILIGHT (90.0 + 6.0) * PI/180.0
#define ASTRONOMICAL_TWILIGHT (90.0 + 12.0) * PI/180.0 
#define NIGHT (90.0 + 18.0) * PI/180.0

// uniform float u_time;
uniform vec2 u_resolution;

// uniform vec2 u_mouse;

uniform float u_lat;
uniform float u_lon;

uniform sampler2D u_map_day;
uniform sampler2D u_map_night;

vec2 reverseEquirectangular(vec2 pos) {
    float longitudePerPixel = 2.0 * PI / u_resolution.x;
    float latitudePerPixel = PI / u_resolution.y;

    float longitude = (pos.x - u_resolution.x * 0.5) * longitudePerPixel;
    float latitude = (pos.y - u_resolution.y * 0.5) * latitudePerPixel;

    return vec2(longitude,latitude);
}


vec4 drawLine(vec4 inColor, float angle, float lineAngle, float angularWidth) {
    float edge = smoothstep(0., angularWidth,  abs(angle - lineAngle));

    return mix(inColor, vec4(1., 1., 1., 1.0), (1. - edge) * 0.12);
}

void main() {
    vec2 size = u_resolution;
    size.y = size.x * 0.5;

    vec2 center = u_resolution * 0.5;

    if (gl_FragCoord.y < center.y - size.y * 0.5 || gl_FragCoord.y > center.y + size.y * 0.5) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }


    vec4 mapColorDay = texture2D(u_map_day, vec2(gl_FragCoord.x, gl_FragCoord.y - (u_resolution.y - size.y) * 0.5)/size.xy);
    vec4 mapColorNight = texture2D(u_map_night, vec2(gl_FragCoord.x, gl_FragCoord.y - (u_resolution.y - size.y) * 0.5)/size.xy);


    // vec2 sunLngLat = vec2(u_time * 30.0 * PI / 180.0,sin(u_time * 0.5) * 45.0 *  PI / 180.0);
    // vec2 sunLngLat = reverseEquirectangular(u_mouse.xy);
    vec2 sunLngLat = vec2(u_lon, u_lat);
    vec2 currLngLat = reverseEquirectangular(gl_FragCoord.xy);


  vec3 sunPos = vec3(
        cos(sunLngLat.y) * cos(sunLngLat.x),
        cos(sunLngLat.y) * sin(sunLngLat.x),
        sin(sunLngLat.y)
        );
    
    vec3 currPos = vec3(
    cos(currLngLat.y) * cos(currLngLat.x),
        cos(currLngLat.y) * sin(currLngLat.x),
        sin(currLngLat.y)
    );
    
    
    float angle = acos(clamp(dot(sunPos, currPos), -1.0, 1.0));
    float brightnessFactor = 1.0 - angle/PI;
    
    float brightnessCoFactor = 1.0;
    
    if (angle > CIVIL_TWILIGHT) brightnessCoFactor -= 0.3;
    if (angle > NAUTICAL_TWILIGHT) brightnessCoFactor -= 0.3;
    if (angle > ASTRONOMICAL_TWILIGHT) brightnessCoFactor -= 0.3;
    if (angle > NIGHT) brightnessCoFactor -= 0.1;
   
    brightnessFactor *= brightnessFactor * 0.5 + brightnessCoFactor;

    vec3 color = vec3(1.);
    color *= brightnessFactor;

    const vec3 oceanColor = vec3(11./255., 10./255., 50./255.);
    const vec3 betterOceanColor = vec3(6./255., 66./255., 115./255.);

    gl_FragColor = mapColorDay;

    if (angle >= CIVIL_TWILIGHT) {
        //night / twilight

        if (angle < NIGHT) {
            if (distance(mapColorDay.xyz, oceanColor) <= 0.2) {
                gl_FragColor = vec4(mix(betterOceanColor, oceanColor,  clamp(angle*0.34, 0., 1.)), 1.0);
            }
        }

        gl_FragColor = vec4(mix(gl_FragColor, mapColorNight, 1.0 - brightnessCoFactor));
    } else {
        //day

        if (distance(gl_FragColor.xyz, oceanColor) <= 0.2) {
            gl_FragColor = vec4(mix(betterOceanColor, oceanColor,  clamp(angle*0.25, 0., 1.)), 1.0);
        }
    }
    

    if (angle >= CIVIL_TWILIGHT) gl_FragColor = drawLine(gl_FragColor, angle, CIVIL_TWILIGHT, 0.01);
    if (angle >= NAUTICAL_TWILIGHT) gl_FragColor = drawLine(gl_FragColor, angle, NAUTICAL_TWILIGHT, 0.01);
    if (angle >= ASTRONOMICAL_TWILIGHT) gl_FragColor = drawLine(gl_FragColor, angle, ASTRONOMICAL_TWILIGHT, 0.01);
    if (angle >= NIGHT) gl_FragColor = drawLine(gl_FragColor, angle, NIGHT, 0.01);
}

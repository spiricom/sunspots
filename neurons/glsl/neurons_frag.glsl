#ifdef GL_ES
precision mediump float;
#endif

#define fragColor gl_FragColor
#define fragCoord gl_FragCoord

uniform vec3 iResolution;
uniform float iGlobalTime;
uniform float iTimeDelta;
uniform int iFrame;
uniform float iFrameRate;
uniform vec4 iMouse;

uniform float iChannelTime[4];
uniform vec3 iChannelResolution[4];
uniform sampler2D iChannel0;
uniform vec4 iDate;
uniform float iSampleRate;

const float PI      = 3.1415;
const float EPSILON = 1e-3;
const float pi = 3.14159;
const float pi2 = pi * 2.;


///////////////////
// sdf binary ops
///////////////////

float smoothMerge(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5*(d2 - d1)/k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0-h);
}


float merge(float d1, float d2) {
  return min(d1, d2);
}


float mergeExclude(float d1, float d2) {
  return min(max(-d1, d2), max(-d2, d1));
}


float substract(float d1, float d2) {
  return max(-d1, d2);
}


float intersect(float d1, float d2) {
  return max(d1, d2);
}


///////////////////////
// FRACTAL
///////////////////////

// http://www.fractalforums.com/new-theories-and-research/very-simple-formula-for-fractal-patterns/
// https://www.shadertoy.com/view/lslGWr
float field(in vec3 p) {
  float strength = 7. + .03 * log(1.e-6 + fract(sin(iGlobalTime) * 4373.11));
  float accum = 0.;
  float prev = 0.;
  float tw = 0.;
  for (int i = 0; i < 32; ++i) {
    float mag = dot(p, p);
    p = abs(p) / mag + vec3(-.5, -.4, -1.5);
    float w = exp(-float(i) / 7.);
    accum += w * exp(-strength * pow(abs(mag - prev), 2.3));
    tw += w;
    prev = mag;
  }
  return max(0., 5. * accum / tw - .7);
}


////////////////////////////////////////////
// misc
////////////////////////////////////////////

mat2 rot2D(float r) {
  float c = cos(r), s = sin(r);
  return mat2(c, s, -s, c);
}

// convert distance to alpha
float dtoa(float d, float amount) {
  float a = clamp(1.0 / (clamp(d, 1.0/amount, 1.0)*amount), 0.,1.);
  return a;
}


////////////////////////////////////////////
// distance functions
////////////////////////////////////////////

// circle
float sdCircle(vec2 uv, vec2 origin, float radius) {
  float d = length(uv - origin) - radius;
  return d;
}

// signed distance to segment of 1D space. like, for making a vertical column
float sdSegment1D(float uv, float a, float b) {
  return max(a - uv, uv - b);
}
float sdAxisAlignedRect(vec2 uv, vec2 tl, vec2 br) {
  vec2 d = max(tl - uv, uv - br);
  return length(max(vec2(0.0), d)) + min(0.0, max(d.x, d.y));
}

// the big question is what is the best way to INPUT a free rect? tl+br+angle? p1,p2,p3?
float sdRect(vec2 uv, vec2 a, vec2 b, float angle) {
  // flatten the line to be axis-aligned.
  vec2 rectDimensions = b - a;
  mat2 rotMat = rot2D(-angle);
  a *= rotMat;
  b *= rotMat;
  return sdAxisAlignedRect(uv * rotMat, a, b);
}

// really a line segment with line width is just a rect expressed differently
float sdLineSegment(vec2 uv, vec2 a, vec2 b, float lineWidth) {
  // flatten the line to be axis-aligned.
  vec2 rectDimensions = b - a;
  float angle = atan(rectDimensions.x, rectDimensions.y);
  mat2 rotMat = rot2D(-angle);
  a *= rotMat;
  b *= rotMat;
  float halfLineWidth = lineWidth / 2.;
  a -= halfLineWidth;
  b += halfLineWidth;
return sdAxisAlignedRect(uv * rotMat, a, b);
}

// union of line segment and 2 circles
float sdLineSegmentRounded(vec2 uv, vec2 a, vec2 b, float lineWidth) {
  // flatten the line to be axis-aligned.
  vec2 rectDimensions = b - a;
  float angle = atan(rectDimensions.x, rectDimensions.y);
  mat2 rotMat = rot2D(-angle);
  a *= rotMat;
  b *= rotMat;
  float halfLineWidth = lineWidth / 2.;

  uv *= rotMat;
  vec2 tl = vec2(a.x - halfLineWidth, a.y);
  vec2 br = vec2(b.x + halfLineWidth, b.y);

  return min(min(sdAxisAlignedRect(uv, tl, br),
                 sdCircle(uv, a, halfLineWidth)),
                 sdCircle(uv, b, halfLineWidth));
}

// squircle
// http://en.wikipedia.org/wiki/Squircle
float sdSquircle(vec2 uv, vec2 origin, float radius, float power, float rot_) {
    mat2 rot = rot2D(rot_);
  vec2 v = abs((origin*rot) - (uv*rot));
    float d = pow(v.x,power) + pow(v.y, power);
    d -= pow(radius, power);
    return d;
}

// distance to edge of hexagon
// has corner leaks
float sdHexagon(vec2 p, vec2 hexPos, float hexRadius, float hexRotation) {
  mat2 rot = rot2D(hexRotation);
  vec2 v = abs((hexPos*rot) - (p*rot));

  vec2 topBottomEdge = vec2(0., 1.);
  const vec2 sideEdges = vec2(0.86602540358, 0.5);// cos(radians(30)), sin(radians(30))

  float dot1 = dot(v, topBottomEdge);
  float dot2 = dot(v, sideEdges);
  float dotMax = max(dot1, dot2);
  
  return dotMax - hexRadius;
}

// signed distance to a 2D triangle
// thank you iq: https://www.shadertoy.com/view/XsXSz4
float sdTriangle(in vec2 p, in vec2 p0, in vec2 p1, in vec2 p2) {
  vec2 e0 = p1 - p0;
  vec2 e1 = p2 - p1;
  vec2 e2 = p0 - p2;

  vec2 v0 = p - p0;
  vec2 v1 = p - p1;
  vec2 v2 = p - p2;

  vec2 pq0 = v0 - e0*clamp( dot(v0,e0)/dot(e0,e0), 0.0, 1.0 );
  vec2 pq1 = v1 - e1*clamp( dot(v1,e1)/dot(e1,e1), 0.0, 1.0 );
  vec2 pq2 = v2 - e2*clamp( dot(v2,e2)/dot(e2,e2), 0.0, 1.0 );
    
  vec2 d = min( min( vec2( dot( pq0, pq0 ), v0.x*e0.y-v0.y*e0.x ),
                     vec2( dot( pq1, pq1 ), v1.x*e1.y-v1.y*e1.x )),
                     vec2( dot( pq2, pq2 ), v2.x*e2.y-v2.y*e2.x ));

  return -sqrt(d.x)*sign(d.y);
}



//////////////////////////////
// MAIN
//////////////////////////////

void main() {
  float t = iGlobalTime;
  vec2 uv = fragCoord.xy / iResolution.yy;
    
  // background color
  fragColor = vec4(1.0, 1.0, 1.0, 1.0);
  float dist;
  float a, b, c, d, e, f;
  vec2 tl, rectSize;

  // triangle ------------------------------------------------
  vec4 triangleColor = vec4(.3, 0.1, 0.3, 1.0);
  float time = t * 0.7;
  a = (sin(time)+1.)/2.;
  b = (sin(time+4.*0.4)+1.)/4.;
  c = (sin(time+4.*0.4)+1.)/4.;;
  d = 0.75;
  e = 0.8;
  f = 0.75;

  dist = sdTriangle(uv, vec2(a,b), vec2(c,d), vec2(e,f));
  // the -0.05 here will make the object bigger, and reveal how accurate the distances are at corners.
  // fragColor = mix(fragColor, triangleColor, 0.7 * dtoa(dist - 0.05, 200.));
  fragColor = mix(fragColor, triangleColor, 0.7 * dtoa(dist, 200.));

  // draw the points
  // fragColor = mix(fragColor, triangleColor, 0.9 * dtoa(sdCircle(uv, vec2(a,b), 0.005), 2000.));
  // fragColor = mix(fragColor, triangleColor, 0.9 * dtoa(sdCircle(uv, vec2(c,d), 0.005), 2000.));
  // fragColor = mix(fragColor, triangleColor, 0.9 * dtoa(sdCircle(uv, vec2(e,f), 0.005), 2000.));

}

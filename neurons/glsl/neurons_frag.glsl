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


// FRACTAL ////////////////////////////////////

// http://www.fractalforums.com/new-theories-and-research/very-simple-formula-for-fractal-patterns/
// https://www.shadertoy.com/view/lslGWr
float fractalField(in vec3 p) {
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

// rotation /////////////////////////////////////////////////////////
mat2 rot2D(float r) {
  float c = cos(r), s = sin(r);
  return mat2(c, s, -s, c);
}

// distanceToAlpha /////////////////////////////////////////////////////////
// https://www.shadertoy.com/view/ltBGzt

// #define SMOOTHSTEP
#define DIV
// #define SIGN

// convert distance to alpha
float dtoa(float d, float amount) {
  // float a = clamp(1.0 / (clamp(d, 1.0/amount, 1.0)*amount), 0.,1.);

  // using smoothstep() is idiomatic, fast, and clean (no bleeding).
  #ifdef SMOOTHSTEP
  float a = 1.0 - smoothstep(0., 0.006, d);
  #endif

  // using a divide gives a very long falloff, so it bleeds which I think is pretty.
  #ifdef DIV
  // const float amount = 300.0;// bigger number = more accurate / crisper falloff.
  float a = clamp(1.0 / (clamp(d, 1.0/amount, 1.0)*amount), 0.,1.);
  #endif

  // using sign() which gives 1 50% AA value. it's cheap, but kind of ugly.
  #ifdef SIGN
  const float epsilon = 0.0007;
  if(abs(d) <= epsilon) d = 0.;// is there a way to optimize this out?
  float a = (sign(-d) + 1.0) / 2.0;
  #endif

  return a;
}

// distance functions //////////////////////////////////////////
// https://www.shadertoy.com/view/XtjGzt

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

float fillMask(float dist) {
  return -clamp(-dist, 0.0, 1.0);
}

float borderFillMask(float dist, float width) {
  float a = dist;
  if (a < width) { // fill
  // if (abs(a) < width) { // border
    a = 1.;
  }
  else {
    a = 0.;
  }
  float alpha2 = a;
  alpha2 = clamp(alpha2, 0., 1.);
  return alpha2;
}

float innerBorderMask(float dist, float width)
{
  //dist += 1.0;
  float alpha1 = clamp(dist + width, 0.0, 1.0);
  float alpha2 = clamp(dist, 0.0, 1.0);
  return alpha1 + alpha2;
}


float outerBorderMask(float dist, float width)
{
  //dist += 1.0;
  float alpha1 = clamp(dist, 0.0, 1.0);
  float alpha2 = clamp(dist - width, 0.0, 1.0);
  return alpha1 - alpha2;
}


// MAIN //////////////////////////////////////////
void main() {
  float t = iGlobalTime;
  vec2 uv = fragCoord.xy / iResolution.yy;
    
  // background color -------------------------
  fragColor = vec4(1.0, 1.0, 1.0, 1.0);
  float dist;
  float a, b, c, d, e, f;
  vec2 tl, rectSize;

  // fractal ---------------------------
  {
    vec2 uvs = uv * iResolution.xy / max(iResolution.x, iResolution.y) * 4.;
    vec3 p = vec3(uvs / 4., 0) + vec3(1., -1.3, 0.);
    p += .2 * vec3(sin(iGlobalTime / 16.), sin(iGlobalTime / 12.),  sin(iGlobalTime / 128.)) * vec3(0., 0., 0.5);
    float fieldT = fractalField(p);
    float v = (1. - exp((abs(uv.x) - 1.) * 6.)) * (1. - exp((abs(uv.y) - 1.) * 6.));
    fragColor = vec4(94., 89., 75., 255.) / 255. * 0.2 + 0.1 * (mix(2.4, -0.3, v) * vec4(3.4 * fieldT * fieldT * fieldT, 3.8 * fieldT * fieldT, 0.4 * fieldT, 1.));
  }

  // desaturate
  // fragColor = mix(fragColor, vec4(0.3, 0.59, 0.11, 1.), 0.2);

  // triangle ------------------------------------------------
  {
    vec4 triangleColor = vec4(0.04, 0.04, 0.04, 1.0);
    float time = t * 0.7;
    a = (sin(time)+1.)/2.;
    b = (sin(time+4.*0.4)+1.)/4.;
    c = (sin(time+4.*0.4)+1.)/4.;;
    d = 0.75;
    e = 0.8;
    f = 0.75;

    dist = sdTriangle(uv, vec2(a, b), vec2(c, d), vec2(e, f));
    fragColor += triangleColor * 1. * dtoa(dist, 600.);

    // outline
    // fragColor += 8.0 * smoothstep( 0.9, 1.1, dist ); 
    fragColor = mix(fragColor, vec4(0., 0., 0., 1.), 1. * dtoa(dist + 1.2 / iResolution.y, 600.));
  }

  // bubbles --------------
  // https://www.shadertoy.com/view/4dl3zn
  {
    vec3 color = fragColor.xyz;

    for (int i = 0; i < 40; i++) {
      // bubble seeds
      float pha =      sin(float(i) * 546.13 + 1.0) * 0.5 + 0.5;
      float siz = pow( sin(float(i) * 651.74 + 5.0) * 0.5 + 0.5, 4.0);
      float pox =      sin(float(i) * 321.55 + 4.1) * iResolution.x / iResolution.y;

      // buble size, position and color
      float rad = 0.05 + 0.03 * siz;
      vec2  pos = vec2( pox, -1.0-rad + (2.0+2.0*rad)*mod(pha+0.1*iGlobalTime*(0.2+0.8*siz),1.0));
      float dis = length( uv - pos );
      vec3  col = mix( vec3(0.94,0.3,0.0), vec3(0.1,0.4,0.8), 0.5+0.5*sin(float(i)*1.2+1.9)) * 0.1;
         // col+= 8.0*smoothstep( rad*0.95, rad, dis ); // outline
      
      // render
      float f = length(uv-pos)/rad;
      f = sqrt(clamp(1.0-f*f,0.0,1.0));
      color -= col.zyx *(1.0-smoothstep( rad*0.95, rad, dis )) * f;
    }

    // vigneting  
    color *= sqrt(1.5-0.5*length(uv));
    fragColor = vec4(color, 1.);
  }
}

// brush: https://www.shadertoy.com/view/ltj3Wc
// alt sdf functions (pixel units): https://www.shadertoy.com/view/4dfXDn
// another sdf playground: https://www.shadertoy.com/view/XsyGRW
// flame: https://www.shadertoy.com/view/MdX3zr
// bubbles: https://www.shadertoy.com/view/4dl3zn
// "cellular": https://www.shadertoy.com/view/Xs2GDd

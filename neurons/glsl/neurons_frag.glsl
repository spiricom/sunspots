#ifdef GL_ES
precision mediump float;
#endif

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

//////////////////////////////////////
// Combine distance field functions //
//////////////////////////////////////


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


//////////////////////////////
// Rotation and translation //
//////////////////////////////


vec2 rotateCCW(vec2 p, float a) {
  mat2 m = mat2(cos(a), sin(a), -sin(a), cos(a));
  return p * m; 
}

vec2 rotateCW(vec2 p, float a) {
  mat2 m = mat2(cos(a), -sin(a), sin(a), cos(a));
  return p * m;
}

vec2 translate(vec2 p, vec2 t) {
  return p - t;
}

//////////////////////////////
// Distance field functions //
//////////////////////////////


float pie(vec2 p, float angle) {
  angle = radians(angle) / 2.0;
  vec2 n = vec2(cos(angle), sin(angle));
  return abs(p).x * n.x + p.y*n.y;
}

float circleDist(vec2 p, float radius) {
  return length(p) - radius;
}

float sdTriangle( in vec2 p0, in vec2 p1, in vec2 p2, in vec2 p ) {
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

float triangleDist(vec2 p, float radius) {
  // return max( abs(p).x * 0.866025 + p.y * 0.5, -p.y) -radius * 0.5;
  float width = radius;
  float height = radius * 0.866025;
  return sdTriangle(vec2(-width/2.0, 0), vec2(0, height), vec2(width/2.0, 0), p);
}

float triangleDist(vec2 p, float width, float height) {
  return sdTriangle(vec2(-width/2.0, 0), vec2(0, height), vec2(width/2.0, 0), p);
  // vec2 n = normalize(vec2(height, width / 2.0));
  // return max( abs(p).x*n.x + p.y*n.y - (height*n.y), -p.y);
}

float semiCircleDist(vec2 p, float radius, float angle, float width) {
  width /= 2.0;
  radius -= width;
  return substract(pie(p, angle), abs(circleDist(p, radius)) - width);
}

float boxDist(vec2 p, vec2 size, float radius) {
  size -= vec2(radius);
  vec2 d = abs(p) - size;
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - radius;
}

float lineDist(vec2 p, vec2 start, vec2 end, float width) {
  vec2 dir = start - end;
  float lngth = length(dir);
  dir /= lngth;
  vec2 proj = max(0.0, min(lngth, dot((start - p), dir))) * dir;
  return length( (start - p) - proj ) - (width / 2.0);
}

///////////////////////
// Masks for drawing //
///////////////////////

float fillMask(float dist) {
  return clamp(-dist, 0.0, 1.0);
}

float innerBorderMask(float dist, float width) {
  //dist += 1.0;
  float alpha1 = clamp(dist + width, 0.0, 1.0);
  float alpha2 = clamp(dist, 0.0, 1.0);
  return alpha1 - alpha2;
}

float outerBorderMask(float dist, float width) {
  //dist += 1.0;
  float alpha1 = clamp(dist, 0.0, 1.0);
  float alpha2 = clamp(dist - width, 0.0, 1.0);
  return alpha1 - alpha2;
}

///////////////
// The scene //
///////////////

float sceneDist(vec2 p) {
  float c = circleDist(   translate(p, vec2(100, 250)), 40.0);
  float b1 =  boxDist(    translate(p, vec2(200, 250)), vec2(40, 40),   0.0);
  float b2 =  boxDist(    translate(p, vec2(300, 250)), vec2(40, 40),   10.0);
  float l = lineDist(     p,       vec2(370, 220),  vec2(430, 280), 10.0);
  float t1 = triangleDist(  translate(p, vec2(500, 210)), 80.0,       80.0);
  // float t2 = triangleDist(  rotateCW(translate(p, vec2(600, 250)), iGlobalTime), 40.0);
  // float t2 = triangleDist(  p, 40.0);
  
  vec2 t3p = (2.0*gl_FragCoord.xy-iResolution.xy)/iResolution.y;

  // vec2 v1 = cos( iGlobalTime + vec2(0.0, 1.57) + 0.0 );
  // vec2 v2 = cos( iGlobalTime + vec2(0.0, 1.57) + 2.0 );
  // vec2 v3 = cos( iGlobalTime + vec2(0.0, 1.57) + 4.0 );

  float t3 = sdTriangle( vec2(1, 0), vec2(-1, -1), vec2(-1, 1), t3p );

  float m;
  m = t3;
  // m = merge(c, b1);
  // m = merge(m, b2);
  // m = merge(m, l);
  // m = merge(m, t1);
  // m = merge(m, t2);
  
  // float b3 = boxDist(   translate(p, vec2(100, sin(iGlobalTime * 1.0 + 1.0) * 40.0 + 100.0)), 
  //               vec2(40, 15),   0.0);
  // float c2 = circleDist(  translate(p, vec2(100, 100)), 30.0);
  // float s = substract(b3, c2);
  
  // float b4 = boxDist(   translate(p, vec2(200, sin(iGlobalTime * 1.0 + 2.0) * 40.0 + 100.0)), 
  //               vec2(40, 15),   0.0);
  // float c3 = circleDist(  translate(p, vec2(200, 100)),   30.0);
  // float i = intersect(b4, c3);
  
  // float b5 = boxDist(   translate(p, vec2(300, sin(iGlobalTime * 1.0 + 3.0) * 40.0 + 100.0)), 
  //               vec2(40, 15),   0.0);
  // float c4 = circleDist(  translate(p, vec2(300, 100)),   30.0);
  // float a = merge(b5, c4);
  
  // float b6 = boxDist(   translate(p, vec2(400, 100)), vec2(40, 15),   0.0);
  // float c5 = circleDist(  translate(p, vec2(400, 100)),   30.0);
  // float sm = smoothMerge(b6, c5, 10.0);
  
  // float sc = semiCircleDist(translate(p, vec2(500,100)), 40.0, 90.0, 10.0);
    
  //   float b7 = boxDist(   translate(p, vec2(600, sin(iGlobalTime * 1.0 + 3.0) * 40.0 + 100.0)), 
  //               vec2(40, 15),   0.0);
  // float c6 = circleDist(  translate(p, vec2(600, 100)),   30.0);
  // float e = mergeExclude(b7, c6);
    
  // m = merge(m, s);
  // m = merge(m, i);
  // m = merge(m, a);
  // m = merge(m, sm);
  // m = merge(m, sc);
  // m = merge(m, e);
  
  return m;
}

float sceneSmooth(vec2 p, float r) {
  float accum = sceneDist(p);
  accum += sceneDist(p + vec2(0.0, r));
  accum += sceneDist(p + vec2(0.0, -r));
  accum += sceneDist(p + vec2(r, 0.0));
  accum += sceneDist(p + vec2(-r, 0.0));
  return accum / 5.0;
}

//////////////////////
// Shadow and light //
//////////////////////


float shadow(vec2 p, vec2 pos, float radius) {
  vec2 dir = normalize(pos - p);
  float dl = length(p - pos);
  
  // fraction of light visible, starts at one radius (second half added in the end);
  float lf = radius * dl;
  
  // distance traveled
  float dt = 0.01;

  for (int i = 0; i < 64; ++i) {       
    // distance to scene at current position
    float sd = sceneDist(p + dir * dt);

      // early out when this ray is guaranteed to be full shadow
      if (sd < -radius) 
        return 0.0;
        
    // width of cone-overlap at light
    // 0 in center, so 50% overlap: add one radius outside of loop to get total coverage
    // should be '(sd / dt) * dl', but '*dl' outside of loop
    lf = min(lf, sd / dt);
    
    // move ahead
    dt += max(1.0, abs(sd));
    if (dt > dl) break;
  }

  // multiply by dl to get the real projected overlap (moved out of loop)
  // add one radius, before between -radius and + radius
  // normalize to 1 ( / 2*radius)
  lf = clamp((lf*dl + radius) / (2.0 * radius), 0.0, 1.0);
  lf = smoothstep(0.0, 1.0, lf);
  return lf;
}

vec4 drawLight(vec2 p, vec2 pos, vec4 color, float dist, float range, float radius) {
  // distance to light
  float ld = length(p - pos);
  
  // out of range
  if (ld > range) return vec4(0.0);
  
  // shadow and falloff
  float shad = shadow(p, pos, radius);
  float fall = (range - ld)/range;
  fall *= fall;
  float source = fillMask(circleDist(p - pos, radius));
  return (shad * fall + source) * color;
}

float luminance(vec4 col) {
  return 0.2126 * col.r + 0.7152 * col.g + 0.0722 * col.b;
}

void setLuminance(inout vec4 col, float lum) {
  lum /= luminance(col);
  col *= lum;
}

float AO(vec2 p, float dist, float radius, float intensity) {
  float a = clamp(dist / radius, 0.0, 1.0) - 1.0;
  return 1.0 - (pow(abs(a), 5.0) + 1.0) * intensity + (1.0 - intensity);
  // return smoothstep(0.0, 1.0, dist / radius);
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

/////////////////
// The program //
/////////////////


// void mainImage( out vec4 fragColor, in vec2 fragCoord )
void main() {
  vec2 fragCoord = gl_FragCoord.xy;

  vec2 p = fragCoord.xy + vec2(0.5);
  vec2 c = iResolution.xy / 2.0;
  
  //float dist = sceneSmooth(p, 5.0);
  float dist = sceneDist(p);
  
  vec2 light1Pos = iMouse.xy;
  vec4 light1Col = vec4(0.75, 1.0, 0.5, 1.0);
  setLuminance(light1Col, 0.4);
  
  vec2 light2Pos = vec2(iResolution.x * (sin(iGlobalTime + 3.1415) + 1.2) / 2.4, 175.0);
  vec4 light2Col = vec4(1.0, 0.75, 0.5, 1.0);
  setLuminance(light2Col, 0.5);
  
  vec2 light3Pos = vec2(iResolution.x * (sin(iGlobalTime) + 1.2) / 2.4, 340.0);
  vec4 light3Col = vec4(0.5, 0.75, 1.0, 1.0);
  setLuminance(light3Col, 0.6);
  
  vec4 col;

  // fractal
  // vec2 uv = 2. * fragCoord.xy / iResolution.xy - 1.;
  // vec2 uvs = uv * iResolution.xy / max(iResolution.x, iResolution.y);
  // vec3 fractPos = vec3(uvs / 4., 0) + vec3(1., -1.3, 0.);
  // fractPos += .2 * vec3(sin(iGlobalTime / 16.), sin(iGlobalTime / 12.),  sin(iGlobalTime / 128.));
  // float t = field(fractPos);
  // float v = (1. - exp((abs(uv.x) - 1.) * 6.)) * (1. - exp((abs(uv.y) - 1.) * 6.));
  // col = mix(.4, 1., v) * vec4(1.8 * t * t * t, 1.4 * t * t, t, 1.0);

  // gradient
  col = vec4(0.5, 0.5, 0.5, 1.0) * (1.0 - length(c - p)/iResolution.x);
  
  // grid
  col *= clamp(min(mod(p.y, 10.0), mod(p.x, 10.0)), 0.9, 1.0);
  
  // ambient occlusion
  // col *= AO(p, sceneSmooth(p, 10.0), 40.0, 0.4);
  col *= AO(p, dist, 400.0, 0.4);
  //col *= 1.0-AO(p, sceneDist(p), 40.0, 1.0);

  // light
  // col += drawLight(p, light1Pos, light1Col, dist, 150.0, 6.0);
  // col += drawLight(p, light2Pos, light2Col, dist, 200.0, 8.0);
  // col += drawLight(p, light3Pos, light3Col, dist, 300.0, 12.0);
  

  vec3 col3 = vec3(1.0) - sign(dist) * vec3(0.1,0.4,0.7);
  col3 *= 1.0 - exp(-2.0*abs(dist));
  col3 *= 0.8 + 0.2*cos(120.0*dist);
  col3 = mix( col3, vec3(1.0), 1.0-smoothstep(0.0,0.02,abs(dist)) );
  col = vec4(col3, 1.0);

  // // shape fill
  // col = mix(col, vec4(1.0, 0.4, 0.0, 1.0), fillMask(dist));
  
  // // shape outline
  // col = mix(col, vec4(0.1, 0.1, 0.1, 1.0), innerBorderMask(dist, 1.5));

  gl_FragColor = clamp(col, 0.0, 1.0);
}

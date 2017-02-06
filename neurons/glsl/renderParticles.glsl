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

uniform sampler2D iChannel0;
uniform sampler2D iChannel1;

uniform float iChannelTime[4];
uniform vec3 iChannelResolution[4];
uniform vec4 iDate;
uniform float iSampleRate;

const float PI      = 3.1415;
const float EPSILON = 1e-3;
const float pi = 3.14159;
const float pi2 = pi * 2.;

////////////////////////////////////////

#define time iGlobalTime

const int numParticles = 10;
const int stepsPerFrame = 3;

float len2(vec3 p) { return dot(p, p); }

void main() {
  vec2 uv = fragCoord.xy / iResolution.xy;
  vec4 oldCol = texture2D(iChannel1, uv);

  vec2 one = 1. / iResolution.xy;

  vec2 uvUniformCoords = fragCoord.xy / iResolution.xy-0.5;
  uvUniformCoords.x *= iResolution.x / iResolution.y;
  vec3 rayDir = normalize(vec3(uvUniformCoords, -1.));
  
  vec3 rayOrigin = vec3(0., 0., 4.);
  
  vec4 newCol = vec4(0);
  for (int i = 0; i < numParticles; i++) {
    vec3 pos = texture2D(iChannel0, vec2(i, 0.0) * one.y).rgb;
    vec3 vel = texture2D(iChannel0, vec2(i, 2.0) * one.y).rgb;

    for (int j = 0; j < stepsPerFrame; j++) {
      float dist = len2((rayDir*dot(rayDir, pos.xyz-rayOrigin)+rayOrigin) - pos.xyz);
      dist *= 500.0;
      float falloffImmediate = 0.01;
      float falloffLong = 1.2;
      float mult = 0.09;
      float alpha = mult / (pow(dist, falloffLong) + falloffImmediate);
      
      newCol.rgb += alpha * abs( 0.3 + 0.7*sin( vec3(2., 3.4, 1.2) * ( (time + float(i)*0.1)*0.04 + 1. ) + vec3(0.8, 0.0, 1.2) ) );
      pos.xyz += vel*0.0004;
    }
  }
  newCol /= float(stepsPerFrame);
  
  vec4 col = (newCol + oldCol) * 0.99;
  
  // init
  if (iFrame < 20) col = vec4(0);
  
  fragColor = col;
}
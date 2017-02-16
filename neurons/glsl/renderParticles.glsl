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
uniform sampler2D iChannel2;

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

// #define NUM_PARTICLES 8
#define DECAY_RATE 0.995
// #define DECAY_RATE 0.99

const int stepsPerFrame = 5;

float len2(vec3 p) { return dot(p, p); }

void main() {
  vec2 uv = fragCoord.xy / iResolution.xy;
  vec4 oldCol = texture2D(iChannel1, uv);

  vec2 one = 1. / iResolution.xy;

  float focalDist = 0.75;
  vec2 uvUniformCoords = fragCoord.xy / iResolution.xy-0.5;
  uvUniformCoords.x *= iResolution.x / iResolution.y;
  vec3 rayDir = normalize(vec3(uvUniformCoords, -focalDist));
  
  vec3 rayOrigin = vec3(0., 0., 2.5);
  
  vec4 newCol = vec4(0);
  for (int i = 0; i < NUM_PARTICLES; i++) {
    vec3 pos = texture2D(iChannel0, vec2(i, 0.0) * one.x).rgb;
    vec3 vel = texture2D(iChannel0, vec2(i, 2.0) * one.y).rgb;

    for (int j = 0; j < stepsPerFrame; j++) {
      vec3 tracePos = pos.xyz * vec3(1., 1., 0.5);

      float dist = len2((rayDir*dot(rayDir, tracePos-rayOrigin)+rayOrigin) - tracePos);
      dist *= 400.0;
      float falloffImmediate = 0.0030;
      float falloffLong = 1.0;
      float mult = 0.085;
      float alpha = mult / (pow(dist, falloffLong) + falloffImmediate);
      
      newCol.rgb += alpha * abs(
        0.3 + 0.9*sin( 
          vec3(1.0) * ( 
            time*0.1 
          ) 
        + vec3(1.0, 0.66, 0.33)*3.14
        + vec3(float(i)/float(NUM_PARTICLES))*3.14*0.5
        ) 
      );
      
      pos.xyz += vel / float(stepsPerFrame) * 0.0002;
    }
  }
  newCol /= float(stepsPerFrame);
  
  vec4 col = (newCol + oldCol * (DECAY_RATE 
    // + texture2D(iChannel2, vec2(time/256.0 * 0.1)).x * 0.007) 
    + (sin(time*3.14 * 0.1)*0.5+0.5) * 0.003
  ));
  
  // init
  if (iFrame < 24) col = vec4(0);
  
  fragColor = col;
}
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
// #define DECAY_RATE 0.995
#define DECAY_RATE 0.99
// #define DECAY_RATE 0.99

const int stepsPerFrame = 1;

float len2(vec3 p) { return dot(p, p); }

void main() {
  vec2 uv = fragCoord.xy / iResolution.xy;
  vec2 one = 1. / iResolution.xy;

  vec4 oldCol = texture2D(iChannel1, uv);

  // ray dir
  float focalDist = 0.75;
  vec2 rayScreenCoords = fragCoord.xy / iResolution.xy-0.5;
  rayScreenCoords.x *= iResolution.x / iResolution.y;
  vec3 rayDir = normalize(vec3(rayScreenCoords, -focalDist));
  
  // ray origin
  vec3 rayOrigin = vec3(0., 0., 2.5);
  
  vec4 newCol = vec4(0);
  for (int i = 0; i < NUM_PARTICLES + NUM_SMALL_PARTICLES; i++) {
    bool isPlayer = i < NUM_PARTICLES;

    float x = float(i) + 0.5;

    vec3 target = texture2D(iChannel0, vec2((float(i)+0.5) * one.x, 2.5*one.y)).xyz;
    vec3 data = texture2D(iChannel0, vec2((float(i)+0.5) * one.x, 3.5*one.y)).xyz;
    bool enabled = data.x > 0.0;
    enabled = isPlayer || enabled;
    float amp = data.z;

    if (enabled) {
      vec3 pos = texture2D(iChannel0, vec2(x * one.x, 0.5*one.y)).rgb;
      vec3 vel = texture2D(iChannel0, one * vec2(x * one.x, 1.5*one.y)).rgb;

      float a = amp;
      a = clamp(amp * 9.0, 0.0, 1.0);
      a = pow(a, 0.5);

      // note: distMult is inverse of scale
      float distMult = 10.0;

      float falloffImmediate = 0.003;
      float falloffLong = 0.9;
      float mult = 0.3;

      for (int j = 0; j < stepsPerFrame; j++) {
        vec3 tracePos = pos.xyz * vec3(1., 1., 0.25);

        float dist = len2((rayDir*dot(rayDir, tracePos-rayOrigin)+rayOrigin) - tracePos);
        dist *= distMult;
        float alpha = mult / (pow(dist, falloffLong) + falloffImmediate);
        
        newCol.rgb += alpha * 0.8;
        
        // step through backwards
        pos.xyz -= vel / float(stepsPerFrame) * INTEGRATE_STEP;
      }
    }
  }
  newCol /= float(stepsPerFrame);
  
  vec4 col = (newCol + oldCol * (DECAY_RATE 
  // vec4 col = (newCol * (DECAY_RATE 
    // + (sin(time*3.14 * 0.1)*0.5+0.5) * 0.003
    // + texture2D(iChannel2, vec2(time/256.0 * 0.1)).x * 0.007) 
  ));
  
  // init
  if (iFrame < 24) col = vec4(0);
  
  fragColor = col;
}
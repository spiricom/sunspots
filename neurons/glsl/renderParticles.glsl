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

const int numParticles = 140;
const int stepsPerFrame = 7;

float len2(vec3 p) { return dot(p,p); }

vec4 drawParticles(in vec3 ro, in vec3 rd) {
  vec4 col = vec4(0);
  vec2 one = 1. / iResolution.xy;
  
  for (int i = 0; i < numParticles; i++) {
    vec3 pos = texture2D(iChannel0, vec2(i, 100.0) * one).rgb;
    vec3 vel = texture2D(iChannel0, vec2(i, 0.0) * one).rgb;
    for (int j = 0; j < stepsPerFrame; j++) {
      float d = len2((ro + rd*dot(pos.xyz - ro, rd)) - pos.xyz);
      d *= 500.0;
      d = 0.34 / (pow(d, 1.1) + 0.03);
      
      col.rgb += d * abs(sin(vec3(2.,3.4,1.2) * (time*0.06 + 0.003*float(i) + 2.75) + vec3(0.8, 0.0, 1.2)) * 0.7 + 0.3) * 0.04;
      pos.xyz += vel*0.002*0.2;
    }
  }
  col /= float(stepsPerFrame);
  
  return col;
}

void main() {
  vec2 uv = fragCoord.xy / iResolution.xy;
  vec2 uvUniformCoords = fragCoord.xy / iResolution.xy-0.5;
  uvUniformCoords.x *= iResolution.x / iResolution.y;
  
  vec3 ro = vec3(0., 0., 2.5);
  vec3 rd = normalize(vec3(uvUniformCoords, -0.5));
  
  vec4 newCol = drawParticles(ro, rd);
  vec4 oldCol = texture2D(iChannel1, uv);
  
  vec4 col = (newCol + oldCol) * 0.99;
  
  // clear
  if (iFrame < 5) col = vec4(0);
  
  fragColor = col;
}
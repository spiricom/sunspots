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

#define time iGlobalTime

///////////////////////////////////////////



///////////////////////////////////////////

float len2(vec3 p) { return dot(p, p); }

vec3 hash33(vec3 p) {
  p = fract(p * vec3(443.8975, 397.2973, 491.1871));
  p += dot(p.zxy, p.yxz + 19.1);
  return fract(vec3(p.x*p.y, p.z*p.x, p.y*p.z))-0.5;
}

void main() {
  vec2 uv = fragCoord.xy / iResolution.xy;
  vec2 one = 1. / iResolution.xy;
  
  bool isPos = fragCoord.y == 0.5;
  bool isVel = fragCoord.y == 1.5;
  vec4 col= vec4(0);

  vec3 targetPos = texture2D(iChannel0, vec2(uv.x, 2.5 * one.y)).xyz;

  // init
  if (iFrame < 20) {
    vec4 rand = texture2D(iChannel1, uv * 30.) - vec4(0.5);
    if (isPos) {
      // col = rand * 20.;
      col.rgb = targetPos;
    }
    else if (isVel) {
      col = rand * 2.;
    }
    else {
      col.rgb = vec3(0.0);
    }
  }
  // update
  else {
    vec3 pos = texture2D(iChannel0, vec2(uv.x, 0.5 * one.y)).xyz;
    vec3 vel = texture2D(iChannel0, vec2(uv.x, 1.5 * one.y)).xyz;

    int particleIdx = int(fragCoord.x);

    // update vel
    vel.xyz = vel.xyz*.99 + hash33(vel * 2. + time * 1.) * 10.;
    // vel.xyz = vel.xyz*.999 + texture2D(iChannel1, 
    //   vec2(vel * 2. + time * 3.)
    // );

    // keep close
    // if (length(pos) > 1.2 && dot(vel, pos) > 0.0) {
    //   vel *= 0.99;
    //   vel += normalize(pos) * -0.3;
    // }

    // go to target
    vec3 offsetToTarget = targetPos - pos;
    float distToTarget = length(offsetToTarget);
    float maxDist = 0.3;
    if (distToTarget > maxDist) {
      vec3 inPos = pos + (normalize(offsetToTarget) * (distToTarget - maxDist));
      vec3 targetVel = (inPos - pos) / 0.0002;
      vel = vel * 0.996 + targetVel * 0.004;
      // vel = vec3(0.0);
    }
    // pos = targetPos;

    float velMag = length(vel);
    if (velMag > 30.5) {
      vel = normalize(vel) * 30.5;
    }

    // write back and integrate velocity
    if (isPos) {
      pos.rgb += vel * 0.0002;
      col.rgb = pos.rgb;
    }
    else if (isVel) {
      col.rgb = vel.rgb;
    }
    else {
      col.rgb = targetPos;
    }
    
  }
  

  fragColor = col;
}
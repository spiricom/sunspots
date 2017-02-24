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
  vec4 col= vec4(0.5);

  int particleIdx = int(fragCoord.x);
  bool isPlayer = particleIdx < NUM_PARTICLES;

  vec4 data = texture2D(iChannel0, vec2(uv.x, 3.5 * one.y));
  bool enabled = data.x > 0.0 || isPlayer;
  // bool targetSeek = data.y > 0.0;
  // enabled = true;

  // init
  if (iFrame < 20) {
    vec3 targetPos = texture2D(iChannel0, vec2(uv.x, 2.5 * one.y)).xyz;
    vec4 rand = texture2D(iChannel1, fragCoord.xy/256.0) - vec4(0.5);
    if (isPos) {
      // if (isPlayer) {
        col.rgb = targetPos;
      // }
      // else {
      //   col = rand * 4.0;
      //   col.z = -1.0;
      //   col.y -= 0.5;
      // }
    }
    else if (isVel) {
      col = rand * 2.;
    }
    // else {
    //   col.rgb = vec3(0.0);
    // }
  }
  // update
  else {

    if (particleIdx < NUM_PARTICLES + NUM_SMALL_PARTICLES && enabled) {
      vec3 pos = texture2D(iChannel0, vec2(uv.x, 0.5 * one.y)).xyz;
      vec3 vel = texture2D(iChannel0, vec2(uv.x, 1.5 * one.y)).xyz;

      vec3 targetPos;
      if (isPlayer) {
        targetPos = texture2D(iChannel0, vec2(uv.x, 2.5 * one.y)).xyz;
      }
      else {
        targetPos = texture2D(iChannel0, vec2(uv.x, 2.5 * one.y)).xyz;
        targetPos = texture2D(iChannel0, vec2((floor(targetPos.x)+0.5)*one.x, 0.5 * one.y)).xyz;
      }

      // update vel
      float velMult = isPlayer ? 20. : 80.;
      vel.xyz = vel.xyz*.99 + hash33(vel * 2. + time * 1.) * velMult;

      // keep close
      // if (length(pos) > 1.2 && dot(vel, pos) > 0.0) {
      //   vel *= 0.99;
      //   vel += normalize(pos) * -0.3;
      // }

      // // only for main players
      // if (particleIdx < NUM_PARTICLES) {
      // }

      // GO TO TARGET
      // bool targetSeek = data.y != 0.0;

      vec3 offsetToTarget = targetPos - pos;
      float distToTarget = length(offsetToTarget);
      float maxDist = isPlayer ? 0.05 : 0.1;
      if (distToTarget > maxDist || data.y < 0.0 && distToTarget < 0.0) {
        vec3 inPos = pos + (normalize(offsetToTarget) * (distToTarget - maxDist));
        vec3 targetVel = (inPos - pos) / INTEGRATE_STEP;
        targetVel *= sign(data.y); // data.y == -1 -> seek away

        float a = isPlayer ? 0.0001 : 0.0026 + sin(float(particleIdx)) * 0.0005;
        vel = vel * (1.0-a) + targetVel * a;
      }

      // clamp vel
      float velMag = length(vel);
      float maxVel = isPlayer ? 50.5 : 80.5;
      if (velMag > maxVel) {
        vel = normalize(vel) * maxVel;
      }

      // write back and integrate velocity
      if (isPos) {
        pos.rgb += vel * INTEGRATE_STEP;
        col.rgb = pos.rgb;
      }
      else if (isVel) {
        col.rgb = vel.rgb;
      }
      else {
        // col.rgb = targetPos;
        col = texture2D(iChannel0, uv);
      }
    }
    else {
      col = texture2D(iChannel0, uv);  
    }
  }
  

  fragColor = col;
}
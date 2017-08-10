uniform sampler2D initPositions;
uniform sampler2D positions;
uniform sampler2D prevPositions;
uniform sampler2D velocities;

uniform float particlesPerSide;
uniform float FABRIC_SIDE_LENGTH;

uniform float time;

varying vec2 vUv;
varying vec2 vOne;

// constants /////////////////////////////////////

#ifndef BEND_POINT_OFFSET
#define BEND_POINT_OFFSET 2.0
#endif

#define DAMPING 0.0

#define REST_DIST (FABRIC_SIDE_LENGTH / particlesPerSide) // between neighboring particles

#define REST_DIST_BEND (REST_DIST * BEND_POINT_OFFSET)

// #define SHEAR_CONSTRAINTS_ENABLED

// functions, procedures, and macros /////////////////////////////////////

#define sqrt2 1.41421356 // change this to make it weird

#define px vOne.x
#define py vOne.y

bool IS_EDGE_L(vec2 uv) { return (uv.x <= px); }
bool IS_EDGE_R(vec2 uv) { return (uv.x >= 1.0 - px); }
bool IS_EDGE_B(vec2 uv) { return (uv.y <= py); }
bool IS_EDGE_T(vec2 uv) { return (uv.y >= 1.0 - py); }

bool IS_EDGE_X(vec2 uv) { return (uv.x <= px || uv.x >= 1.0 - px); }
bool IS_EDGE_Y(vec2 uv) { return (uv.y <= py || uv.y >= 1.0 - py); }

bool IS_EDGE(vec2 uv) { return (IS_EDGE_X(uv) || IS_EDGE_Y(uv)); }
bool IS_CORNER(vec2 uv) { return (IS_EDGE_X(uv) && IS_EDGE_Y(uv)); }

// NOTE: need to call this on both particles involved
vec3 SatisfyConstraint(vec3 p1, vec3 p2, bool pin2, float targetDist) {
  if (p1 == p2) return p1;
  vec3 diff = p2 - p1;
  float curDist = length(diff);
  vec3 correction = diff/curDist * (curDist - targetDist);

  // other one's pinned? -> compensate 100% on this point
  if (pin2) {
    p1 += correction;
  }
  // not pinned -> just compensate 50%
  else {
    p1 += correction * 0.5;
  }

  return p1;
}

float modI(float a,float b) {
  float m=a-floor((a+0.5)/b)*b;
  return floor(m+0.5);
}

// main //////////////////////////////////////

void main() {
  
  vec4 posPinned;

  // read pos/vel of this and adjacent particles
  // c/r/l/t/b: center, right, left, top, bottom
  vec2 uvcc = vUv;
  posPinned = texture2D( positions, uvcc );
  vec3 poscc = posPinned.rgb;
  bool pincc = posPinned.a > 0.5;

  vec2 uvrc = uvcc + vOne * vec2(1.0, 0.0);
  vec2 uvct = uvcc + vOne * vec2(0.0, 1.0);
  vec2 uvlc = uvcc + vOne * vec2(-1.0, 0.0);
  vec2 uvcb = uvcc + vOne * vec2(0.0, -1.0);
  
#if defined(STRETCH_PASS_H_1) || defined(STRETCH_PASS_H_2) || defined(INTEGRATE_VEL_PASS)
  // off by 1 (cardinal)
  posPinned = texture2D( positions, uvrc );
  vec3 posrc = posPinned.rgb;
  bool pinrc = posPinned.a > 0.5;
  
  posPinned = texture2D( positions, uvlc );
  vec3 poslc = posPinned.rgb;
  bool pinlc = posPinned.a > 0.5;
#endif

#if defined(STRETCH_PASS_V_1) || defined(STRETCH_PASS_V_2) || defined(INTEGRATE_VEL_PASS)
  // off by 1 (cardinal)
  posPinned = texture2D( positions, uvct );
  vec3 posct = posPinned.rgb;
  bool pinct = posPinned.a > 0.5;

  posPinned = texture2D( positions, uvcb );
  vec3 poscb = posPinned.rgb;
  bool pincb = posPinned.a > 0.5;
#endif

#if defined(SHEAR_CONSTRAINTS_ENABLED) && (defined(SHEAR_PASS_1) || defined(SHEAR_PASS_2) || defined(SHEAR_PASS_3) || defined(SHEAR_PASS_4))
  // off by 1 (ordinal)
  vec2 uvrt = uvcc + vOne * vec2(1.0, 1.0);
  posPinned = texture2D( positions, uvrt );
  vec3 posrt = posPinned.rgb;
  bool pinrt = posPinned.a > 0.5;
  
  vec2 uvlt = uvcc + vOne * vec2(-1.0, 1.0);
  posPinned = texture2D( positions, uvlt );
  vec3 poslt = posPinned.rgb;
  bool pinlt = posPinned.a > 0.5;
  
  vec2 uvlb = uvcc + vOne * vec2(-1.0, -1.0);
  posPinned = texture2D( positions, uvlb );
  vec3 poslb = posPinned.rgb;
  bool pinlb = posPinned.a > 0.5;

  vec2 uvrb = uvcc + vOne * vec2(1.0, -1.0);
  posPinned = texture2D( positions, uvrb );
  vec3 posrb = posPinned.rgb;
  bool pinrb = posPinned.a > 0.5;
#endif
  
#if defined(BEND_PASS_1) || defined(BEND_PASS_2) || defined(BEND_PASS_3) || defined(BEND_PASS_4)
  // off by 2 (cardinal)
  vec2 uvrc2 = uvcc + vOne * vec2(BEND_POINT_OFFSET, 0.0);
  posPinned = texture2D( positions, uvrc2 );
  vec3 posrc2 = posPinned.rgb;
  bool pinrc2 = posPinned.a > 0.5;
  
  vec2 uvct2 = uvcc + vOne * vec2(0.0, BEND_POINT_OFFSET);
  posPinned = texture2D( positions, uvct2 );
  vec3 posct2 = posPinned.rgb;
  bool pinct2 = posPinned.a > 0.5;
  
  vec2 uvlc2 = uvcc + vOne * vec2(-BEND_POINT_OFFSET, 0.0);
  posPinned = texture2D( positions, uvlc2 );
  vec3 poslc2 = posPinned.rgb;
  bool pinlc2 = posPinned.a > 0.5;

  vec2 uvcb2 = uvcc + vOne * vec2(0.0, -BEND_POINT_OFFSET);
  posPinned = texture2D( positions, uvcb2 );
  vec3 poscb2 = posPinned.rgb;
  bool pincb2 = posPinned.a > 0.5;
#endif

// update + integrate vel
#ifdef INTEGRATE_VEL_PASS

  vec3 prevPoscc = texture2D( prevPositions, uvcc ).rgb;
  vec3 vel = poscc - prevPoscc;

  // wind
  float windStrength = cos(time / 7000.0) * 20.0 + 40.0;
  windStrength = windStrength / 60.0 / 60.0 * 2.0 * 100.0;

  vec3 windDir = vec3(
    sin((time+100.0) / 2.6),
    cos((time+32.0) / 3.3),
    sin(time / 3.7)
  );
  windDir = normalize(windDir);

  if (!IS_EDGE_R(uvcc) && !IS_EDGE_T(uvcc)) {
    vec3 normal = cross(poscc - posrc, poscc - posct);
    normal = normalize(normal);

    vec3 windEffect = normal * dot(normal, windDir) * windStrength;
    if (dot(normal, windDir) < 0.0) windEffect *= -1.0;
    vel += windEffect;
  }
  if (!IS_EDGE_L(uvcc) && !IS_EDGE_T(uvcc)) {
    vec3 normal = -cross(poscc - poslc, poscc - posct);
    normal = normalize(normal);

    vec3 windEffect = normal * dot(normal, windDir) * windStrength;
    if (dot(normal, windDir) < 0.0) windEffect *= -1.0;
    vel += windEffect;
  }
  if (!IS_EDGE_L(uvcc) && !IS_EDGE_B(uvcc)) {
    vec3 normal = cross(poscc - poslc, poscc - poscb);
    normal = normalize(normal);

    vec3 windEffect = normal * dot(normal, windDir) * windStrength;
    if (dot(normal, windDir) < 0.0) windEffect *= -1.0;
    vel += windEffect;
  }
  if (!IS_EDGE_R(uvcc) && !IS_EDGE_B(uvcc)) {
    vec3 normal = -cross(poscc - posrc, poscc - poscb);
    normal = normalize(normal);

    vec3 windEffect = normal * dot(normal, windDir) * windStrength;
    if (dot(normal, windDir) < 0.0) windEffect *= -1.0;
    vel += windEffect;
  }

  // damping
  vel *= (1.0 - DAMPING);

  // update pos
  poscc += vel;
#endif

  // corner? -> just pin it
  if (pincc) {
    poscc = texture2D( initPositions, uvcc ).rgb;
  }

  // not a corner -> enforce constraints
  else {

    float xmod2 = modI(gl_FragCoord.x, 2.0);
    float xmod4 = modI(gl_FragCoord.x, 4.0);
    float ymod2 = modI(gl_FragCoord.y, 2.0);
    float ymod4 = modI(gl_FragCoord.y, 4.0);

#ifdef STRETCH_PASS_H_1
    if (xmod2 == 0.0) {
      if (!IS_EDGE_R(uvcc)) poscc = SatisfyConstraint(poscc, posrc, pinrc, REST_DIST);
    }
    else {
      if (!IS_EDGE_L(uvcc)) poscc = SatisfyConstraint(poscc, poslc, pinlc, REST_DIST);
    }
#endif

#ifdef STRETCH_PASS_H_2
    if (xmod2 == 0.0) {
      if (!IS_EDGE_L(uvcc)) poscc = SatisfyConstraint(poscc, poslc, pinlc, REST_DIST);
    }
    else {
      if (!IS_EDGE_R(uvcc)) poscc = SatisfyConstraint(poscc, posrc, pinrc, REST_DIST);
    }
#endif

#ifdef STRETCH_PASS_V_1
    if (ymod2 == 0.0) {
      if (!IS_EDGE_T(uvcc)) poscc = SatisfyConstraint(poscc, posct, pinct, REST_DIST);
    }
    else {
      if (!IS_EDGE_B(uvcc)) poscc = SatisfyConstraint(poscc, poscb, pincb, REST_DIST);
    }
#endif

#ifdef STRETCH_PASS_V_2
    if (ymod2 == 0.0) {
      if (!IS_EDGE_B(uvcc)) poscc = SatisfyConstraint(poscc, poscb, pincb, REST_DIST);
    }
    else {
      if (!IS_EDGE_T(uvcc)) poscc = SatisfyConstraint(poscc, posct, pinct, REST_DIST);
    }
#endif

// SHEAR
#ifdef SHEAR_CONSTRAINTS_ENABLED
#ifdef SHEAR_PASS_1
    if (xmod2 == 0.0) {
      if (ymod2 == 0.0)
        if (!IS_EDGE_R(uvcc) && !IS_EDGE_B(uvcc)) poscc = SatisfyConstraint(poscc, posrb, pinrb, REST_DIST * sqrt2);
      else
        if (!IS_EDGE_R(uvcc) && !IS_EDGE_T(uvcc)) poscc = SatisfyConstraint(poscc, posrt, pinrt, REST_DIST * sqrt2);
    }
    else {
      if (ymod2 == 0.0)
        if (!IS_EDGE_L(uvcc) && !IS_EDGE_B(uvcc)) poscc = SatisfyConstraint(poscc, poslb, pinlb, REST_DIST * sqrt2);
      else
        if (!IS_EDGE_L(uvcc) && !IS_EDGE_T(uvcc)) poscc = SatisfyConstraint(poscc, poslt, pinlt, REST_DIST * sqrt2);
    }
#endif

#ifdef SHEAR_PASS_2
    if (xmod2 == 0.0) {
      if (ymod2 == 0.0)
        if (!IS_EDGE_L(uvcc) && !IS_EDGE_T(uvcc)) poscc = SatisfyConstraint(poscc, poslt, pinlt, REST_DIST * sqrt2);
      else
        if (!IS_EDGE_L(uvcc) && !IS_EDGE_B(uvcc)) poscc = SatisfyConstraint(poscc, poslb, pinlb, REST_DIST * sqrt2);
    }
    else {
      if (ymod2 == 0.0)
        if (!IS_EDGE_R(uvcc) && !IS_EDGE_T(uvcc)) poscc = SatisfyConstraint(poscc, posrt, pinrt, REST_DIST * sqrt2);
      else
        if (!IS_EDGE_R(uvcc) && !IS_EDGE_B(uvcc)) poscc = SatisfyConstraint(poscc, posrb, pinrb, REST_DIST * sqrt2);
    }
#endif

#ifdef SHEAR_PASS_3
    if (xmod2 == 0.0) {
      if (ymod2 == 0.0) {
        if (!IS_EDGE_L(uvcc) && !IS_EDGE_B(uvcc)) poscc = SatisfyConstraint(poscc, poslb, pinlb, REST_DIST * sqrt2);
      }
      else {
        if (!IS_EDGE_L(uvcc) && !IS_EDGE_T(uvcc)) poscc = SatisfyConstraint(poscc, poslt, pinlt, REST_DIST * sqrt2);
      }
    }
    else {
      if (ymod2 == 0.0) {
        if (!IS_EDGE_R(uvcc) && !IS_EDGE_B(uvcc)) poscc = SatisfyConstraint(poscc, posrb, pinrb, REST_DIST * sqrt2);
      }
      else {
        if (!IS_EDGE_R(uvcc) && !IS_EDGE_T(uvcc)) poscc = SatisfyConstraint(poscc, posrt, pinrt, REST_DIST * sqrt2);
      }
    }
#endif

#ifdef SHEAR_PASS_4
    if (xmod2 == 0.0) {
      if (ymod2 == 0.0) {
        if (!IS_EDGE_R(uvcc) && !IS_EDGE_T(uvcc)) poscc = SatisfyConstraint(poscc, posrt, pinrt, REST_DIST * sqrt2);
      }
      else {
        if (!IS_EDGE_R(uvcc) && !IS_EDGE_B(uvcc)) poscc = SatisfyConstraint(poscc, posrb, pinrb, REST_DIST * sqrt2);
      }
    }
    else {
      if (ymod2 == 0.0) {
        if (!IS_EDGE_L(uvcc) && !IS_EDGE_T(uvcc)) poscc = SatisfyConstraint(poscc, poslt, pinlt, REST_DIST * sqrt2);
      }
      else {
        if (!IS_EDGE_L(uvcc) && !IS_EDGE_B(uvcc)) poscc = SatisfyConstraint(poscc, poslb, pinlb, REST_DIST * sqrt2);
      }
    }
#endif
#endif

// BENDING
#ifdef BEND_PASS_1
    if (xmod4 == 0.0 || xmod4 == 1.0) {
      if (!IS_EDGE_R(uvrc)) poscc = SatisfyConstraint(poscc, posrc2, pinrc2, REST_DIST_BEND);
    } 
    else {
      if (!IS_EDGE_L(uvlc)) poscc = SatisfyConstraint(poscc, poslc2, pinlc2, REST_DIST_BEND);
    }
#endif

#ifdef BEND_PASS_2
    if (xmod4 == 0.0 || xmod4 == 1.0) {
      if (!IS_EDGE_L(uvlc)) poscc = SatisfyConstraint(poscc, poslc2, pinlc2, REST_DIST_BEND);
    } 
    else {
      if (!IS_EDGE_R(uvrc)) poscc = SatisfyConstraint(poscc, posrc2, pinrc2, REST_DIST_BEND);
    }
#endif

#ifdef BEND_PASS_3
    if (ymod4 == 0.0 || ymod4 == 1.0) {
      if (!IS_EDGE_T(uvct)) poscc = SatisfyConstraint(poscc, posct2, pinct2, REST_DIST_BEND);
    } 
    else {
      if (!IS_EDGE_B(uvcb)) poscc = SatisfyConstraint(poscc, poscb2, pincb2, REST_DIST_BEND);
    }
#endif

#ifdef BEND_PASS_4
    if (ymod4 == 0.0 || ymod4 == 1.0) {
      if (!IS_EDGE_B(uvcb)) poscc = SatisfyConstraint(poscc, poscb2, pincb2, REST_DIST_BEND);
    } 
    else {
      if (!IS_EDGE_T(uvct)) poscc = SatisfyConstraint(poscc, posct2, pinct2, REST_DIST_BEND);
    }
#endif

  }

  // output updated pos
  gl_FragColor = vec4( poscc, pincc );
}
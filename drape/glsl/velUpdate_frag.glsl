uniform sampler2D positions;
uniform sampler2D velocities;

uniform float time;

varying vec2 vUv;
varying vec2 vOne;

#define DAMPING 0.05


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


void main() {

  vec2 uvcc = vUv;
  vec3 vel = texture2D( velocities, uvcc ).rgb;
  vec3 poscc = texture2D( positions, uvcc ).rgb;
  
  vec2 uvrc = uvcc + vOne * vec2(1.0, 0.0);
  vec3 posrc = texture2D( positions, uvrc ).rgb;
  
  vec2 uvct = uvcc + vOne * vec2(0.0, 1.0);
  vec3 posct = texture2D( positions, uvct ).rgb;
  
  vec2 uvlc = uvcc + vOne * vec2(-1.0, 0.0);
  vec3 poslc = texture2D( positions, uvlc ).rgb;

  vec2 uvcb = uvcc + vOne * vec2(0.0, -1.0);
  vec3 poscb = texture2D( positions, uvcb ).rgb;

  // wind
  float windStrength = cos(time / 7000.0) * 20.0 + 40.0;
  windStrength = windStrength / 60.0 / 60.0 * 2.0;

  vec3 windDir = vec3(
    sin((time+100.0) / 2.6),
    cos((time+32.0) / 3.3),
    sin(time / 3.7)
  );
  windDir = normalize(windDir);

  if (!IS_EDGE_R(uvcc) && !IS_EDGE_T(uvcc)) {
    vec3 normal = cross(poscc - posrc, poscc - posct);
    normal = normalize(normal);

    vel += normal * dot(normal, windDir) * windStrength;
  }
  if (!IS_EDGE_L(uvcc) && !IS_EDGE_T(uvcc)) {
    vec3 normal = -cross(poscc - poslc, poscc - posct);
    normal = normalize(normal);

    vel += normal * dot(normal, windDir) * windStrength;
  }
  if (!IS_EDGE_L(uvcc) && !IS_EDGE_B(uvcc)) {
    vec3 normal = cross(poscc - poslc, poscc - poscb);
    normal = normalize(normal);

    vel += normal * dot(normal, windDir) * windStrength;
  }
  if (!IS_EDGE_R(uvcc) && !IS_EDGE_B(uvcc)) {
    vec3 normal = -cross(poscc - posrc, poscc - poscb);
    normal = normalize(normal);

    vel += normal * dot(normal, windDir) * windStrength;
  }
  
  // damping
  vel *= (1.0 - DAMPING);

  // output updated vel
  gl_FragColor = vec4( vel, 1.0 );
}
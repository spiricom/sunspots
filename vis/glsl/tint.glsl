uniform float u_control0;
uniform float u_control1;
uniform float u_control2;
uniform float u_control3;
uniform float u_control4;
uniform float u_control5;
uniform float u_control6;
uniform float u_control7;

// float FORCE_MULT = 8.0;
// float FORCE_MULT = 3.2;

float getForceMult() {
  float fm = (1.3 + clamp(u_control2 - 140.0, 0.0, 100.0) * 0.52);

  float sgn = fm > 0.0 ? 1.0 : -1.0;

  fm += 3.2 * sgn;

  return iFrame < 60 ? 3.2 : fm;
  // return 30.2;
}


#define FORCE_MULT getForceMult()



// #define FOCUS_COEFF 0.5
// #define FOCUS_COEFF 0.9
#define FOCUS_COEFF (iFrame < 60 ? 0.9 : (0.9 - 0.3 + clamp(((u_control0+u_control1-u_control2) * ((u_control4+u_control5-u_control6) * 0.1 + 1.0) - 0.0), 0.0, 99.0) * 0.007))

// #define WAVE_FOCUS_COEFF 1.0
#define WAVE_FOCUS_COEFF 1.0001

#define WAVE_FOCUS_COEFF_2 (iFrame < 60 ? 1.0 : 1.0 + clamp((u_control1+u_control5) - 0.0, 0.0, 99.0) * 0.00001)

// http://lolengine.net/blog/2013/07/27/rgb-to-hsv-in-glsl
vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = c.g < c.b ? vec4(c.bg, K.wz) : vec4(c.gb, K.xy);
    vec4 q = c.r < p.x ? vec4(p.xyw, c.r) : vec4(c.r, p.yzx);

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec4 update(vec2 uv) {
  vec2 dims = (iResolution.xy);

  vec4 color;
  vec2 d[4];
  d[0] = vec2(-1.0, -0.0);
  d[1] = vec2(0.0, -1.0);
  d[2] = vec2(1.0, 0.0);
  d[3] = vec2(-0.0, 1.0);
    

  vec4 fSamp = texture(iChannel2, uv);
  vec2 force = (fSamp.rg) * FORCE_MULT;
  vec4 colorSamp = texture(iChannel0, uv + force / dims);
  vec4 wSamp = texture(iChannel1, (uv + force / dims) * WAVE_FOCUS_COEFF);

  // derivatives
  vec4 dSamp[4];
  vec4 wdSamp[4];
  for (int i = 0; i < 4; i ++) {
    dSamp[i] = texture(iChannel0, uv + (d[i] + force) / dims);
    wdSamp[i] = texture(iChannel1, (uv + (d[i] + force) / dims) * WAVE_FOCUS_COEFF_2);
  }

  color = colorSamp;
  for (int i = 0; i < 3; i ++) {
    float v = colorSamp[i] * (wSamp.r - 0.5);
    float vd = 0.0;
    for (int j = 0; j < 4; j ++) {
      float vt = dSamp[j][i] * (wdSamp[j].r - 0.5);
      vd += (v - vt) * FOCUS_COEFF;
    }
    color[i] += vd;
  }


  // loop back to black
  color = clamp(color, vec4(0.0), vec4(1.0));
  // color = fract(color);

  if (length(color.xyz) > 1.0) {
    // color = fract(color);
  }

  if (distance(color.rgb, vec3(0.0)) < 0.001) {
    // color = vec4(0.3, 0.3, 0.3, 1.0);
    // vec3 hsv = rgb2hsv(color.rgb);
    // hsv.x += 0.3;
    // color.rgb = hsv2rgb(hsv);
    
    color *= 100.0;
    // color.r = 1.0;
  }
  else if (distance(color.rgb, vec3(1.0)) < 0.95) {
    // color = vec4(0.0, 0.0, 0.0, 1.0);
    

    vec3 hsv = rgb2hsv(color.rgb);
    hsv.x += 0.1;
    hsv.y *= 1.3;
    color.rgb = hsv2rgb(hsv);
    
    color *= 0.6;

    // color.y *= 1.01;
    // color.r = 1.0;
  }

  vec3 hsv = rgb2hsv(color.rgb);
  hsv.y *= sin(float(iFrame) * 0.003) * 0.004 + 1.0 + 0.002;
  // hsv.y *= 1.03;
  // hsv.y *= 0.9995;
  // hsv.z *= 1.0;
  hsv = clamp(hsv, 0.0, 1.0);
  color.rgb = hsv2rgb(hsv);


  return color;
}

float random (in vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

vec4 init(vec2 uv) {
  vec4 color = vec4(0.0, 0.0, 0.0, 1.0);

  if (uv.y < 0.1) {
    color.r = 1.0;
  } else if (uv.y < 0.2) {
    color.g = 1.0;
  } else if (uv.y < 0.25) {
    color.b = 1.0;
  }

  return color;
}

void main() {
  vec4 color;
  // vec2 uv = fragCoord.xy / iResolution.xy;
  vec2 uv = getUv();

  if (float(iFrame) <= 2.0) {
    color = init(uv);
  } else {
    color = update(uv);
  }
  fragColor = color;
}

// float forceMult = 8.0;
float forceMult = 2.0;

// #define FOCUS_COEFF 0.5
// #define FOCUS_COEFF 0.9
#define FOCUS_COEFF 0.35

// #define WAVE_FOCUS_COEFF 1.0
#define WAVE_FOCUS_COEFF 1.40

#define WAVE_FOCUS_COEFF_2 1.40

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
  vec2 force = (fSamp.rg) * forceMult;
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

  if (distance(color.rgb, vec3(0.0)) < 0.00001) {
    // color = vec4(0.3, 0.3, 0.3, 1.0);
    // vec3 hsv = rgb2hsv(color.rgb);
    // hsv.x += 0.3;
    // color.rgb = hsv2rgb(hsv);
    
    // color *= 100000.0;
    // color.r = 1.0;
  }
  else if (distance(color.rgb, vec3(1.0)) < 0.95) {
    // color = vec4(0.3, 0.3, 0.3, 1.0);
    // vec3 hsv = rgb2hsv(color.rgb);
    // hsv.x += 0.001;
    // color.rgb = hsv2rgb(hsv);

    // color.y *= 1.01;
    // color.r = 1.0;
  }

  vec3 hsv = rgb2hsv(color.rgb);
  // hsv.y *= sin(float(iFrame) * 0.003) * 0.004 + 1.0 + 0.002;
  // hsv.y *= 1.01;
  // hsv.y *= 0.99;
  // hsv.z *= 1.01;
  // hsv = clamp(hsv, 0.0, 1.0);
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

  if (float(iFrame) == 0.0) {
    color = init(uv);
  } else {
    color = update(uv);
  }
  fragColor = color;
}
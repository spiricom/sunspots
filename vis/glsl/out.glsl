

// will be multiplied by pixelRatio
// #define NUM_TILES (4.0 * vec2(1.0, 1.0 / (16.0 / 9.0)))
#define NUM_TILES 1.0

// #define DEBUG_DRAW
// #define DRAW_BLACK_AND_WHITE

#define WAVE iChannel0
#define FORCE iChannel1
#define TINT iChannel2

#define CHANNEL_TO_SAMPLE TINT

vec4 mixColor(vec4 c0, vec4 c1, float r) {
  return max(c0, mix(vec4(0.0), c1, r));
}

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

// Filmic ToneMapping http://filmicgames.com/archives/75
float A = 0.15;
float B = 0.50;
float C = 0.10;
float D = 0.20;
float E = 0.02;
float F = 0.30;
float W = 1000.0;
vec3 Uncharted2Tonemap(vec3 x) {
  return ((x*(A*x+C*B)+D*E)/(x*(A*x+B)+D*F))-E/F;
}

void main(){

  // vec2 uv = fragCoord.xy / iResolution.xy;
  vec2 uv = getUv();

  vec4 tSamp;

  bool toneMap = false;

#ifdef DEBUG_DRAW
  uv.y = 1.0 - uv.y;

  if (uv.y < 0.5) {
    if (uv.x < 0.5) {
      tSamp = texture(iChannel0, uv * 2.0);
    }
    else {
      tSamp = texture(iChannel1, uv * 2.0 - vec2(1.0, 0.0));
    }
  }
  else {
    uv.y -= 0.5;
    if (uv.x < 0.5) {
      tSamp = texture(iChannel2, uv * 2.0);
    }
    else {
      tSamp = texture(CHANNEL_TO_SAMPLE, (uv * 2.0 - vec2(1.0, 0.0)) * NUM_TILES);

      toneMap = true;
    }
  }

#else
  uv *= NUM_TILES;
  
  vec2 coord = vec2(uv.x, 1.0 - uv.y);
  tSamp = texture(CHANNEL_TO_SAMPLE, coord);

  toneMap = true;

#endif

  toneMap = false;
  if (toneMap) {
    vec3 col = tSamp.rgb;
    
    vec3 gray = vec3(0.5);
    vec3 hsv = rgb2hsv(col);
    // hsv.x *= 0.3;
    // hsv.x += 0.1;
    // hsv.x = fract(hsv.x);

    hsv.y *= 0.9;
    // hsv.z *= 1.9;
    // hsv.y = 10000.0;
    // hsv = clamp(hsv, 0.0, 1.0);
    col = hsv2rgb(hsv);

    // col = Uncharted2Tonemap(col);

    // col = (col - gray) * 1.8 + gray;
    col = clamp(col, 0.0, 1.0);

    // col = vec3(1.0) - col;

    tSamp.rgb = col;
  }


  fragColor = tSamp;
}
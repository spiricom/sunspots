

uniform float u_control0;
uniform float u_control1;
uniform float u_control2;
uniform float u_control3;
uniform float u_control4;
uniform float u_control5;
uniform float u_control6;
uniform float u_control7;

// will be multiplied by pixelRatio
// #define NUM_TILES (4.0 * vec2(1.0, 1.0 / (16.0 / 9.0)))
#define NUM_TILES 1.0

// #define DEBUG_DRAW
 //#define DRAW_BLACK_AND_WHITE

#define WAVE iChannel0
#define FORCE iChannel1
#define TINT iChannel2

#define CHANNEL_TO_SAMPLE TINT

vec3 mixColor(vec3 c0, vec3 c1, float r) {
  return max(c0, mix(vec3(0.0), c1, r));
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


  if (toneMap) {
    vec3 col = tSamp.rgb;
    
    vec3 gray = vec3(0.5);
    vec3 hsv = rgb2hsv(col);
    // hsv.y *= 0.9;
    // hsv.y = 10000.0;
    // hsv = clamp(hsv, 0.0, 1.0);
    col = hsv2rgb(hsv);

    // col = (col - gray) * 1.8 + gray;
    col = clamp(col, 0.0, 1.0);

    // col = vec3(1.0) - col;

    tSamp.rgb = col;



    // palettization:
    vec3 color = vec3(0.0);

    // color = mixColor(color, vec3(255,250,244) / 255.0, tSamp.r);
    // color = mixColor(color, vec3(255,255,255) / 255.0, tSamp.g);
    // color = mixColor(color, vec3(255,255,255) / 255.0, tSamp.b);

    // color = mixColor(color, vec3(0.1, 0.1, 0.2), tSamp.r);
    // color = mixColor(color, vec3(0.8, 0.0, 0.0), tSamp.g);
    // color = mixColor(color, vec3(0.9, 0.98, 0.98), tSamp.b);


    // color += 0.5*m0 * vec3(191.0, 42.0, 42.0) / 255.0 * tSamp.r;
    // color += 0.5*m1 * vec3(242.0, 199.0, 119.0) / 255.0 * tSamp.g;
    // color += 0.5*m2 * vec3(9.0, 33.0, 64.0) / 255.0 * tSamp.b;

    // color = mixColor(color, vec3(239.0,88.0,19.0) / 255.0, tSamp.r);
    // color = mixColor(color, vec3(70.0,75.0,79.0) / 255.0, tSamp.g);
    // color = mixColor(color, vec3(14.0,214.0,237.0) / 255.0, tSamp.b);

    // color = mixColor(color, vec3(191.0, 42.0, 42.0) / 255.0, tSamp.r);
    // color = mixColor(color, vec3(9.0, 33.0, 64.0) / 255.0, tSamp.b);
    

    // color = mixColor(color, vec3(30, 32, 30) / 255.0, tSamp.r);
    // color = mixColor(color, vec3(10, 10, 10) / 255.0, tSamp.g);
    // color = mixColor(color, vec3(10, 10, 10) / 255.0, tSamp.b);
    
    color = mixColor(color, vec3(30, 12, 6) / 255.0*3.0, tSamp.r);
    color = mixColor(color, vec3(14, 50, 80) / 255.0*3.0, tSamp.g);
    color = mixColor(color, vec3(20, 10, 16) / 255.0*3.0, tSamp.b);

    // float v = pow(tSamp.r * 0.2126 + tSamp.g * 0.7152 + tSamp.b * 0.0722, 1.5);
    
    float amp = u_control0 + u_control1 + u_control2;
    amp /= 3.0;

    float m0 = pow(u_control0 * 0.03, 1.9) * 0.1 + 0.0;
    float m1 = pow(u_control1 * 0.015, 1.9) * 0.15 + 0.0;
    float m2 = pow(u_control2 * 0.03, 2.2) * 0.2 + 0.0;

    // m0 = 0.7;
    // m1 = 0.7;
    // m2 = 0.7;

    float v = 
      m0 * tSamp.r * 0.1126 + 
      m1 * tSamp.g * 0.5152 + 
      m2 * tSamp.b * 0.0722;
    color = vec3(v);
    // color = vec3(v) * 0.5 + color;



    // color = color * 0.5+ vec3(v) * 0.5;

    color = pow(color, vec3(2.5));
    color = clamp(color, 0.0, 1.0);

    tSamp.rgb = color;
  }


  fragColor = tSamp;
}
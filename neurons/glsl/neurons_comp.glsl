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

/////////////////////////////////////////////

float gamma = 2.2;

// https://www.shadertoy.com/view/lslGzl
vec3 lumaBasedReinhardToneMapping(vec3 color) {
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float toneMappedLuma = luma / (1. + luma);
  color *= toneMappedLuma / luma;
  color = pow(color, vec3(1. / gamma));
  return color;
}

vec3 unch2ToneMapping(vec3 color) {
  float A = 0.15;
  float B = 0.50;
  float C = 0.10;
  float D = 0.20;
  float E = 0.02;
  float F = 0.30;
  float W = 11.2;
  float exposure = 2.;
  color *= exposure;
  color = ((color * (A * color + C * B) + D * E) / (color * (A * color + B) + D * F)) - E / F;
  float white = ((W * (A * W + C * B) + D * E) / (W * (A * W + B) + D * F)) - E / F;
  color /= white;
  color = pow(color, vec3(1. / gamma));
  return color;
}

void main() {
  vec3 col = texture2D(iChannel0, fragCoord.xy/iResolution.xy).rgb;
  vec2 uv = fragCoord.xy / iResolution.xy;


  // PROJECTOR-OLD
  // col = pow(col, vec3(0.6));
  // col *= 0.5;
  // col += -0.4;


  // SCREEN-OLD
  // col = pow(col, vec3(0.7));
  // col *= 0.5;
  // col += -0.4;

  // SCREEN
  col = pow(col, vec3(0.5));
  col *= 0.5;
  col += -0.4;


  // col *= 1.0 +  + sin(iGlobalTime * 1.) * 0.1;

  // vignette
  // https://www.shadertoy.com/view/4lSXDm
  float Falloff = 0.25;
  vec2 coord = (uv - 0.5) * (iResolution.x/iResolution.y) * 2.0;
  float rf = sqrt(dot(coord, coord)) * Falloff;
  float rf2_1 = rf * rf + 1.0;
  float e = 1.0 / (rf2_1 * rf2_1);
  


  col = clamp(col, 0.0, 9999.0);
  col = fract(col);

  float a = clamp(col.r, 0.0, 1.0);
  // col = mix(vec3(206.0, 171.0, 121.0), vec3(34.0, 4.0, 0.0), a) / 255.0;
  col = vec3(1.0 - a);

  fragColor = vec4(col * e, 1.0);
}


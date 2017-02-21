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

  // col *= 0.8;

  // col += 1.0;


  // // col = log(col);
  // col = pow(col, vec3(0.7));

  // col -= 1.0;

  // col *= 0.3;

  // col += -0.3;


  // col += vec3(0.1);
  col = pow(col, vec3(0.7));

  // col += vec3(-1.05);
  // col *= 1.1 + sin(iGlobalTime * 2.) * 0.2;

  col *= 0.35;

  col += 0.1;

  col *= 1.0 +  + sin(iGlobalTime * 1.) * 0.1;



  // col = unch2ToneMapping(col);

  col = clamp(col, 0.0, 9999.0);

  // col = fract(col);

  fragColor = vec4(col, 1.0);
  // fragColor.x = 1.0;
}

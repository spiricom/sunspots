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

void main() {
  vec3 col = texture2D(iChannel0, fragCoord.xy/iResolution.xy).rgb;
  col += vec3(0.1);
  col = pow(col, vec3(0.4));
  // col = pow(vec3(1.4), col);
  col += vec3(-1.1);
  col *= 1.4;
  fragColor = vec4(col, 1.0);
  // fragColor.x = 1.0;
}

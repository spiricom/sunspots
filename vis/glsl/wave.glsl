
uniform float u_control0;
uniform float u_control1;
uniform float u_control2;
uniform float u_control3;
uniform float u_control4;
uniform float u_control5;
uniform float u_control6;
uniform float u_control7;

// lower numbers give bigger color splotches
// higher numbers increase speed
// #define COLOR_SAMP_MULT 1.0
#define COLOR_SAMP_MULT (10.0)

// controls speed
// numbers around 0.1 grant full inversions
// #define TIME_MULT 0.000001
#define TIME_MULT (0.05)

// higher numbers more uniform and vertically scrolling
// #define OFFSET_MULT 1.0
// #define OFFSET_MULT (1.0 - u_control3 * 0.01 + 0.1)
#define OFFSET_MULT (1.0)

// #define CENTER_SIN_MULT 0.01
#define CENTER_SIN_MULT (0.0001 + clamp(u_control3*u_control7 - 0.0, 0.0, 1.0) * 0.0002)
// #define CENTER_SIN_MULT 0.0

void main() {
  // vec2 uv = fragCoord.xy / iResolution.xy;
  vec2 uv = getUv();
  
  vec2 off =  1.0 / iResolution.xy * OFFSET_MULT;
  vec2 d[4];
  d[0] = vec2(-off.x, -0.0);
  d[1] = vec2(0.0, -off.y);
  d[2] = vec2(off.x, 0.0);
  d[3] = vec2(-0.0, off.y);

  vec4 waveSamp = texture(iChannel0, uv);
  vec4 colorSamp = texture(iChannel1, uv);
  colorSamp += 0.4;

  float centerSamp = waveSamp.r 
    + sin(COLOR_SAMP_MULT * colorSamp.r + float(iFrame) * TIME_MULT) * CENTER_SIN_MULT 
    - sin(COLOR_SAMP_MULT * colorSamp.b + float(iFrame) * TIME_MULT) * CENTER_SIN_MULT
    ;

  float prevCenterSamp = waveSamp.g;

  float adjSum = 0.0;
  for (int i = 0; i < 4; i ++) {
    adjSum += texture(iChannel0, uv + d[i]).r;
  }

// [center, prevCenter, gradient]

  waveSamp.b = centerSamp * 2.0 - prevCenterSamp + 0.04 * (adjSum - centerSamp * 4.0);

  waveSamp.rgb = waveSamp.brg;
  waveSamp = clamp(waveSamp, vec4(0.0), vec4(1.0));

  fragColor = waveSamp;
}
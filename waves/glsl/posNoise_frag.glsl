
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float exponent;
varying vec2 vUv;
varying vec3 vWorldPosition;
varying float noise;

void main() {

  if (vWorldPosition.y > 800.0) {
    discard;
  }

  float h = normalize( -vWorldPosition + offset).y;
  gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h, 0.0), exponent), 0.0) ), 1.0 );
  //gl_FragColor = vec4( vec3( vUv, 0. ), 1. );

  //vec3 color = vec3( vUv * ( 1. - 2. * noise ), 0.0 );
  //gl_FragColor = vec4( color.rgb, 1.0 );
}

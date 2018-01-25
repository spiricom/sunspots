uniform vec2 dims;

varying vec2 vUv;
varying vec2 vOne;

void main() {
  vUv = vec2(uv.x, uv.y);
  vOne = vec2(1.0, 1.0) / dims;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}

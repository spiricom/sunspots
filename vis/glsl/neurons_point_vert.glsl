attribute vec3 val;

varying vec3 pointCol;

void main() {
  pointCol = val;
  gl_PointSize = 1.0;
  gl_Position = vec4( position, 1.0 );
}
varying vec3 pointCol;

void main() {
  pointCol = color;
  gl_PointSize = 100.0;
  gl_Position = vec4( position, 1.0 );
}
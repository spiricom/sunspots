varying vec3 pointCol;

void main() {
  gl_FragColor = vec4(pointCol, 1.0);
  gl_FragDepthEXT = 0.0;
}
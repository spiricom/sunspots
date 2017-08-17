
uniform sampler2D positions;
uniform vec2 dataTexDims;

varying vec4 myPos;
varying vec3 myNormal;
varying vec2 myUv;

void main() {
  vec2 one = vec2(1.0, 1.0) / dataTexDims;

  // mesh is a nomrliazed square so uvs to sample pos data texture are the xy positions of the vertices
  myUv = position.xy;
  vec2 uvcc = myUv;
  vec3 poscc = texture2D( positions, uvcc ).rgb;
  
#ifndef FLAT_SHADING
#ifdef NO_TEXTURE 
  // normal required for drape bg depth hack
  vec2 uvrc = uvcc + one * vec2(1.0, 0.0);
  vec3 posrc = texture2D( positions, uvrc ).rgb;
  
  vec2 uvct = uvcc + one * vec2(0.0, 1.0);
  vec3 posct = texture2D( positions, uvct ).rgb;
  
  vec2 uvlc = uvcc + one * vec2(-1.0, 0.0);
  vec3 poslc = texture2D( positions, uvlc ).rgb;

  vec2 uvcb = uvcc + one * vec2(0.0, -1.0);
  vec3 poscb = texture2D( positions, uvcb ).rgb;

  myNormal = 
    - cross(posct - poscc, posrc - poscc)
    + cross(poscb - poscc, posrc - poscc)
    + cross(posct - poscc, poslc - poscc)
    - cross(poscb - poscc, poslc - poscc)
    ;
  myNormal = normalize(myNormal);
#endif
#endif

  myPos = vec4( poscc, 1.0 );

  gl_Position = projectionMatrix * modelViewMatrix * myPos;
}

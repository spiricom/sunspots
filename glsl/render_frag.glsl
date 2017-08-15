
uniform sampler2D texture;
uniform vec3 color;

varying vec4 myPos;
varying vec3 myNormal;
varying vec2 myUv;

void main() {

#ifdef FLAT_SHADING
  gl_FragColor = vec4(color, 1.0);

#else
  vec3 normal = myNormal;


#ifdef NO_TEXTURE
  // directional light
  vec3 dirLightColor = vec3(255.0, 255.0, 255.0) / 255.0;
  vec3 dirToLight = vec3(0.0, 0.0, 1.0);

  float lightDot = dot(normalize(normal), dirToLight);
  lightDot = abs(lightDot); // all faces facing light

  // half lambert conversion
  lightDot = (lightDot * 0.5 + 0.5);
  lightDot = lightDot * lightDot;

  vec3 light = dirLightColor * clamp(lightDot, 0.0, 1.0);

  // ambient light
  // light += vec3(102.0, 102.0, 102.0) / 255.0;

  // clamp
  light = clamp(light, 0.0, 1.0);

  float c = (color * light).x;
  // c = c > 0.98 ? 1.0 : 0.0;
  gl_FragColor = vec4(vec3(0.0), c > 0.95 ? 1.0 : 0.0);

  // regular textureless shading
  // gl_FragColor = vec4(color * light, 1.0);

#else
  vec3 texCol = texture2D(texture, myUv * 1.0).rgb;
  // gl_FragColor = vec4(texCol * color * light, 1.0);

  // grab screenspace normal
  vec3 fdx = dFdx(myPos.xyz);
  vec3 fdy = dFdy(myPos.xyz);
  vec3 faceNormal = cross(fdx,fdy);

  // // invert normal in case of backface
  // if (dot(faceNormal, myNormal) < 0.0) {
  //   normal = -normal;
  // }
  // vec3 normalColor = normalize(faceNormal) * 0.5 + vec3(0.5);

  vec3 normalColor = abs(normalize(faceNormal)) * 0.3 + 0.7;
  gl_FragColor = vec4(color * texCol * normalColor, 1.0);
#endif
#endif


// rainbow flat faces
// vec3 fdx = dFdx(myPos.xyz);
// vec3 fdy = dFdy(myPos.xyz);
// vec3 faceNormal = cross(fdx,fdy);

// vec3 normalColor = abs(normalize(faceNormal));
// gl_FragColor = vec4(normalColor, 1.0);

  // debug
  // gl_FragColor = vec4(texCol * light, 1.0);
  // gl_FragColor = vec4(light, 1.0);
}

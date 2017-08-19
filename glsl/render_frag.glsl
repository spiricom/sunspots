
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

  // HACK: this is used for drape bg alpha depth hack
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

    gl_FragColor = vec4(vec3(0.0), c > 0.95 ? 1.0 : 0.0); // alpha
    // gl_FragColor = vec4(vec3(1.0, 0.0, 0.0), c > 0.95 ? 1.0 : 0.0); // alpha
    // gl_FragColor = vec4(vec3(1.0, 0.0, 0.0), c > 0.95 ? 1.0 : 0.0); // alpha

    // regular textureless shading
    // gl_FragColor = vec4(color * light, 1.0);

  #else
    vec3 texCol = texture2D(texture, myUv * 1.0).rgb;
    // gl_FragColor = vec4(texCol * color * light, 1.0);

    // // grab screenspace normal
    // vec3 fdx = dFdx(myPos.xyz);
    // vec3 fdy = dFdy(myPos.xyz);
    // vec3 faceNormal = cross(fdx,fdy);

    // // invert normal in case of backface
    // if (dot(faceNormal, myNormal) < 0.0) {
    //   normal = -normal;
    // }
    // vec3 normalColor = normalize(faceNormal) * 0.5 + vec3(0.5);
    
    // float Falloff = 10.25;
    // // float aspect = iResolution.x/iResolution.y;
    // float aspect = 1.0;
    // vec2 coord = (myUv - 0.5) * aspect * 2.0;
    // float rf = pow(dot(coord, coord), 2.0) * Falloff;
    // float rf2_1 = rf * rf + 1.0;
    // float e = 1.0 / (rf2_1 * rf2_1);
    
    vec3 normalColor = abs(normalize(normal)) * 0.3 + 0.7;
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

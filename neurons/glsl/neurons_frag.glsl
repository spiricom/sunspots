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

uniform float iChannelTime[4];
uniform vec3 iChannelResolution[4];
uniform sampler2D iChannel0;
uniform vec4 iDate;
uniform float iSampleRate;

const float PI      = 3.1415;
const float EPSILON = 1e-3;

//////////////////////////////////////
// Combine distance field functions //
//////////////////////////////////////


float smoothMerge(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5*(d2 - d1)/k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0-h);
}


float merge(float d1, float d2) {
  return min(d1, d2);
}


float mergeExclude(float d1, float d2) {
  return min(max(-d1, d2), max(-d2, d1));
}


float substract(float d1, float d2) {
  return max(-d1, d2);
}


float intersect(float d1, float d2) {
  return max(d1, d2);
}


//////////////////////////////
// Rotation and translation //
//////////////////////////////


vec2 rotateCCW(vec2 p, float a) {
  mat2 m = mat2(cos(a), sin(a), -sin(a), cos(a));
  return p * m; 
}

vec2 rotateCW(vec2 p, float a) {
  mat2 m = mat2(cos(a), -sin(a), sin(a), cos(a));
  return p * m;
}

vec2 translate(vec2 p, vec2 t) {
  return p - t;
}


///////////////////////
// FRACTAL
///////////////////////

// http://www.fractalforums.com/new-theories-and-research/very-simple-formula-for-fractal-patterns/
// https://www.shadertoy.com/view/lslGWr
float field(in vec3 p) {
  float strength = 7. + .03 * log(1.e-6 + fract(sin(iGlobalTime) * 4373.11));
  float accum = 0.;
  float prev = 0.;
  float tw = 0.;
  for (int i = 0; i < 32; ++i) {
    float mag = dot(p, p);
    p = abs(p) / mag + vec3(-.5, -.4, -1.5);
    float w = exp(-float(i) / 7.);
    accum += w * exp(-strength * pow(abs(mag - prev), 2.3));
    tw += w;
    prev = mag;
  }
  return max(0., 5. * accum / tw - .7);
}


const float pi = 3.14159;
const float pi2 = pi * 2.;

mat2 rot2D(float r)
{
    float c = cos(r), s = sin(r);
    return mat2(c, s, -s, c);
}

// convert distance to alpha
float dtoa(float d, float amount)
{
    float a = clamp(1.0 / (clamp(d, 1.0/amount, 1.0)*amount), 0.,1.);
    return a;
}



// distance functions: ------------------------------------------------



// circle
float sdCircle(vec2 uv, vec2 origin, float radius)
{
    float d = length(uv - origin) - radius;
    return d;
}

// signed distance to segment of 1D space. like, for making a vertical column
float sdSegment1D(float uv, float a, float b)
{
    return max(a - uv, uv - b);
}
float sdAxisAlignedRect(vec2 uv, vec2 tl, vec2 br)
{
    vec2 d = max(tl - uv, uv - br);
    return length(max(vec2(0.0), d)) + min(0.0, max(d.x, d.y));
}

// the big question is what is the best way to INPUT a free rect? tl+br+angle? p1,p2,p3?
float sdRect(vec2 uv, vec2 a, vec2 b, float angle)
{
    // flatten the line to be axis-aligned.
    vec2 rectDimensions = b - a;
    mat2 rotMat = rot2D(-angle);
    a *= rotMat;
    b *= rotMat;
  return sdAxisAlignedRect(uv * rotMat, a, b);
}

// really a line segment with line width is just a rect expressed differently
float sdLineSegment(vec2 uv, vec2 a, vec2 b, float lineWidth)
{
    // flatten the line to be axis-aligned.
    vec2 rectDimensions = b - a;
    float angle = atan(rectDimensions.x, rectDimensions.y);
    mat2 rotMat = rot2D(-angle);
    a *= rotMat;
    b *= rotMat;
    float halfLineWidth = lineWidth / 2.;
    a -= halfLineWidth;
    b += halfLineWidth;
  return sdAxisAlignedRect(uv * rotMat, a, b);
}

// union of line segment and 2 circles
float sdLineSegmentRounded(vec2 uv, vec2 a, vec2 b, float lineWidth)
{
    // flatten the line to be axis-aligned.
    vec2 rectDimensions = b - a;
    float angle = atan(rectDimensions.x, rectDimensions.y);
    mat2 rotMat = rot2D(-angle);
    a *= rotMat;
    b *= rotMat;
    float halfLineWidth = lineWidth / 2.;

    uv *= rotMat;
    vec2 tl = vec2(a.x - halfLineWidth, a.y);
    vec2 br = vec2(b.x + halfLineWidth, b.y);

    return min(min(sdAxisAlignedRect(uv, tl, br),
                   sdCircle(uv, a, halfLineWidth)),
                   sdCircle(uv, b, halfLineWidth));
}


// squircle
// http://en.wikipedia.org/wiki/Squircle
float sdSquircle(vec2 uv, vec2 origin, float radius, float power, float rot_)
{
    mat2 rot = rot2D(rot_);
  vec2 v = abs((origin*rot) - (uv*rot));
    float d = pow(v.x,power) + pow(v.y, power);
    d -= pow(radius, power);
    return d;
}

// distance to edge of hexagon
float sdHexagon(vec2 p, vec2 hexPos, float hexRadius, float hexRotation)
{
    mat2 rot = rot2D(hexRotation);
  vec2 v = abs((hexPos*rot) - (p*rot));

  vec2 topBottomEdge = vec2(0., 1.);
  const vec2 sideEdges = vec2(0.86602540358, 0.5);// cos(radians(30)), sin(radians(30))

  float dot1 = dot(v, topBottomEdge);
  float dot2 = dot(v, sideEdges);
    float dotMax = max(dot1, dot2);
  
    return dotMax - hexRadius;
}


// signed distance to a 2D triangle
// thank you iq: https://www.shadertoy.com/view/XsXSz4
float sdTriangle(in vec2 p, in vec2 p0, in vec2 p1, in vec2 p2)
{
  vec2 e0 = p1 - p0;
  vec2 e1 = p2 - p1;
  vec2 e2 = p0 - p2;

  vec2 v0 = p - p0;
  vec2 v1 = p - p1;
  vec2 v2 = p - p2;

  vec2 pq0 = v0 - e0*clamp( dot(v0,e0)/dot(e0,e0), 0.0, 1.0 );
  vec2 pq1 = v1 - e1*clamp( dot(v1,e1)/dot(e1,e1), 0.0, 1.0 );
  vec2 pq2 = v2 - e2*clamp( dot(v2,e2)/dot(e2,e2), 0.0, 1.0 );
    
    vec2 d = min( min( vec2( dot( pq0, pq0 ), v0.x*e0.y-v0.y*e0.x ),
                       vec2( dot( pq1, pq1 ), v1.x*e1.y-v1.y*e1.x )),
                       vec2( dot( pq2, pq2 ), v2.x*e2.y-v2.y*e2.x ));

  return -sqrt(d.x)*sign(d.y);
}




void main()
{
  vec2 uv = fragCoord.xy / iResolution.yy;
    
    // background color
    fragColor = vec4(1.0,0.94,0.67,1.0);
    float dist;
    float a, b, c, d, e, f;
    vec2 tl, rectSize;
    
    // green column ------------------------------------------------
    a = (sin(iGlobalTime+4.)+1.)/2.;
    dist = sdSegment1D(uv.x, a, a + 0.3);
  fragColor = mix(fragColor, vec4(.1,0.5,0.2,1.0), 0.3 * dtoa(dist, 60.));

    
    
    // axis-aligned rect ------------------------------------------------
    vec4 circleColor = vec4(.4,0.5,0.6,1.0);
    tl.x = (sin(iGlobalTime+5.)+1.)/3.;// top
    tl.y = (sin(iGlobalTime+6.)+1.)/3.;// left
    rectSize.x = (sin(iGlobalTime+7.)+2.5)/7.;// height
  rectSize.y = (sin(iGlobalTime+8.)+2.5)/7.;// width
    dist = sdAxisAlignedRect(uv, tl, tl + rectSize);
    // the -0.05 here will make the object bigger, and reveal how accurate the distances are at corners.
  fragColor = mix(fragColor, circleColor, 0.9 * dtoa(dist-0.05, 60.));
    
    // draw the points
    dist = sdCircle(uv, tl,0.);
  fragColor = mix(fragColor, circleColor * 0.5, 0.9 * dtoa(dist, 250.));
    
    dist = sdCircle(uv, tl + rectSize,0.);
  fragColor = mix(fragColor, circleColor * 0.5, 0.9 * dtoa(dist, 250.));

    
    // white rectangle ------------------------------------------------
    vec4 rectColor = vec4(1.0);
    a = 0.2+ (sin(iGlobalTime*0.25+25.)+.5)/5.;// top
    b = 0.5;
    c = 0.3;
  d = 0.8;
    vec2 br;
    tl = vec2(min(a,c),min(b,d));
    br = vec2(max(tl.x+0.1,max(a,c)),max(tl.y+0.1,max(b,d)));
    
    tl += vec2(.8,-0.4);
    br += vec2(1.,-0.4);
    
    float angle = (sin(iGlobalTime)+1.0);// 0-2
    angle = angle * pi / 9.;// restrict; many angles produce negative shape

    dist = sdRect(uv, tl,br, angle);
  fragColor = mix(fragColor, rectColor, 0.9 * dtoa(dist - 0.05, 600.));
    
    // draw the points
    dist = sdCircle(uv, tl,0.);
  fragColor = mix(fragColor, rectColor * 0.5, 0.9 * dtoa(dist, 250.));
    
    dist = sdCircle(uv, br,0.);
  fragColor = mix(fragColor, rectColor * 0.5, 0.9 * dtoa(dist, 250.));

    
    
    // line segment ------------------------------------------------
    vec4 lineSegmentColor = vec4(.1,0.5,0.2,1.0);
    a = 0.4 + (sin(iGlobalTime*0.15+5.)+.5)/5.;// top
    b = (sin(iGlobalTime*0.15+6.)+3.)/6.;// left
    c = 0.5 + (sin(iGlobalTime*0.15+7.)+.5)/5.5;// height
  d = (sin(iGlobalTime*0.15+8.)+3.5)/6.5;// width

    float lineWidth = (sin(iGlobalTime*0.25+9.)+1.05)*0.18;
    
    dist = sdLineSegment(uv, vec2(a,b), vec2(c,d), lineWidth);
  fragColor = mix(fragColor, lineSegmentColor, 0.6 * dtoa(dist, 600.));
    
    // draw the points
    dist = sdCircle(uv, vec2(a,b),0.);
  fragColor = mix(fragColor, lineSegmentColor, 0.8 * dtoa(dist, 250.));
    
    dist = sdCircle(uv, vec2(c,d),0.);
  fragColor = mix(fragColor, lineSegmentColor, 0.8 * dtoa(dist, 250.));
    
    
    
    
    // rounded line segment ------------------------------------------------
    lineSegmentColor = vec4(.5,0.5,0.1,1.0);
    a += 0.75;
    c += 0.75;
    dist = sdLineSegmentRounded(uv, vec2(a,b), vec2(c,d), lineWidth);
  fragColor = mix(fragColor, lineSegmentColor, 0.6 * dtoa(dist, 600.));
    
    // draw the points
    dist = sdCircle(uv, vec2(a,b),0.);
  fragColor = mix(fragColor, lineSegmentColor, 0.8 * dtoa(dist, 250.));
    
    dist = sdCircle(uv, vec2(c,d),0.);
  fragColor = mix(fragColor, lineSegmentColor, 0.8 * dtoa(dist, 250.));
    
    
    
    // triangle ------------------------------------------------
    vec4 triangleColor = vec4(.3,0.1,0.3,1.0);
    float time = iGlobalTime * 0.7;
    a = (sin(time)+1.)/2.;
    b = (sin(time+4.*0.4)+1.)/4.;
    c = (sin(time+4.*0.4)+1.)/4.;;
  d = 0.75;
  e = 0.8;
  f = 0.75;
    
    dist = sdTriangle(uv, vec2(a,b), vec2(c,d), vec2(e,f));
    // the -0.05 here will make the object bigger, and reveal how accurate the distances are at corners.
  fragColor = mix(fragColor, triangleColor, 0.7 * dtoa(dist - 0.05, 200.));
    
    // draw the points
  fragColor = mix(fragColor, triangleColor, 0.9 * dtoa(sdCircle(uv, vec2(a,b),0.005), 2000.));
  fragColor = mix(fragColor, triangleColor, 0.9 * dtoa(sdCircle(uv, vec2(c,d),0.005), 2000.));
  fragColor = mix(fragColor, triangleColor, 0.9 * dtoa(sdCircle(uv, vec2(e,f),0.005), 2000.));
    
    
    
    
    
    // red squircle ------------------------------------------------
    dist = sdSquircle(uv,
                      vec2(0.5 +((sin(iGlobalTime*0.75)+1.)/3.), (cos(iGlobalTime*1.3)/6.)+0.5),
                      0.2, (sin(iGlobalTime)/1.2)+1.5, iGlobalTime);
    // this converts distance -> alpha + color -> fragcolor
  fragColor = mix(fragColor, vec4(.85,0.,0.,1.0), 0.7 * dtoa(dist, 250.));
    

    // blue circle ------------------------------------------------
    dist = sdCircle(uv,
                    vec2(0.5 +((cos(iGlobalTime*0.85)+1.)/2.), (pow(cos(iGlobalTime*1.1),3.)/7.)+0.5),
                    0.2);
  fragColor = mix(fragColor, vec4(.2,0.,0.8,1.0), 0.7 * dtoa(dist, 250.));
    
    
    // yellow hex ------------------------------------------------
  dist = sdHexagon(uv,
                     vec2(0.5 +((cos((iGlobalTime+1.4)*1.25)+1.)/4.), 0.6),
                     0.2,
                     iGlobalTime);
  fragColor = mix(fragColor, vec4(0.8,0.8,0.1,1.0), 0.7 * dtoa(dist, 60.));
    

}

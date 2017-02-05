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

uniform sampler2D iChannel0;
uniform sampler2D iChannel1;

uniform float iChannelTime[4];
uniform vec3 iChannelResolution[4];
uniform vec4 iDate;
uniform float iSampleRate;

const float PI      = 3.1415;
const float EPSILON = 1e-3;
const float pi = 3.14159;
const float pi2 = pi * 2.;

//Rendering

/*
  This buffer renders each particles
  multiple times per frame to allow particles
  to move more than one pixel per frame while still
  leaving a solid trail.
*/

#define time iGlobalTime

//Anywhere under 900 "should" work fine (might slow down though)
const int numParticles = 140;
const int stepsPerFrame = 7;

float mag(vec3 p){return dot(p,p);}

vec4 drawParticles(in vec3 ro, in vec3 rd)
{
    vec4 rez = vec4(0);
    vec2 w = 1./iResolution.xy;
    
    for (int i = 0; i < numParticles; i++)
    {
        vec3 pos = texture2D(iChannel0, vec2(i,100.0)*w).rgb;
        vec3 vel = texture2D(iChannel0, vec2(i,0.0)*w).rgb;
        for(int j = 0; j < stepsPerFrame; j++)
        {
            float d = mag((ro + rd*dot(pos.xyz - ro, rd)) - pos.xyz);
            d *= 1000.;
            d = .14/(pow(d,1.1)+.03);
            
            rez.rgb += d*abs(sin(vec3(2.,3.4,1.2)*(time*.06 + float(i)*.003 + 2.) + vec3(0.8,0.,1.2))*0.7+0.3)*0.04;
            //rez.rgb += d*abs(sin(vec3(2.,3.4,1.2)*(time*.06 + float(i)*.003 + 2.75) + vec3(0.8,0.,1.2))*0.7+0.3)*0.04;
            pos.xyz += vel*0.002*0.2;
        }
    }
    rez /= float(stepsPerFrame);
    
    return rez;
}

vec3 rotx(vec3 p, float a){
    float s = sin(a), c = cos(a);
    return vec3(p.x, c*p.y - s*p.z, s*p.y + c*p.z);
}

vec3 roty(vec3 p, float a){
    float s = sin(a), c = cos(a);
    return vec3(c*p.x + s*p.z, p.y, -s*p.x + c*p.z);
}

vec3 rotz(vec3 p, float a){
    float s = sin(a), c = cos(a);
    return vec3(c*p.x - s*p.y, s*p.x + c*p.y, p.z);
}

mat2 mm2(in float a){float c = cos(a), s = sin(a);return mat2(c,s,-s,c);}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{ 
    vec2 q = fragCoord.xy/iResolution.xy;
  vec2 p = fragCoord.xy/iResolution.xy-0.5;
  p.x*=iResolution.x/iResolution.y;
  vec2 mo = iMouse.xy / iResolution.xy-.5;
    mo = (mo==vec2(-.5))?mo=vec2(-0.15,0.):mo;
  mo.x *= iResolution.x/iResolution.y;
    mo*=6.14;
  
  vec3 ro = vec3(0.,0.,2.5);
    vec3 rd = normalize(vec3(p,-.5));
    
    vec4 cola = drawParticles(ro, rd);
    vec4 colb = texture2D(iChannel1, q);
    
    //Feedback
    vec4 col = cola + colb;
    col *= 0.9975;
    
    if (iFrame < 5) col = vec4(0);
    
  fragColor = col;
}
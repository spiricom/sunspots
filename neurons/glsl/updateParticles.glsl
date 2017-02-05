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


const float initalSpeed = 10.;
#define time iGlobalTime

vec3 hash3(vec3 p)
{
    p = fract(p * vec3(443.8975,397.2973, 491.1871));
    p += dot(p.zxy, p.yxz+19.1);
    return fract(vec3(p.x * p.y, p.z*p.x, p.y*p.z))-0.5;
}

vec3 update(in vec3 vel, vec3 pos, in float id)
{   
    vel.xyz = vel.xyz*.999 + (hash3(vel.xyz + time)*2.)*7.;
    
    float d = pow(length(pos)*1.2, 0.75);
    vel.xyz = mix(vel.xyz, -pos*d, sin(-time*.55)*0.5+0.5);
    
    return vel;
}

void main()
{
  vec2 q = fragCoord.xy / iResolution.xy;
    
    vec4 col= vec4(0);
    vec2 w = 1./iResolution.xy;
    
    vec3 pos = texture2D(iChannel0, vec2(q.x,100.*w)).xyz;
    vec3 velo = texture2D(iChannel0, vec2(q.x,0.0)).xyz;
    velo = update(velo, pos, q.x);
    
    if (fragCoord.y < 30.)
    {
      col.rgb = velo;
    }
    else
    {
        pos.rgb += velo*0.002;
        col.rgb = pos.rgb;
    }
  
    //Init
    if (iFrame < 10) 
    {
        if (fragCoord.y < 30.)
          col = ((texture2D(iChannel1, q*1.9))-.5)*10.;
          // col = (vec4(hash3(vec3(q, 1.)), 1.) - .5) * 10.;
        else
        {
            col = ((texture2D(iChannel1, q*1.9))-.5)*.5;
            // col = (vec4(hash3(vec3(q, 1.)), 1.) - .5) * .5;
        }
    }
    
  fragColor = col;
}
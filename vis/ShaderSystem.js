"use strict";

// noise texture source: http://www.geeks3d.com/20091008/download-noise-textures-pack/
if ( ! Detector.webgl ) Detector.addGetWebGLMessage();


var ShaderSystem = function(renderer, updateFragDefines) {
  // NOTE: DISABLE WHEN DEPLOYING:
  var LIVE_UPDATE = true;

  var shadersDir = "./glsl/";

  var shadersToLoad = { 
    neurons_vert: "", 
    neurons_basicComp: "", 
    neurons_point_frag: "", 
    neurons_point_vert: "", 
  }; 

  var shaderPrefix = `
  #define fragColor gl_FragColor
  #define fragCoord gl_FragCoord
  #define mainImage main
  #define texture texture2D

  uniform vec3 iResolution;
  uniform float iGlobalTime;
  uniform float iTimeDelta;
  uniform int iFrame;
  uniform float iFrameRate;
  uniform vec4 iMouse;

  uniform sampler2D iChannel0;
  uniform sampler2D iChannel1;
  uniform sampler2D iChannel2;
  uniform sampler2D iChannel3;

  uniform float iChannelTime[4];
  uniform vec3 iChannelResolution[4];
  uniform vec4 iDate;
  uniform float iSampleRate;

  const float PI      = 3.1415;
  const float EPSILON = 1e-3;
  const float pi = 3.14159;
  const float pi2 = pi * 2.;

  vec2 getUv() {
    return (fragCoord.xy) / (iResolution.xy);
  }

  // #define saturate(x) clamp(x, 0.0, 1.0)

  `;

  // outBufferIdx == -1 -> screen
  var shaderDefs = [
    {
      name: "wave",
      // waves based on self and tint
      outBufferIdx: 0,
      inBufferIdxs: [0, 2], // wave, tint
    },
    {
      name: "force", 
      // layers wave over noise
      outBufferIdx: 1,
      inBufferIdxs: [0], // wave, noise
    },
    {
      name: "tint", 
      // moves self using force as flowmap; adds in some wave
      outBufferIdx: 2,
      inBufferIdxs: [2, 0, 1], // tint, wave, force
    },
    {
      name: "out",
      inBufferIdxs: [0, 1, 2],
      outBufferIdx: -1,
    },
  ];

  var bufferDefs = [
    // { w: 10, h: 10, },
  ];

  var customDims = false;
  var customDims = {
    x: 512,
    y: 512,
  };
  var finalCustomScale = 1;

  var renderTargetOptions = {
    // magFilter: THREE.NearestFilter,
    // minFilter: THREE.NearestFilter,
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearMipMapLinearFilter,
    // minFilter: THREE.LinearFilter,

    // wrapS: THREE.ClampToEdgeWrapping,
    // wrapT: THREE.ClampToEdgeWrapping,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
    // wrapS: THREE.MirroredRepeatWrapping,
    // wrapT: THREE.MirroredRepeatWrapping,

    format: THREE.RGBAFormat,
    type: THREE.FloatType,
  };

  console.assert(renderer);
  console.assert(updateFragDefines);

  /// return object
  var object = {
    initialized: false,
  }
  

  var getRenderWidth = function() {
    return customDims ? customDims.x : window.innerWidth;
  }
  var getRenderHeight = function() {
    return customDims ? customDims.y : window.innerHeight;
  }
  // scene
  var scene = new THREE.Scene();

  // camera
  var fov = 10; // arbitrary
  var aspect = getRenderWidth() / getRenderHeight();
  var camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
  camera.position.z = 100;
  camera.lookAt(scene.position);


  // logging stuff
  var messageLog = [];
  var initTime = Date.now();

  // general stuff
  var gl;
  var clock = new THREE.Clock();
  var shaderInitFailed = false;

  var fragUniforms;
  var fragDefines = {};
  updateFragDefines(fragDefines);
  var meshes = [];
  var shaderLoader;

  var noiseTex;

  var time = 0;

  var renderTargetPairs = [];
  var pingPongNeeded = [];
  var numRenderTargets = 0;

  // FIXME requires buffer idxs to be contiguous
  {
    var maxBufferIdx = 0;
    for (var i = 0; i < shaderDefs.length; i++) {
      var sd = shaderDefs[i];

      sd.inBufferIdxs = sd.inBufferIdxs || [];
      console.assert(typeof sd.outBufferIdx === "number", "outBufferIdx is: " + sd.outBufferIdx);

      for (var j = 0; j < sd.inBufferIdxs.length; j++) {
        var sb = sd.inBufferIdxs[j];
        if (!isNaN(sb)) {
          if (sb === sd.outBufferIdx) {
            pingPongNeeded[sb] = true;
          }
          maxBufferIdx = Math.max(maxBufferIdx, sb);
        }
      }

      shadersToLoad[sd.name] = sd.code || "";
    }

    numRenderTargets = maxBufferIdx + 1;
  }

  var w = getRenderWidth();
  var h = getRenderHeight();
  fragUniforms = {
    iResolution: {
      type: 'v3',
      value: new THREE.Vector3(w, h, 1),
    },
    iGlobalTime: {
      type: 'f',
      value: 0.1,
    },
    iTimeDelta: {
      type: 'f',
      value: 1/60,
    },
    iFrame: {
      type: 'i',
      value: 0,
    },
    iFrameRate: {
      type: 'f',
      value: 60,
    },
    iChannelTime: {
      type: 'fv1',
      value: [0, 0, 0, 0],
    },
    iChannelResolution: {
      type: 'fv',
      value: [w,h,1,  w,h,1,  w,h,1,  w,h,1,],
    },
    iChannel0: { type: 't', },
    iChannel1: { type: 't', },
    iChannel2: { type: 't', },
    iChannel3: { type: 't', },
    iMouse: {
      type: 'v4',
      value: new THREE.Vector4(0, 0, 0, 0),
    },
    iDate: {
      type: 'v4',
      value: new THREE.Vector4(0, 0, 0, 0),
    },
    iSampleRate: {
      type: 'f',
      value: 44100,
    },
    u_control0: { type: 'f', value: 0, },
    u_control1: { type: 'f', value: 0, },
    u_control2: { type: 'f', value: 0, },
    u_control3: { type: 'f', value: 0, },
    u_control4: { type: 'f', value: 0, },
    u_control5: { type: 'f', value: 0, },
    u_control6: { type: 'f', value: 0, },
    u_control7: { type: 'f', value: 0, },
  };
  // Mouse position in - 1 to 1
  // TODO convert to pixels, set (x, y) every frame and (z, w) every frame button is down
  renderer.domElement.addEventListener('mousedown', function(e) {
    var canvas = renderer.domElement;
    var rect = canvas.getBoundingClientRect();
    fragUniforms.iMouse.value.z = (e.clientX - rect.left) / getRenderWidth() * 2 - 1;
    fragUniforms.iMouse.value.w = (e.clientY - rect.top) / getRenderHeight() * -2 + 1; 
  });


  var init = function() {
    
    // gl
    gl = renderer.getContext();

    if (!gl.getExtension("EXT_frag_depth")){
      throw new Error("fragDepth not supported by browser");
    }
    if (!gl.getExtension("OES_texture_float")){
      throw new Error("float textures not supported by browser");
    }
    if( gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) == 0 ) {
      throw new Error("vertex shader texture read not supported by browser");
    }

    // render targets
    refreshRenderTargets();

    noiseTex = new THREE.TextureLoader().load( "images/noise256.png" );
    noiseTex.wrapS = THREE.RepeatWrapping;
    noiseTex.wrapT = THREE.RepeatWrapping;
    noiseTex.minFilter = THREE.LinearFilter;
    noiseTex.magFilter = THREE.LinearFilter;

    // HACK - delay load because chrome devtools has canvas setup issues?
    setTimeout(function() {
      // setup canvas, render targets, meshes, and shaders (onResize calls all the others)
      window.addEventListener('resize', onResize);
      fragUniforms.iResolution.value.z = 1; // pixel aspect ratio
      onResize();

      initNeurons();

      fragUniforms.iFrame.value = 0;
      fragUniforms.iGlobalTime.value = 0;

      if (!shaderInitFailed) {
        object.initialized = true;
      }
    }, 1);
  }


  var onResize = function() {
    fragUniforms.iFrame.value = 0;
    fragUniforms.iGlobalTime.value = 0;


    if (customDims) {
      renderer.setSize( customDims.x * finalCustomScale, customDims.y * finalCustomScale );
    }
    else {
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    refreshMeshes();
    refreshRenderTargets();
  }


  var refreshRenderTargets = function() {

    renderTargetPairs = [];

    for (var i = 0; i < numRenderTargets; i++) {


      var def = bufferDefs[i];

      var w, h;
      if (def && def.w) 
        w = def.w;
      else 
        w = getRenderWidth();
      
      if (def && def.h) 
        h = def.h;
      else 
        h = getRenderHeight();

      // console.log("" + w + ", " + h);

      var target = new THREE.WebGLRenderTarget(w, h, renderTargetOptions);
      var targets = [ target, target ];
      
      if (pingPongNeeded[i]) {
        targets[1] = new THREE.WebGLRenderTarget(w, h, renderTargetOptions);
      }

      renderTargetPairs[i] = targets;
    }
  }

  var refreshMeshes = function() {
    for (var i = 0; i < meshes.length; i++) {
      scene.remove(meshes[i]);
    }

    var planeGeom = new THREE.PlaneBufferGeometry(getRenderWidth(), getRenderHeight(), 1);
    var planeGeomWindow = customDims ? new THREE.PlaneBufferGeometry(getRenderWidth(), getRenderHeight(), 1) : planeGeom;
    for (var i = 0; i < shaderDefs.length; i++) {
      var mesh = new THREE.Mesh( shaderDefs[i].outBufferIdx === -1 ? planeGeomWindow : planeGeom );
      scene.add(mesh);
      meshes[i] = mesh;
    }

    refreshShaders();
  }
  
  var dummyRenderTarget = new THREE.WebGLRenderTarget( 1, 1 );
   
  var refreshShaders = function() {
    for (var i = 0; i < shaderDefs.length; i++) {
      var newMat = new THREE.ShaderMaterial({
        uniforms: fragUniforms,
        defines: fragDefines,
        vertexShader: ShaderLoader.get("neurons_vert"),
        fragmentShader: shaderPrefix + ShaderLoader.get(shaderDefs[i].name),
      });

      var mesh = meshes[i];

      mesh.oldMat = mesh.material;

      // HACK render using new material to force-initialize it
      mesh.material = newMat;
    }

    // HACK render using new material to force-initialize it
    for (var i = 0; i < meshes.length; i++) {
      meshes[i].visible = true;
    }
    renderer.render(scene, camera, dummyRenderTarget);

    var materialReset = false;

    for (var i = 0; i < shaderDefs.length; i++) {
      var mesh = meshes[i];

      // restore old material if new one failed to compile
      var status = gl.getProgramParameter( mesh.material.program.program, gl.LINK_STATUS );

      if (!status) {
        mesh.material = mesh.oldMat;
        delete mesh.oldMat;
        materialReset = true;
      }
      else {
        console.log("shader reloaded: " + shaderDefs[i].name);
      }
    }

    if(!object.initialized && materialReset) {
      console.assert(false, "shader init failed");
      shaderInitFailed = true;
    }

    if (materialReset) {
      // if rendered with a bad material before, render over again so we don't see on screen
      // updateAndRender();
    }
  }

  var shaderLoadCallback = function(shaderChanged) {
    if (shaderChanged) {
      refreshShaders();
    }
  }

  var neuronUpdateScene;
  var neuronUpdateMesh;

  var initNeurons = function() {
    // STUFF FOR RENDERING GL_POINTS DATA TO DATA BUFFER

    // scene
    neuronUpdateScene = new THREE.Scene();

    // material
    var compMat = new THREE.ShaderMaterial({
      uniforms: fragUniforms,
      defines: fragDefines,
      vertexShader: ShaderLoader.get("neurons_vert"),
      fragmentShader: ShaderLoader.get("neurons_basicComp"),
      extensions: {
        fragDepth: true,
      },
    });

    // mesh
    var planeGeom = new THREE.PlaneBufferGeometry(getRenderWidth(), getRenderHeight(), 1);
    var mesh = new THREE.Mesh( planeGeom );
    mesh.material = compMat;
    // mesh.material = new THREE.MeshBasicMaterial();
    neuronUpdateMesh = mesh;

  }

  var getRenderTarget = function(bufferIdx) {
    if (!object.initialized) return null;
    return renderTargetPairs;//[bufferIdx][1].texture;
  };

  var setRenderTarget = function(bufferIdx, texture) {
    renderTargetPairs[bufferIdx][1].texture = texture;
  };

  var updateAndRender = function() {
    if (LIVE_UPDATE && !ShaderLoader.loading) {
      delete shadersToLoad.neurons_vert;
      shaderLoader.loadShaders(shadersToLoad, shadersDir, shaderLoadCallback);
    }

    // var dt = clock.getDelta();
    var dt = 1 / 60;

    fragUniforms.iTimeDelta.value = dt;
    fragUniforms.iFrameRate.value = 1 / dt;
    
    // updateNeurons();

    // hide all meshes so we can toggle them on individually
    for (var i = 0; i < meshes.length; i++) {
      meshes[i].visible = false;
    }

    for (var i = 0; i < shaderDefs.length; i++) {
      var sd = shaderDefs[i];

      // render just the mesh with the shader for this pass
      meshes[i].visible = true;

      for (var j = 0; j < sd.inBufferIdxs.length; j++) {
        var bufferIdx = sd.inBufferIdxs[j];
        var tex;
        if (bufferIdx === "noise") {
          tex = noiseTex;
        }
        else {
          console.assert(!isNaN(bufferIdx));
          // read from tex[1]
          tex = renderTargetPairs[bufferIdx][1].texture;
        }
        fragUniforms[ "iChannel" + j ].value = tex;
      }

      if (sd.outBufferIdx < 0) { 
        // render to screen

        // fragUniforms.iResolution.value.x = window.innerWidth;
        // fragUniforms.iResolution.value.y = window.innerHeight;

        var size = renderer.getSize();
        fragUniforms.iResolution.value.x = size.width;
        fragUniforms.iResolution.value.y = size.height;

        // fragUniforms.iResolution.value.x = getRenderWidth();
        // fragUniforms.iResolution.value.y = getRenderHeight();
        
        renderer.render(scene, camera);
      }
      else { 
        // render to buffer

        fragUniforms.iResolution.value.x = getRenderWidth();
        fragUniforms.iResolution.value.y = getRenderHeight();

        // render to buffer 0
        renderer.render(scene, camera, renderTargetPairs[sd.outBufferIdx][0]);

        // ping pong (if this buffer doesn't need ping pong, this will nop)
        var temp = renderTargetPairs[sd.outBufferIdx][0];
        renderTargetPairs[sd.outBufferIdx][0] = renderTargetPairs[sd.outBufferIdx][1];
        renderTargetPairs[sd.outBufferIdx][1] = temp;
      }

      meshes[i].visible = false;
    }

    fragUniforms.iFrame.value++;
    fragUniforms.iGlobalTime.value += dt;
    time = fragUniforms.iGlobalTime.value;
  }

  function setUniform(name, val) {
    if (!fragUniforms[name]) {
      fragUniforms[name] = {
        type: 'f',
        value: val,
      };
    }
    fragUniforms[name].value = val;
  }

  // LOAD SHADERS AND INIT
  shaderLoader = new ShaderLoader();
  shaderLoader.loadShaders(shadersToLoad, shadersDir, init);

  // exports
  object.setUniform = setUniform;
  object.updateAndRender = updateAndRender;
  object.fragDefines = fragDefines;
  object.getRenderTarget = getRenderTarget;
  object.setRenderTarget = setRenderTarget;
  object.renderTargetOptions = renderTargetOptions;

  return object;
}

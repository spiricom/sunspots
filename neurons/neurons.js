"use strict";

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();


// init camera, scene, renderer
var gl, scene, camera, renderer;
var clock;

var fragUniforms;
var meshes = [];
var shaderLoader;

var renderTargets = [];
var pingPongNeeded = [];
var numRenderTargets = 0;

var shadersToLoad = { neurons_vert: "", }; 
var shaderDefs = [
  {
    name: "neurons_final",
    sourceBuffers: [0],
    outBuffer: -1, // -1 -> screen
  },
];

// HACK buffer idxs must be contiguous
{
  var maxBufferIdx = 0;
  for (var i = 0; i < shaderDefs.length; i++) {
    var sd = shaderDefs[i];

    sd.sourceBuffers = sd.sourceBuffers || [];
    console.assert(typeof sd.outBuffer === "number");

    for (var j = 0; j < sd.sourceBuffers.length; j++) {
      var sb = sd.sourceBuffers[j];
      if (sb === sd.outBuffer) {
        pingPongNeeded[sb] = true;
      }
      maxBufferIdx = Math.max(maxBufferIdx, sb);
    }

    shadersToLoad[sd.name] = "";
  }

  numRenderTargets = maxBufferIdx + 1;
}

window.onload = function() {
  shaderLoader = new ShaderLoader();
  shaderLoader.loadShaders(shadersToLoad, "./glsl/", init);
};

function init() {
  // scene
  scene = new THREE.Scene();
  
  // camera
  var fov = 75;
  var aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
  camera.position.z = 100;
  camera.lookAt(scene.position);

  // renderer
  renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(0xff00ff);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // gl
  gl = renderer.getContext();
  if (!gl.getExtension("OES_texture_float")){
    throw new Error("float textures not supported");
  }
  if( gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) == 0 ) {
    throw new Error("vertex shader texture read not supported");
  }

  // render targets
  refreshRenderTargets();
  
  // clock
  clock = new THREE.Clock();

  // uniforms
  var w = window.innerWidth;
  var h = window.innerHeight;

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
    iChannel0: {
      type: 't',
      // value set during rendering
      // value: ,
    },
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
  };

  // Mouse position in - 1 to 1
  // TODO convert to pixels, set (x, y) every frame and (z, w) every frame button is down
  renderer.domElement.addEventListener('mousedown', function(e) {
    var canvas = renderer.domElement;
    var rect = canvas.getBoundingClientRect();
    fragUniforms.iMouse.value.z = (e.clientX - rect.left) / window.innerWidth * 2 - 1;
    fragUniforms.iMouse.value.w = (e.clientY - rect.top) / window.innerHeight * -2 + 1; 
  });

  // resize canvas function
  window.addEventListener('resize', onResize);
  fragUniforms.iResolution.value.x = window.innerWidth;
  fragUniforms.iResolution.value.y = window.innerHeight;
  fragUniforms.iResolution.value.z = 1; // pixel aspect ratio
  
  // meshes and shaders
  // ( calls refreshShaders )
  refreshMeshes();

  // start update loop
  updateAndRender();
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  fragUniforms.iResolution.value.x = window.innerWidth;
  fragUniforms.iResolution.value.y = window.innerHeight;

  refreshMeshes();
  refreshRenderTargets();
}

var renderTargetOptions = {
  // TODO per-shader bilinear support?
  // minFilter: THREE.LinearFilter,
  // magFilter: THREE.LinearFilter,
  magFilter: THREE.NearestFilter,
  minFilter: THREE.NearestFilter,

  wrapS: THREE.ClampToEdgeWrapping,
  wrapT: THREE.ClampToEdgeWrapping,

  format: THREE.RGBAFormat,
  type: THREE.FloatType,
};

function refreshRenderTargets() {
  var w = window.innerWidth;
  var h = window.innerHeight;

  renderTargets = [];

  for (var i = 0; i < numRenderTargets; i++) {
    var target = new THREE.WebGLRenderTarget(w, h, renderTargetOptions);
    var targets = [ target, target ];
    
    if (pingPongNeeded[i]) {
      targets[1] = new THREE.WebGLRenderTarget(w, h, renderTargetOptions);
    }

    renderTargets[i] = targets;
  }
}

function refreshMeshes() {
  for (var i = 0; i < meshes.length; i++) {
    scene.remove(meshes[i]);
  }

  var planeGeom = new THREE.PlaneBufferGeometry(window.innerWidth, window.innerHeight, 40);
  for (var i = 0; i < numRenderTargets; i++) {
    var mesh = new THREE.Mesh( planeGeom );
    scene.add(mesh);
    meshes[i] = mesh;
  }

  refreshShaders();
}

function refreshShaders() {
  for (var i = 0; i < shaderDefs.length; i++) {
    var newMat = new THREE.ShaderMaterial({
      uniforms: fragUniforms,
      vertexShader: ShaderLoader.get("neurons_vert"),
      fragmentShader: ShaderLoader.get(shaderDefs[i].name),
    });

    var mesh = meshes[i];

    mesh.oldMat = mesh.material;

    // HACK to initialize new material, need to render using it
    mesh.material = newMat;
  }

  // HACK to initialize new material, need to render using it
  renderer.render(scene, camera);

  var materialReset = false;

  for (var i = 0; i < shaderDefs.length; i++) {
    var mesh = meshes[i];

    // restore old material if new one failed to compile
    var status = gl.getProgramParameter( mesh.material.program.program, gl.LINK_STATUS );
    if (!status) {
      mesh.material = mesh.oldMat;
      materialReset = true;
    }
    else {
      console.log("shader reloaded: " + shaderDefs[i].name);
    }
  }

  // if rendered with a bad material before, render over again so we don't see on screen
  if (materialReset) {
    renderer.render(scene, camera);
  }
}

function shaderLoadCallback(shaderChanged) {
  if (shaderChanged) {
    refreshShaders();
  }
}

function updateAndRender() {
  requestAnimationFrame(updateAndRender);

  if (!ShaderLoader.loading) {
    delete shadersToLoad.neurons_vert;
    shaderLoader.loadShaders(shadersToLoad, "./glsl/", shaderLoadCallback);
  }

  var dt = clock.getDelta();

  fragUniforms.iFrame.value++;
  fragUniforms.iTimeDelta.value = dt;
  fragUniforms.iFrameRate.value = 1 / dt;
  fragUniforms.iGlobalTime.value += dt;
  
  for (var i = 0; i < shaderDefs.length; i++) {
    // TODO switch out planes, bind correct textures

    renderer.render(scene, camera);
  }
}


"use strict";

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

// noise texture source: http://www.geeks3d.com/20091008/download-noise-textures-pack/

// neuron-specific stuff
var numParticles = 9;
var numSmallParticles = 600;

// NOTE: DISABLE FLAGS THESE WHEN LIVE:
var LIVE_UPDATE = false;
var localTest = false;
var logMessages = false;


// logging stuff
var messageLog = [];
var initTime = Date.now();

// osc
var oscEnabled = true;
var oscPort;

// general stuff
var gl, scene, camera, renderer;
var clock;
var initialized = false;
var shaderInitFailed = false;

var fragUniforms;
var fragDefines;
var meshes = [];
var shaderLoader;

var noiseTex;

var time = 0;



var renderTargetPairs = [];
var pingPongNeeded = [];
var numRenderTargets = 0;

var shadersToLoad = { 
  neurons_vert: "", 
  neurons_basicComp: "", 
  neurons_point_frag: "", 
  neurons_point_vert: "", 
}; 
var shaderDefs = [
  // {
  //   name: "neurons_final",
  //   inBufferIdxs: [],
  //   outBufferIdx: 0,
  // },
  // {
  //   name: "neurons_comp",
  //   inBufferIdxs: [0],
  //   outBufferIdx: -1,
  // },
  {
    name: "updateParticles",
    inBufferIdxs: [0, "noise"],
    outBufferIdx: 0,
  },
  {
    name: "renderParticles",
    inBufferIdxs: [0, 1, "noise"],
    outBufferIdx: 1,
  },
  {
    name: "neurons_comp",
    inBufferIdxs: [1],
    outBufferIdx: -1,
  },
];

var bufferDefs = [
  // {
  //   w: (numParticles + numSmallParticles),
  //   h: 5,
  // },
];

// outBufferIdx == -1 -> screen

// HACK buffer idxs must be contiguous
{
  var maxBufferIdx = 0;
  for (var i = 0; i < shaderDefs.length; i++) {
    var sd = shaderDefs[i];

    sd.inBufferIdxs = sd.inBufferIdxs || [];
    console.assert(typeof sd.outBufferIdx === "number");

    for (var j = 0; j < sd.inBufferIdxs.length; j++) {
      var sb = sd.inBufferIdxs[j];
      if (!isNaN(sb)) {
        if (sb === sd.outBufferIdx) {
          pingPongNeeded[sb] = true;
        }
        maxBufferIdx = Math.max(maxBufferIdx, sb);
      }
    }

    shadersToLoad[sd.name] = "";
  }

  numRenderTargets = maxBufferIdx + 1;
}

window.onload = function() {
  shaderLoader = new ShaderLoader();
  shaderLoader.loadShaders(shadersToLoad, "./glsl/", init);
};


var customDims = false;
// var customDims = {
//   x: 20*20,
//   y: 14*20,
// };
function getRenderWidth() {
  return customDims ? customDims.x : window.innerWidth;
}
function getRenderHeight() {
  return customDims ? customDims.y : window.innerHeight;
}

function init() {

  var onKeyDown = function ( event ) {
    
    if (logMessages) {
      switch ( event.keyCode ) {
        case 65: // a
          console.log(JSON.stringify(messageLog));
          break;
      }
    }
  };

  document.addEventListener( 'keydown', onKeyDown, false );

  if (oscEnabled) {
    // listening for OSC messages on this port
    var incomingPort = 50506; 
    // sending OSC messages to this IP address
    var connect_to_this_ip = '127.0.0.1'; 
    // sending OSC messages on this port
    var outgoingPort = 50506;

    // sets up OSC by opening a connection to node
    setupOsc(incomingPort, outgoingPort, connect_to_this_ip); 
  }

  // scene
  scene = new THREE.Scene();
  
  // camera
  var fov = 10; // arbitrary
  var aspect = getRenderWidth() / getRenderHeight();
  camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
  camera.position.z = 100;
  camera.lookAt(scene.position);

  // renderer
  renderer = new THREE.WebGLRenderer({  });

  renderer.setClearColor(0xff00ff);
  renderer.setSize(getRenderWidth(), getRenderHeight());
  document.body.appendChild(renderer.domElement);

  // gl
  gl = renderer.getContext();
  if (!gl.getExtension("EXT_frag_depth")){
    throw new Error("fragDepth not supported");
  }
  if (!gl.getExtension("OES_texture_float")){
    throw new Error("float textures not supported");
  }
  if( gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) == 0 ) {
    throw new Error("vertex shader texture read not supported");
  }

  // render targets
  refreshRenderTargets();

  noiseTex = new THREE.TextureLoader().load( "noise256.png" );
  noiseTex.wrapS = THREE.RepeatWrapping;
  noiseTex.wrapT = THREE.RepeatWrapping;
  noiseTex.minFilter = THREE.LinearMipMapLinearFilter;
  noiseTex.magFilter = THREE.LinearFilter;
  
  // clock
  clock = new THREE.Clock();

  // uniforms
  var w = getRenderWidth();
  var h = getRenderHeight();

  fragDefines = {};
  updateFragDefines(); // needs to have this set to something for initial shader loading

  fragUniforms = {
    // CUSTOM UNIFORMS
    // targetPoss: {
    //   type: 'v3v',
    //   // value set during rendering
    // },

    // SHADERTOY UNIFORMS
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
    },
    iChannel1: {
      type: 't',
      // value set during rendering
    },
    iChannel2: {
      type: 't',
      // value set during rendering
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
    fragUniforms.iMouse.value.z = (e.clientX - rect.left) / getRenderWidth() * 2 - 1;
    fragUniforms.iMouse.value.w = (e.clientY - rect.top) / getRenderHeight() * -2 + 1; 
  });


  // HACK - delay load because chrome devtools has canvas setup issues?
  setTimeout(function() {
    // setup canvas, render targets, meshes, and shaders (onResize calls all the others)
    window.addEventListener('resize', onResize);
    fragUniforms.iResolution.value.z = 1; // pixel aspect ratio
    onResize();

    initNeurons();

    // start update loop
    if (!shaderInitFailed) {
      updateAndRender();
    }

    initialized = true;
  }, 1);
}

function onResize() {
  // if (customDims && initialized) return;

  // camera.aspect = getRenderWidth() / getRenderHeight();
  // camera.updateProjectionMatrix();
  // renderer.setSize(getRenderWidth(), getRenderHeight());
  // fragUniforms.iResolution.value.x = getRenderWidth();
  // fragUniforms.iResolution.value.y = getRenderHeight();

  // console.log("dims: " + window.innerWidth + ", " + window.innerHeight);

  fragUniforms.iFrame.value = 0;
  fragUniforms.iGlobalTime.value = 0;
  lastSendTime = 0;

  refreshMeshes();
  refreshRenderTargets();
}

var renderTargetOptions = {
  magFilter: THREE.NearestFilter,
  minFilter: THREE.NearestFilter,

  wrapS: THREE.ClampToEdgeWrapping,
  wrapT: THREE.ClampToEdgeWrapping,

  format: THREE.RGBAFormat,
  type: THREE.FloatType,
};

function refreshRenderTargets() {

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

function refreshMeshes() {
  for (var i = 0; i < meshes.length; i++) {
    scene.remove(meshes[i]);
  }

  var planeGeom = new THREE.PlaneBufferGeometry(getRenderWidth(), getRenderHeight(), 1);
  var planeGeomWindow = customDims ? new THREE.PlaneBufferGeometry(window.innerWidth, window.innerHeight, 1) : planeGeom;
  for (var i = 0; i < shaderDefs.length; i++) {
    var mesh = new THREE.Mesh( shaderDefs[i].outBufferIdx === -1 ? planeGeomWindow : planeGeom );
    scene.add(mesh);
    meshes[i] = mesh;
  }

  refreshShaders();
}

function refreshShaders() {
  for (var i = 0; i < shaderDefs.length; i++) {
    var newMat = new THREE.ShaderMaterial({
      uniforms: fragUniforms,
      defines: fragDefines,
      vertexShader: ShaderLoader.get("neurons_vert"),
      fragmentShader: ShaderLoader.get(shaderDefs[i].name),
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
  renderer.render(scene, camera);

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

  if(!initialized && materialReset) {
    console.assert(false, "shader init failed");
    shaderInitFailed = true;
  }

  if (materialReset) {
    // if rendered with a bad material before, render over again so we don't see on screen
    updateAndRender();
  }
}

function shaderLoadCallback(shaderChanged) {
  if (shaderChanged) {
    refreshShaders();
  }
}

var neuronUpdateScene;
var neuronUpdateMesh;

function initNeurons() {
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

// in-place fisher-yates shuffle
// source http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

var particleArrIdxToPlayerIdx = [];
for (var i = 0; i < numParticles; i++) {
  particleArrIdxToPlayerIdx[i] = i;
}
shuffle(particleArrIdxToPlayerIdx);

var playerIdxToParticleArrIdx = [];
for (var i = 0; i < numParticles; i++) {
  playerIdxToParticleArrIdx[particleArrIdxToPlayerIdx[i]] = i;
}


function updateFragDefines() {
  var defs = fragDefines;

  defs.NUM_PARTICLES = numParticles;
  defs.NUM_SMALL_PARTICLES = numSmallParticles;
  defs.INTEGRATE_STEP = 0.0001;
}

// var playerIdxToPlayerPosIdx = [
  
// ];

var getParticlePos = function(i) {
  if (i < numParticles) {
    // i = particleArrIdxToPlayerIdx[i];
  }

  // i = playerIdxToPlayerPosIdx[i];

  i = (numParticles-1) - (i % numParticles);

  // var extra = 0.1;
  // var r = 2.0;
  // var yOff = -0.7;
  // var xScale = 1.1;

  var extra = 0.5;
  var theta = i / (numParticles-1) * (3.14+extra*2) - extra;
  var r = 1.0;
  // var r = 0;
  var xScale = 1.6 * 1.2;
  var yScale = 1.2 * 1.2;
  // var yOff = 0;
  var yOff = -0.3;
  return [
    Math.cos(theta)*r * xScale,
    Math.sin(theta)*r * yScale + yOff,
    0,
  ];
}

// This is run every time an OSC message is received
function receiveOsc(addressStr, data) {
  var addr = addressStr.split("/").filter(function(el) {return el.length > 0});

  var timestamp = Date.now() - initTime;
  var log = [addressStr, data, timestamp];
  if (logMessages) {
    messageLog.push(log);
  }

  if (addr[1] === "connect") {
    // console.log("OSC RECEIVED: " + addressStr + " :: " + data);
    var addr0 = addr[0];
    var addr1 = addr[2] || (!isNaN(data) && data);
    // console.log(addr0 + ", " + addr1);
    if (addr0 && addr1) {
      connectParticles(addr0, addr1);
    }
  }
  else if (addr[1] === "amp") {
    receiveAmplitude(addr[0], data);
  }
  else if (addr[0] === "b") {
    gotoBSection();
  }
}

function receiveAmplitude(idx, amp) {
  idx = parseInt(idx);
  amp = parseFloat(amp);
  // amps[idx] = Math.max(amps[idx], amp);
  var a = 0.3;
  console.log(amp);
  amps[idx] = amp * a + amps[idx] * (1-a);
}

function gotoBSection() {
  // TODO
}

function sendPulse(idx0, idx1) {
  amps[idx0] = 1;

  // console.log("PULSE: " + idx0 + ", " + idx1);

  for (var i = 0; i < 4; i++) {
    if (disabledParticlesList.length === 0) {
      for (var i = numParticles; i < numParticles + numSmallParticles; i++) {
        disabledParticlesList.push(i);
      }
      // shuffle(disabledParticlesList);
      // break;
    }

    var idx = disabledParticlesList.pop();
    partEnabled[idx] = 1.0;
    posToSet[idx] = idx0;
    // posToSet[idx] = getParticlePos(idx0);
    partTargetPoss[idx] = idx1;
    // partTargetPoss[idx] = getParticlePos(idx1);
  }
}

var attemptedConnections = [];
var connections = [];

for (var i = 0; i < numParticles; i++) {
  connections[i] = false;
  attemptedConnections[i] = -1;
}

function breakConnections(idx) {
  var conn = connections[idx];

  if (conn) {
    // stop the pulses
    clearInterval(conn.repeater);

    // un-store the connection
    connections[conn.firstIdx] = false;
    connections[conn.secondIdx] = false;

    // un-store attempt
    attemptedConnections[conn.firstIdx] = -1;
    attemptedConnections[conn.secondIdx] = -1;    

    console.log("CONN-BREAK: " + conn.firstIdx + ", " + conn.secondIdx)
  }
}

function getConnected(idx0, idx1) {
  var firstIdx = Math.min(idx0, idx1);
  var secondIdx = Math.max(idx0, idx1);

  var connection = connections[firstIdx];
  return connection && connection.secondIdx === secondIdx;
}

function connectParticles(idx0, idx1) {
  idx0 = parseInt(idx0);
  idx1 = parseInt(idx1);

  // if (idx0 >= numParticles || idx1 >= numParticles || idx0 < 0 || idx1 < 0) {
  //   console.log("INVALID CONNECTION: " + idx0 + ", " + idx1);
  //   return;
  // }

  console.log("CONN: " + idx0 + ", " + idx1);

  if (idx0 === idx1) return;

  if (getConnected(idx0, idx1)) return;

  breakConnections(idx0);
  // breakConnections(idx1);

  // attempt connection
  attemptedConnections[idx0] = idx1;
  // done for now, unless partner has also attempted
  if (attemptedConnections[idx1] !== idx0) return;

  // CONNECTION ESTABLISHED //
  console.log("CONN-SUCCESS: " + idx0 + ", " + idx1);

  // make the pulse repeater
  var repeaterFunc = function() {
    sendPulse(idx0, idx1);
    sendPulse(idx1, idx0);
  };
  var repeater = setInterval(repeaterFunc, 0.8 * 1000)

  // send the first pulse
  repeaterFunc();

  // store the connection
  var firstIdx = Math.min(idx0, idx1);
  var secondIdx = Math.max(idx0, idx1);
  var connection = {
    startTime: time,
    firstIdx: firstIdx,
    secondIdx: secondIdx,
    repeater: repeater,
  };
  connections[firstIdx] = connection;
  connections[secondIdx] = connection;

  // console.assert(getConnected(firstIdx, secondIdx));
}

var amps = [];
var posToSet = [];
var partEnabled = [];
var partTargetPoss = [];
var disabledParticlesList = [];
for (var i = 0; i < numParticles + numSmallParticles; i++) {
  posToSet[i] = false;
  partEnabled[i] = 0.0;
  amps[i] = 0.0;
  if (i < numParticles) {
    partTargetPoss[i] = getParticlePos(i % numParticles);
  }
  else {
    partTargetPoss[i] = i % numParticles;
  }
}
for (var i = numParticles; i < numParticles + numSmallParticles; i++) {
  if (partEnabled[i] <= 0.0) {
    disabledParticlesList.push(i);
  }
}

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

var lastSendTime = -99;
function updateNeurons() {

  // DEBUG TEST
  if (localTest && time - lastSendTime > 0.0) {
    lastSendTime = time;
    var idx0 = getRandomIntInclusive(0, numParticles-1);
    var idx1 = getRandomIntInclusive(0, numParticles-1);
    sendOsc("/" + idx0 + "/" + "connect", idx1);
    sendOsc("/" + idx1 + "/" + "connect", idx0);
  }

  // for (var i = 0; i < numParticles + numSmallParticles; i++) {
  //   amps[i] *= 0.85;
  // }

  // set shader defines
  updateFragDefines();

  // read from tex[1]
  fragUniforms.iChannel0.value = renderTargetPairs[0][1].texture;;

  // write to tex[0]
  var renderTarget = renderTargetPairs[0][0];

  // res stuff
  camera.aspect = getRenderWidth() / getRenderHeight();
  camera.updateProjectionMatrix();
  renderer.setSize(getRenderWidth(), getRenderHeight());
  fragUniforms.iResolution.value.x = getRenderWidth();
  fragUniforms.iResolution.value.y = getRenderHeight();

  var geom = new THREE.BufferGeometry();

  var attributesPerParticle = 3;
  var position = new Float32Array( 3 * (numParticles+numSmallParticles) * attributesPerParticle );
  var val = new Float32Array( 3 * (numParticles+numSmallParticles) * attributesPerParticle );

  var posIdx = 0;
  var valIdx = 0;
  for (var i = 0; i < numParticles + numSmallParticles; i++) {

    var isPlayer = i < numParticles;

    // update targetPos
    var partX = (i + 1) / getRenderWidth() * 2 - 1;
    position[posIdx++] = partX;
    position[posIdx++] = (2 + 1) / getRenderHeight() * 2 - 1;
    position[posIdx++] = 0;

    if (isPlayer) {
      var targetPos = partTargetPoss[i];
      val[valIdx++] = targetPos[0];
      val[valIdx++] = targetPos[1];
      val[valIdx++] = targetPos[2]; 
    }
    else {
      var targetPos = partTargetPoss[i];
      val[valIdx++] = targetPos;
      val[valIdx++] = 0;
      val[valIdx++] = 0;
    }

    // update misc particle data
    position[posIdx++] = partX;
    position[posIdx++] = (3 + 1) / getRenderHeight() * 2 - 1;
    position[posIdx++] = 0;


    // disable small particles randomly
    if (!isPlayer && Math.random() < 1 / 10 / 60) {
      partEnabled[i] = false;
    }

    // enabled
    val[valIdx++] = partEnabled[i];
    // val[valIdx++] = i < numParticles*6 ? 1.0 : 0.0;

    // seek target
    // val[valIdx++] = 1.0;
    // val[valIdx++] = i < numParticles ? 1.0 : -1.0;


    // position
    var newPartPosIdx = posToSet[i];
    if (newPartPosIdx !== false) {
      posToSet[i] = false;

      val[valIdx++] = newPartPosIdx;

      // position[posIdx++] = partX;
      // position[posIdx++] = (0 + 1) / getRenderHeight() * 2 - 1;
      // position[posIdx++] = 0;
      // val[valIdx++] = newPartPos[0];
      // val[valIdx++] = newPartPos[1];
      // val[valIdx++] = newPartPos[2];
    }
    else {
      val[valIdx++] = -1;
    }


    // amp
    val[valIdx++] = amps[i];
    // val[valIdx++] = 1.0;

  }

  console.assert(posIdx <= position.length);
  console.assert(valIdx <= val.length);

  geom.addAttribute( 'position', 
    new THREE.BufferAttribute( position, 3 ) );
  geom.addAttribute( 'val', 
    new THREE.BufferAttribute( val, 3 ) );

  var mat = new THREE.ShaderMaterial({
    uniforms: fragUniforms,
    vertexColors: THREE.VertexColors,

    vertexShader: ShaderLoader.get("neurons_point_vert"),
    fragmentShader: ShaderLoader.get("neurons_point_frag"),
    extensions: {
      fragDepth: true,
    },
  });

  var pointsMesh = new THREE.Points(geom, mat);
  neuronUpdateMesh.renderOrder = 1;
  pointsMesh.renderOrder = 2;

  // render
  neuronUpdateScene.add(pointsMesh);
  neuronUpdateScene.add(neuronUpdateMesh);
  renderer.render(neuronUpdateScene, camera, renderTarget);
  neuronUpdateScene.remove(pointsMesh);
  neuronUpdateScene.remove(neuronUpdateMesh);

  // ping pong
  var temp = renderTargetPairs[0][0];
  renderTargetPairs[0][0] = renderTargetPairs[0][1];
  renderTargetPairs[0][1] = temp;
}

function updateAndRender() {
  requestAnimationFrame(updateAndRender);

  if (LIVE_UPDATE && !ShaderLoader.loading) {
    delete shadersToLoad.neurons_vert;
    shaderLoader.loadShaders(shadersToLoad, "./glsl/", shaderLoadCallback);
  }

  var dt = clock.getDelta();

  fragUniforms.iFrame.value++;
  fragUniforms.iTimeDelta.value = dt;
  fragUniforms.iFrameRate.value = 1 / dt;
  fragUniforms.iGlobalTime.value += dt;
  time = fragUniforms.iGlobalTime.value;
  
  updateNeurons();
  // return;

  var passesThisFrame = time > 0.5 ? 1 : 1;

  for (var passIdx = 0; passIdx < passesThisFrame; passIdx++) {
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

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        fragUniforms.iResolution.value.x = window.innerWidth;
        fragUniforms.iResolution.value.y = window.innerHeight;

        renderer.render(scene, camera);
      }
      else { 
        // render to buffer

        camera.aspect = getRenderWidth() / getRenderHeight();
        camera.updateProjectionMatrix();
        renderer.setSize(getRenderWidth(), getRenderHeight());
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
  }

}


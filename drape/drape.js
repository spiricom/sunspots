"use strict";

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();


// CONFIG
var fboWidth  = 30;
var fboHeight = 30;
var clothsPerGroup = 4;
var audioEnabled = true;
var keepClothsCentered = true;

var guiEnabled = false;
var controlsEnabled = true;

// MISC GLOBALS
var gl;
var scene;
var camera;
var cameraFixed;
var renderer;
var bgGainNode;
var controls;
var context;
var allClothGroups = [];
var bgGroup;
var audioBuffer = [];
var sourceNode = [];
var clothColors = [];
var analyser = [];
var fftArray = [];
var panners = [];
var array;
var listener;
var myCounter = 0;
var counterMax = 300;
var flasher = 0;
var clothRootNode;

// bloom source: 
// https://threejs.org/examples/webgl_postprocessing_unreal_bloom.html
var camera, scene, renderer, controls, objects = [];
var effectFXAA, bloomPass, renderScene;
var composer;

var params = {
  projection: 'normal',
  background: false,
  exposure: 1.0,
  bloomThreshold: 0.25,
  bloomStrength: 0.2,
  bloomRadius: 0.1,
};

var EasingFunctions = {
  // no easing, no acceleration
  linear: function (t) { return t },
  // accelerating from zero velocity
  easeInQuad: function (t) { return t*t },
  // decelerating to zero velocity
  easeOutQuad: function (t) { return t*(2-t) },
  // acceleration until halfway, then deceleration
  easeInOutQuad: function (t) { return t<.5 ? 2*t*t : -1+(4-2*t)*t },
  // accelerating from zero velocity 
  easeInCubic: function (t) { return t*t*t },
  // decelerating to zero velocity 
  easeOutCubic: function (t) { return (--t)*t*t+1 },
  // acceleration until halfway, then deceleration 
  easeInOutCubic: function (t) { return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1 },
  // accelerating from zero velocity 
  easeInQuart: function (t) { return t*t*t*t },
  // decelerating to zero velocity 
  easeOutQuart: function (t) { return 1-(--t)*t*t*t },
  // acceleration until halfway, then deceleration
  easeInOutQuart: function (t) { return t<.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t },
  // accelerating from zero velocity
  easeInQuint: function (t) { return t*t*t*t*t },
  // decelerating to zero velocity
  easeOutQuint: function (t) { return 1+(--t)*t*t*t*t },
  // acceleration until halfway, then deceleration 
  easeInOutQuint: function (t) { return t<.5 ? 16*t*t*t*t*t : 1+16*(--t)*t*t*t*t }
}

function HSVtoRGB(h, s, v) {
  h = h % 1;
  s = THREE.Math.clamp(s, 0, 1);
  v = THREE.Math.clamp(v, 0, 1);
  var r, g, b, i, f, p, q, t;
  if (arguments.length === 1) {
    s = h.s, v = h.v, h = h.h;
  }
  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }
  
  return new THREE.Color(r, g, b);
}


window.onload = function() {
  var sl = new ShaderLoader();
  sl.loadShaders({
    posUpdate_vert : "",
    posUpdate_frag : "",

    velUpdate_vert : "",
    velUpdate_frag : "",

    render_vert : "",
    render_frag : "",
  }, "./glsl/", init );
};

var fixedRes = false;

// for taking high-res screenshots
// comment out for automatic resolution
// fixedRes = {
//   width: 18*300,
//   height: 12*300,
// };

function init() {
  // audio setup
  // check if the default naming is enabled, if not use the chrome one.
  if (!window.AudioContext) {
      if (!window.webkitAudioContext) {
          alert("no audiocontext found!");
      }
      window.AudioContext = window.webkitAudioContext;
  }
  context = new AudioContext();
  array = new Uint8Array(512);
  listener = context.listener;
  listener.setOrientation(0,0,-5,0,1,0);    

  // scene
  scene = new THREE.Scene();

  // scale down to make better use of z buffer precision
  scene.scale.x = 0.01;
  scene.scale.y = 0.01;
  scene.scale.z = 0.01;

  var viewportWidth = window.innerWidth;
  var viewportHeight = window.innerHeight;
  if (fixedRes) {
    viewportWidth = fixedRes.width;
    viewportHeight = fixedRes.height;
  }

  // camera
  camera = new THREE.PerspectiveCamera(10, viewportWidth / viewportHeight, 1, 50000);
  camera.position.x = 2500 * scene.scale.x;
  camera.position.y = 2500 * scene.scale.x;
  camera.position.z = 2500 * scene.scale.x;
  // cameraFixed = new THREE.PerspectiveCamera(10, viewportWidth / viewportHeight, 1, 50000);

  // renderer
  renderer = new THREE.WebGLRenderer({ 
    antialias: false, // disable for deferred stuff
    // antialias: true, 
    devicePixelRatio: 1,
    // enable this for screenshots:
    preserveDrawingBuffer: true,
    gammaInput: true,
    gammaOutput: true,
  });
  renderer.toneMapping = THREE.LinearToneMapping;
  // renderer.autoClearColor = false;
  // renderer.autoClearDepth = false;

  renderer.setSize(viewportWidth, viewportHeight);
  document.body.appendChild(renderer.domElement);

  gl = renderer.getContext();  
  THREEx.Screenshot.bindKey(renderer);

  renderScene = new THREE.RenderPass(scene, camera);

  effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);
  effectFXAA.uniforms['resolution'].value.set(1 / viewportWidth, 1 / viewportHeight );

  var copyShader = new THREE.ShaderPass(THREE.CopyShader);
  copyShader.renderToScreen = true;

  bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(viewportWidth, viewportHeight), 1.5, 0.4, 0.85);//1.0, 9, 0.5, 512);
  composer = new THREE.EffectComposer(renderer);
  composer.setSize(viewportWidth, viewportHeight);
  composer.addPass(renderScene);
  composer.addPass(effectFXAA);
  composer.addPass(bloomPass);
  composer.addPass(copyShader);
  //renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.gammaInput = true;

  if (guiEnabled) {
    var gui = new dat.GUI();

    gui.add( params, 'exposure', 0.1, 2 );
    gui.add( params, 'bloomThreshold', 0.0, 1.0 ).onChange( function(value) {
        bloomPass.threshold = Number(value);
    });
    gui.add( params, 'bloomStrength', 0.0, 3.0 ).onChange( function(value) {
        bloomPass.strength = Number(value);
    });
    gui.add( params, 'bloomRadius', 0.0, 1.0 ).onChange( function(value) {
        bloomPass.radius = Number(value);
    });
    gui.open();
  }

  // camera controls
  if (controlsEnabled) {
    controls = new THREE.TrackballControls( camera, renderer.domElement );
    controls.noZoom = false;
    controls.noPan = true;
  }

  // CLOTHS /////////////////////

  var clothTex = THREE.ImageUtils.loadTexture("textures/marble.png");
  // var clothTex = THREE.ImageUtils.loadTexture("textures/grungy/4559510781_4e94a042b2_o_b.jpg");
  // var clothTex = THREE.ImageUtils.loadTexture("textures/grungy/4086773135_2dde2925c1_o.jpg");
  clothTex.wrapS = THREE.RepeatWrapping;
  clothTex.wrapT = THREE.RepeatWrapping;
  clothTex.anisotropy = 16;

  var group = new ClothBunch(clothsPerGroup, fboWidth, fboHeight, clothTex, 256);
  group.colorScheme = "main";
  allClothGroups.push(group);

  var sideClothRes = 24;
  var sideClothSize = 300;

  var col = new THREE.Color(0.9, 0.9, 0.9);
  var sideOptions = {
    flatShading: true,
    color: col,
  };

  // orbiters
  var group = new ClothBunch(1, sideClothRes, sideClothRes, clothTex, sideClothSize, sideOptions);
  group.colorScheme = "fixed";
  group.pos = new THREE.Vector3(5000, 0, 0);
  group.vel = new THREE.Vector3(-drifterSpeed, 0, 0);
  allClothGroups.push(group);

  var group = new ClothBunch(1, sideClothRes, sideClothRes, clothTex, sideClothSize, sideOptions);
  group.colorScheme = "fixed";
  group.pos = new THREE.Vector3(0, 5000, 0);
  group.vel = new THREE.Vector3(0, (-drifterSpeed), 0);
  allClothGroups.push(group);

  var group = new ClothBunch(1, sideClothRes, sideClothRes, clothTex, sideClothSize, sideOptions);
  group.colorScheme = "fixed";
  group.pos = new THREE.Vector3(0, 0, 5000);
  group.vel = new THREE.Vector3(0, 0, (-drifterSpeed));
  allClothGroups.push(group);

  var group = new ClothBunch(1, sideClothRes, sideClothRes, clothTex, sideClothSize, sideOptions);
  group.colorScheme = "fixed";
  group.pos = new THREE.Vector3(-5000, 0, 0);
  group.vel = new THREE.Vector3(-(-drifterSpeed), 0, 0);
  allClothGroups.push(group);

  var group = new ClothBunch(1, sideClothRes, sideClothRes, clothTex, sideClothSize, sideOptions);
  group.colorScheme = "fixed";
  group.pos = new THREE.Vector3(0, -5000, 0);
  group.vel = new THREE.Vector3(0, -(-drifterSpeed), 0);
  allClothGroups.push(group);

  var group = new ClothBunch(1, sideClothRes, sideClothRes, clothTex, sideClothSize, sideOptions);
  group.colorScheme = "fixed";
  group.pos = new THREE.Vector3(0, 0, -5000);
  group.vel = new THREE.Vector3(0, 0, -(-drifterSpeed));
  allClothGroups.push(group);

  // bg
  for (var j = 0; j < 3; j++) {
    var group = new ClothBunch(1, 40, 40, clothTex, 250, {
      // flatShading: true,
      noTex: true,
      noRandomRot: true,
      scale: 100,
      isBg: true,
      color: new THREE.Color(1, 1, 1),
    });
    group.colorScheme = "fixed";
    // group.pos = new THREE.Vector3(0, 0, -4000);
    allClothGroups.push(group);
    // bgGroup = group;
  }

  // random drifters
  // for (var j = 0; j < 0; j++) {
  //   var group = new ClothBunch(clothsPerGroup, fboWidth, fboHeight, clothTex, sideClothSize);

  //   group.pos = new THREE.Vector3(
  //     (Math.random()*2-1) * 800,
  //     (Math.random()*2-1) * 800,
  //     (Math.random()*2-1) * 800
  //   );

  //   group.vel = new THREE.Vector3(
  //     (Math.random()*2-1) * drifterSpeed,
  //     (Math.random()*2-1) * drifterSpeed,
  //     (Math.random()*2-1) * drifterSpeed
  //   );
    
  //   allClothGroups.push(group);
  // }

  // AUDIO STUFF //////////////////

  // per-cloth sounds
  for (var i = 0; i < 4; i++) {
    if (audioEnabled) {
      var panner = context.createPanner();
      panner.panningModel = 'equalpower';
      panner.distanceModel = 'exponential';
      panner.refDistance = 1;
      panner.maxDistance = 1000;
      panner.rolloffFactor = .1;
      panner.coneInnerAngle = 300;
      panner.coneOuterAngle = 0;
      panner.coneOuterGain = .7;
      panner.setOrientation(0,1,0);
      // panner.setPosition(((Math.random()-.5)*30), ((Math.random()-.5)*30), ((Math.random()-.5)*30));
      panner.connect(context.destination);
      panners.push(panner);
      
      var an = context.createAnalyser();
      an.smoothingTimeConstant = 0.3;
      an.fftSize = 1024;
      an.connect(context.destination);
      // an.connect(panners[i]);
      analyser.push(an);    
      
      // create a buffer source node
      var sn = context.createBufferSource();
      // and connect to destination
      sn.connect(analyser[i]);
      loadSound(i);
      sourceNode.push(sn);
    }
  }

  // BG AUDIO
  if (audioEnabled) {
    var an = context.createAnalyser();
    an.smoothingTimeConstant = 0.2;
    an.fftSize = 1024;
    an.connect(context.destination);
    analyser.push(an);
    
    bgGainNode = context.createGain();
    bgGainNode.connect(analyser[4]);
    bgGainNode.gain.setValueAtTime(0, context.currentTime);
    // create a buffer source node
    var sn = context.createBufferSource();
    // and connect to destination
    sn.connect(bgGainNode);
    loadSound(4);
    sourceNode.push(sn);
  }

  // LIGHTS 
  // NOTE: these have no effect on cloths - cloths use custom shading
  scene.add( new THREE.AmbientLight( 0x666666 ) );
  
  var dirLight = new THREE.DirectionalLight( 0xdfebff, 1.75 );
  dirLight.position.set( 50, 200, 100 );
  dirLight.position.multiplyScalar( 1.3 );
  dirLight.castShadow = false;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  scene.add( dirLight );

  // SETUP VIEWPORT DIMS
  window.addEventListener( "resize", onResize );
  onResize();

  // START UPDATE LOOP
  update();
}

function onResize() {
  if (!fixedRes) {
    var w = window.innerWidth;
    var h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    composer.setSize( w, h );
    effectFXAA.uniforms['resolution'].value.set(1 / w, 1 / h );
  }
}

var avgVolumes = [];

function update() {
  requestAnimationFrame(update);

  if (audioEnabled) {
    // update bg flasher
    if (flasher == 1) {
      analyser[4].getByteFrequencyData(array);
      var average = getAverageVolume(array);
      renderer.setClearColor(HSVtoRGB(0, 0, average / 20));
    }
    else {
      // renderer.setClearColor(HSVtoRGB(0, 0, 1));
      renderer.setClearColor(0x000000);
    }

    // update cloth audio reactivity
    if (myCounter >= counterMax) {
      myCounter = 0;
      var now = context.currentTime;
      if (flasher == 1) {
        counterMax = ((Math.random()* 3000) + 100);
        bgGainNode.gain.linearRampToValueAtTime(0, now + .2);
      }
      else {
        counterMax = ((Math.random()* 100) + 100);
        bgGainNode.gain.linearRampToValueAtTime(1.0, now +.2);
      }
      flasher = !flasher;
    }    
    myCounter++;
    

    for (var analyserIdx = 0; analyserIdx < analyser.length; analyserIdx++) {
      analyser[analyserIdx].getByteFrequencyData(array);
      avgVolumes[analyserIdx] = getAverageVolume(array);
    }
  }

  for (var groupIdx = 0; groupIdx < allClothGroups.length; groupIdx++) {
    allClothGroups[groupIdx].update(camera, avgVolumes);
  }

  // update controls and camera
  if (controlsEnabled) {
    controls.update();
  }
  camera.lookAt( scene.position );
  listener.setOrientation(camera.position.x, camera.position.y, camera.position.z, 0,1,0);

  // renderer.render(scene, camera, null, true);

  renderer.toneMappingExposure = Math.pow( params.exposure, 4.0 );
  composer.render();
}

// load the specified sound
function loadSound(w) {
    var url;
    
    if (w == 0) { 
      var url = "./sounds/sunspots5_bl_mono.ogg";
    }
    else if (w == 1) {
      var url = "./sounds/sunspots5_br_mono.ogg";
    }
    else if (w == 2) {
      var url = "./sounds/sunspots5_fl_mono.ogg";
    }
    else if (w == 3) {
      var url = "./sounds/sunspots5_fr_mono.ogg";
    }
    else if (w == 4) {
      var url = "./sounds/timpani_improv.mp3";
    }
    else return;

    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    // When loaded decode the data
    request.onload = function() {

        // decode the data
        context.decodeAudioData(request.response, function(buffer) {
            // when the audio is decoded play the sound
            playSound(buffer, w);
        }, onError);
    }
    request.send();
}

function playSound(buffer, w) {
  sourceNode[w].buffer = buffer;

  sourceNode[w].loop = true;
  sourceNode[w].start(0);

}

function getAverageVolume(array) {
  var values = 0;
  var average;

  var length = array.length;

  // get all the frequency amplitudes
  for (var i = 0; i < length; i++) {
      values += array[i];
  }

  average = values / length;
  return average;
}

function onError(e) {
  console.log(e);
}

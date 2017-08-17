"use strict";

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();


// CONFIG
var audioEnabled = false;

var fboWidth  = 200;
var fboHeight = 200;
var keepClothsCentered = true;

var initCameraDist = 500;

// var baseBgColor = new THREE.Color(0x333530);
var baseBgColor = new THREE.Color(0x000000);

var guiEnabled = false;
var controlsEnabled = true;

var bloomParams = {
  projection: 'normal',
  background: false,
  exposure: 1.0,
  bloomThreshold: 0.25,
  bloomStrength: 0.2,
  bloomRadius: 0.1,
};

// CONTAINERS
var allClothGroups = [];

// VISUALS GLOBALS
var gl;
var scene;
var camera;
var cameraFixed;
var renderer;
var controls;

// AUDIO GLOBALS
var audioContext;
var bgGainNode;
var bgGroup;
var audioBuffer = [];
var sourceNode = [];
var clothColors = [];
var analyser = [];
var fftArray = [];
var panners = [];
var freqDataArray;
var audioListener;
var myCounter = 0;
var counterMax = 300;
var flasher = 0;
var clothRootNode;

var numClothSounds = 4;

// bloom source: 
// https://threejs.org/examples/webgl_postprocessing_unreal_bloom.html
var effectFXAA, bloomPass, renderScenePass, composer;


var EasingFunctions = {
  linear: function (t) { return t },
  easeInQuad: function (t) { return t*t },
  easeOutQuad: function (t) { return t*(2-t) },
  easeInOutQuad: function (t) { return t<.5 ? 2*t*t : -1+(4-2*t)*t },
  easeInCubic: function (t) { return t*t*t },
  easeOutCubic: function (t) { return (--t)*t*t+1 },
  easeInOutCubic: function (t) { return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1 },
  easeInQuart: function (t) { return t*t*t*t },
  easeOutQuart: function (t) { return 1-(--t)*t*t*t },
  easeInOutQuart: function (t) { return t<.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t },
  easeInQuint: function (t) { return t*t*t*t*t },
  easeOutQuint: function (t) { return 1+(--t)*t*t*t*t },
  easeInOutQuint: function (t) { return t<.5 ? 16*t*t*t*t*t : 1+16*(--t)*t*t*t*t }
};

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
  }, "../glsl/", init );
};

var fixedRes = false;

// for taking high-res screenshots
// comment out for automatic resolution
// fixedRes = {
//   width: 18*300,
//   height: 12*300,
// };

function init() {
  
  // AUDIO
  if (!window.AudioContext) {
      if (!window.webkitAudioContext) {
          alert("no audiocontext found!");
      }
      window.AudioContext = window.webkitAudioContext;
  }
  audioContext = new AudioContext();
  freqDataArray = new Uint8Array(512);
  audioListener = audioContext.listener;
  audioListener.setOrientation(0,0,-5,0,1,0);    

  // SCENE
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

  // CAMERA
  camera = new THREE.PerspectiveCamera(10, viewportWidth / viewportHeight, 1, 20000);
  camera.position.x = initCameraDist * scene.scale.x;
  camera.position.y = initCameraDist * scene.scale.x;
  camera.position.z = initCameraDist * scene.scale.x;

  // RENDERER
  renderer = new THREE.WebGLRenderer({ 
    antialias: false, // must disable for deferred stuff
    devicePixelRatio: 1,
    preserveDrawingBuffer: true, // enable this for canvas image output
    gammaInput: true,
    gammaOutput: true,
  });
  renderer.toneMapping = THREE.LinearToneMapping;
  // renderer.autoClearColor = false;
  // renderer.autoClearDepth = false;

  renderer.setSize(viewportWidth, viewportHeight);
  document.body.appendChild(renderer.domElement);

  // SCREENSHOTS
  gl = renderer.getContext();  
  THREEx.Screenshot.bindKey(renderer);

  // // COLOR LUT /////////////
  // var lutColors = [];
  // lut = new THREE.Lut( colorMap, numberOfColors );
  // lut.setMax( 2000 );
  // lut.setMin( 0 );
  // for ( var i = 0; i < geometry.attributes.pressure.array.length; i++ ) {
  //   var colorValue = geometry.attributes.pressure.array[ i ];
  //   var color = lut.getColor( colorValue );
  //   if ( color == undefined ) {
  //     console.log( "ERROR: " + colorValue );
  //   } else {
  //     lutColors[ 3 * i     ] = color.r;
  //     lutColors[ 3 * i + 1 ] = color.g;
  //     lutColors[ 3 * i + 2 ] = color.b;
  //   }
  // }

  // POST FX /////////
  renderScenePass = new THREE.RenderPass(scene, camera);

  effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);
  effectFXAA.uniforms['resolution'].value.set(1 / viewportWidth, 1 / viewportHeight );

  var copyShader = new THREE.ShaderPass(THREE.CopyShader);
  copyShader.renderToScreen = true;

  bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(viewportWidth, viewportHeight), 1.5, 0.4, 0.85);//1.0, 9, 0.5, 512);
  composer = new THREE.EffectComposer(renderer);
  composer.setSize(viewportWidth, viewportHeight);
  composer.addPass(renderScenePass);
  composer.addPass(effectFXAA);
  composer.addPass(bloomPass);
  composer.addPass(copyShader);
  renderer.gammaInput = true;

  // TUNING GUI
  if (guiEnabled) {
    var gui = new dat.GUI();

    gui.add( bloomParams, 'exposure', 0.1, 2 );
    gui.add( bloomParams, 'bloomThreshold', 0.0, 1.0 ).onChange( function(value) {
        bloomPass.threshold = Number(value);
    });
    gui.add( bloomParams, 'bloomStrength', 0.0, 3.0 ).onChange( function(value) {
        bloomPass.strength = Number(value);
    });
    gui.add( bloomParams, 'bloomRadius', 0.0, 1.0 ).onChange( function(value) {
        bloomPass.radius = Number(value);
    });
    gui.open();
  }

  // CONTROLS
  if (true) {
    controls = new THREE.TrackballControls( camera, renderer.domElement );
    controls.noZoom = false;
    controls.noPan = true;
  }

  // CLOTHS /////////////////////

  var clothTex = THREE.ImageUtils.loadTexture("textures/marble.png");
  // var clothTex = THREE.ImageUtils.loadTexture("textures/marble_orig.png");
  // clothTex.magFilter = THREE.NearestFilter;
  // clothTex.minFilter = THREE.NearestFilter;

  // MAIN CLOTHS
  var mainClothSize = 256;
  var group = new ClothBunch(numClothSounds, fboWidth, fboHeight, clothTex, mainClothSize, {
    // pinMode: "random",
    // pinChance: 0.003,
    // noRandomRot: true,
    maxDist: (mainClothSize * 0.5)
  });
  group.colorScheme = "main";
  allClothGroups.push(group);


  // ORBITER CLOTHS
  var MakeOrbiter = function(x, y, z) {
    const sideClothRes = 24;
    const sideClothSize = 300;
    const orbiterDist = 5000;

    var sideOptions = {
      flatShading: true,
      color: new THREE.Color(0.9, 0.9, 0.9),
      maxDist: (sideClothSize * 0.5)
      // pinMode: "random",
      // pinChance: 0.01,
    };

    var group = new ClothBunch(1, sideClothRes, sideClothRes, clothTex, sideClothSize, sideOptions);
    group.colorScheme = "fixed";
    group.pos = new THREE.Vector3(x, y, z);
    
    group.pos.normalize();
    group.pos.multiplyScalar(orbiterDist);
    
    group.vel = new THREE.Vector3(x, y, z);
    group.vel.normalize();
    group.vel.multiplyScalar(-drifterSpeed);

    allClothGroups.push(group);
  };

  MakeOrbiter(1, 0, 0);
  MakeOrbiter(-1, 0, 0);
  MakeOrbiter(0, 1, 0);
  MakeOrbiter(0, -1, 0);
  MakeOrbiter(0, 0, 1);
  MakeOrbiter(0, 0, -1);

  // BG CLOTHS
  for (var j = 0; j < 3; j++) {
    var bgClothSize = 250;
    var group = new ClothBunch(1, 40, 40, clothTex, bgClothSize, {
      noTex: true,
      noRandomRot: true,
      scale: 50,
      isBg: true,
      maxDist: bgClothSize * 0.5,
      color: new THREE.Color(1, 1, 1),
      // keepCentered: true,
    });
    group.colorScheme = "fixed";
    allClothGroups.push(group);
  }

  // AUDIO STUFF //////////////////
  if (audioEnabled) {

    // PER-CLOTH SOUNDS
    for (var i = 0; i < numClothSounds; i++) {
      var panner = audioContext.createPanner();
      panner.panningModel = 'equalpower';
      panner.distanceModel = 'exponential';
      panner.refDistance = 1;
      panner.maxDistance = 1000;
      panner.rolloffFactor = .1;
      panner.coneInnerAngle = 300;
      panner.coneOuterAngle = 0;
      panner.coneOuterGain = .7;
      panner.setOrientation(0,1,0);
      panner.connect(audioContext.destination);
      panners.push(panner);
      
      var an = audioContext.createAnalyser();
      an.smoothingTimeConstant = 0.3;
      an.fftSize = 1024;
      an.connect(audioContext.destination);
      analyser.push(an);    
      
      // create a buffer source node
      var sn = audioContext.createBufferSource();
      // and connect to destination
      sn.connect(analyser[i]);
      loadSound(i);
      sourceNode.push(sn);
    }

    // BG AUDIO
    var an = audioContext.createAnalyser();
    an.smoothingTimeConstant = 0.2;
    an.fftSize = 1024;
    an.connect(audioContext.destination);
    analyser.push(an);
    
    bgGainNode = audioContext.createGain();
    bgGainNode.connect(analyser[4]);
    bgGainNode.gain.setValueAtTime(0, audioContext.currentTime);
    // create a buffer source node
    var sn = audioContext.createBufferSource();
    // and connect to destination
    sn.connect(bgGainNode);
    loadSound(4);
    sourceNode.push(sn);

  }

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

  // update controls and camera and audioListener
  if (controlsEnabled) {
    controls.update();
  }
  camera.lookAt( scene.position );
  audioListener.setOrientation(camera.position.x, camera.position.y, camera.position.z, 0,1,0);

  if (audioEnabled) {
    // update bg flasher
    if (flasher == 1) {
      analyser[4].getByteFrequencyData(freqDataArray);
      var average = getAverage(freqDataArray);
      // renderer.setClearColor(HSVtoRGB(84/255, 9.5/255, 21/255 + average / 20));
      renderer.setClearColor(HSVtoRGB(0, 0, 21/255 + average / 20));
    }
    else {
      renderer.setClearColor(baseBgColor);
    }

    // update cloth audio reactivity
    if (myCounter >= counterMax) {
      myCounter = 0;
      var now = audioContext.currentTime;
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
      analyser[analyserIdx].getByteFrequencyData(freqDataArray);
      avgVolumes[analyserIdx] = getAverage(freqDataArray);
    }
  }

  // update cloths
  for (var groupIdx = 0; groupIdx < allClothGroups.length; groupIdx++) {
    allClothGroups[groupIdx].update(camera, avgVolumes);
  }

  // render
  // renderer.render(scene, camera, null, true);
  renderer.toneMappingExposure = Math.pow( bloomParams.exposure, 4.0 );
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
    audioContext.decodeAudioData(request.response, function(buffer) {
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

function getAverage(vals) {
  var sum = 0;
  for (var i = 0; i < vals.length; i++) {
    sum += vals[i];
  }
  return sum / vals.length;
}

function onError(e) {
  console.log(e);
}

"use strict";

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();


// CONFIG
var audioEnabled = true;

var fboWidth  = 30;
var fboHeight = 30;

var initCameraDist = 500;

// var baseBgColor = new THREE.Color(0x333530);
var baseBgColor = new THREE.Color(0x000000);

var guiEnabled = false;
var controlsEnabled = true;

var bloomParams = {
  projection: 'normal',
  background: false,
  exposure: 1.0,
  bloomThreshold: 0.91,
  bloomStrength: 0.1,
  bloomRadius: 0.83,
};

// CONTAINERS
var allClothGroups = [];

// VISUALS GLOBALS
var gl;
var scene;
var sceneStencilMask;
var sceneStencilClipped;
var camera;
var cameraFixed;
var renderer;
var controls;
var sphereFacePlanes;
var facePlaneMatrices;

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

var localPlane = [];
var pointLight = [];
var allCloths = [];
var mesh = [];
var particleCount = 500;
var particles;
var particleSystem;
var pMaterial;
var material_sphere = [];

var crystalSoundGain;
var crystalSound;

var numSounds = 4;
var numBuffers = 2;

var soundPositions = [
  [-350,30,0], 
  [350,80,0], 
  [0,0,-350],
  [0,-50,350], 
  [-125,30,125], 
  [125,80,125],
  [-125, 0, -125], 
  [125, -50, -125],
];
var ratios = [.5,.875,1.0, 1.14285714, 1.125, 1.11111111111,1.25,1.5, 1.375,2.6,1.6,2.0];
//var ratios = [0.5,0.75,1.0,1.125];
var sound = [];
var soundGain = [];
var waitMax = 13;
var waitOffset = 4;

//sunspotsmetal1 is good, so is timp3_1
var soundFiles = ['./sounds/sunspots_lonely_knocks.mp3', './sounds/sunspots_wood_groan.mp3','./sounds/sunspotsmetal_harmonics.mp3','./sounds/sunspotsmetal1.mp3','./sounds/sunspotsnoiseTone1.mp3','./sounds/sunspotstimp3_1.mp3','./sounds/sunspotstimp4_1.mp3','./sounds/sunspotsuglydrone1.mp3','./sounds/sunspots_arpeg_slow1.mp3','./sounds/sunspots_arpeg.mp3'];

var whaleSounds = "./sounds/whales_record.mp3"
var reverbSoundFile = './reverbs/BX20E103.wav';
var valScalar = .01;
var panModel = 'equalpower';
//var panModel = 'HRTF';

var now;


var particleCount = 500;
var particles;
var particleSystem;
var pMaterial;


var loopCount = 0;
var volRandom = 1;

var analyzerDivisor = 64;
var whichFile = [5,0];

var myReverbGain = 0.16;
var clock = new THREE.Clock();
var refDist = 150;

var crystalRadius = 100;


var envelope;

var soundsLoaded = 0;
var convolver;
var audioContext,listener;
var soundsPlaying = 0;
var waitTimes = [], prevTime = [], onOff = [];
var bufferCounter = 0;

var myPalette = [[44,15,16],[66,22,16],[62,38,31],[104,28,21],[102,47,34],[137,42,31],[157,52,37],[121,75,68],[178,39,27],[106,89,90],[178,66,46],[132,93,81],[206,45,42],[213,32,18],[205,61,44],[158,94,75],[220,69,67],[169,104,99],[204,96,77],[142,127,125],[220,115,90],[97,63,34],[77,74,50],[90,86,55],[150,78,45],[177,78,19],[120,112,80],[206,83,30],[191,94,30],[220,94,35],[199,113,57],[166,130,99],[181,128,65],[240,102,23],[194,140,110],[245,124,60],[207,151,91],[191,156,133],[229,145,74],[226,167,90],[37,44,9],[60,60,41],[141,151,105],[117,124,115],[23,57,42],[49,75,57],[98,139,124],[46,86,79],[32,98,113],[74,101,109],[36,110,140],[31,124,123],[75,130,144],[43,151,155],[131,152,154],[64,163,151],[57,159,201],[40,164,170],[80,175,164],[26,60,89],[76,148,180],[87,168,204],[79,78,93],[38,33,36]];

function getPaletteColor()
{
    var myIndex = (Math.round(Math.random() * (myPalette.length - 1)));
    var myColor = myPalette[myIndex];
    //console.log("palette: " + myIndex + "( length: " + myPalette.length + ")");
    return ((myColor[0] << 16) + (myColor[1] << 8) + myColor[2]); 
}

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
  
  // CAMERA
  camera = new THREE.PerspectiveCamera( 160, window.innerWidth / window.innerHeight, 1, 10000 );
  camera.position.set( 0, 0, 740);
  // camera.position.set( 0, 25, 0 );

  var viewportWidth = window.innerWidth;
  var viewportHeight = window.innerHeight;
  if (fixedRes) {
    viewportWidth = fixedRes.width;
    viewportHeight = fixedRes.height;
  }

  // SCENE
  scene = new THREE.Scene();
  sceneStencilMask = new THREE.Scene();
  sceneStencilClipped = new THREE.Scene();
  scene.fog = new THREE.FogExp2( getPaletteColor(), 0.0045 );

  // RENDERER
  renderer = new THREE.WebGLRenderer({ 
    // antialias: true,
    // logarithmicDepthBuffer: true,
    devicePixelRatio: window.devicePixelRatio,
    // preserveDrawingBuffer: true,
    // stencil: true,
    // gammaInput: true,
    // gammaOutput: true,
  });
  // renderer.autoClear = false;
  // renderer.autoClearColor = false;
  // renderer.autoClearDepth = false;
  renderer.localClippingEnabled = true;
  // renderer.shadowMap.enabled = true;
  // renderer.shadowMap.renderReverseSided = false;
  // renderer.toneMapping = THREE.LinearToneMapping;

  renderer.setSize(viewportWidth, viewportHeight);
  document.body.appendChild(renderer.domElement);

  // controls
  // controls = new THREE.FirstPersonControls( camera, renderer.domElement );

  // controls.movementSpeed = 50;
  // controls.lookSpeed = 0.05;
  // controls.noFly = true;
  // controls.lookVertical = false;

  controls = new THREE.TrackballControls( camera, renderer.domElement );
  controls.noZoom = true;
  controls.noPan = true;
  controls.dynamicDampingFactor = 0.6;

  // SCREENSHOTS
  gl = renderer.getContext();  
  THREEx.Screenshot.bindKey(renderer);

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
  // composer.addPass(bloomPass);
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

  // light
  // var light = new THREE.DirectionalLight( getPaletteColor() );
  // light.position.set( 0, 0.5, .01 ).normalize();
  // scene.add( light );

  //clipping planes
  localPlane = [
    // new THREE.Plane( new THREE.Vector3( 0, - 1, .6 ), 0.8 ),
    // // new THREE.Plane( new THREE.Vector3( 0, - 1, .6 ), 0.8 ),
    // // new THREE.Plane( new THREE.Vector3( 0, - 1, .6 ), 0.8 ),
    // new THREE.Plane( new THREE.Vector3( .5, -1, -.9), 0.3 ),
    // new THREE.Plane( new THREE.Vector3( 1, .5, -.2 ), 1 ),
    // // new THREE.Plane( new THREE.Vector3( 1, -.6, 0 ), 0.7 ),
    // new THREE.Plane( new THREE.Vector3( 1, -.6, 0 ), 0.7 ),
    new THREE.Plane( new THREE.Vector3( 0, - 1, .6 ), 0.8 ),
    new THREE.Plane( new THREE.Vector3( .5, - 1, .6), 0.8 ),
    new THREE.Plane( new THREE.Vector3( 1, .5, -.2 ), 1 ),
    new THREE.Plane( new THREE.Vector3( 0, -.6, 0 ), 0.7 ),

  ];
  for (var i = 0; i < localPlane.length; i++) {
    localPlane[i].normalize();
  }

  // dividing planes
  var areaPlanes = localPlane
  // var areaPlanes = [
  //   new THREE.Plane( new THREE.Vector3( 0, - 1, -.6 ), 0.8 ),
  //   new THREE.Plane( new THREE.Vector3( .5, -1, -.9), 0.3 ),
  //   new THREE.Plane( new THREE.Vector3( .5, 0, .9), 0.3 ),
  //   new THREE.Plane( new THREE.Vector3( 1, .5, -.2 ), 1 ),
  // ];
  // for (var i = 0; i < areaPlanes.length; i++) {
  //   areaPlanes[i].normalize();
  // }

  // sky mesh
  var geoSky = new THREE.SphereGeometry( 1600, 48, 48 );
  var matSky = new THREE.MeshPhongMaterial( { color: getPaletteColor(), side: THREE.DoubleSide } );
  var meshSky = new THREE.Mesh( geoSky, matSky );
  meshSky.position.set( 0, 0, 0 );
  scene.add( meshSky );
  
  // sky light
  var hemiLight = new THREE.HemisphereLight( getPaletteColor());
  scene.add( hemiLight );
  var hemiLight = new THREE.HemisphereLight( getPaletteColor());
  sceneStencilMask.add( hemiLight );
  

  // particles
  particles = new THREE.Geometry();
      
  var textureLoader = new THREE.TextureLoader();
  var particleColor = getPaletteColor();
  
  pMaterial = new THREE.PointsMaterial({
    color: particleColor,
    size: 5,
    map: textureLoader.load("images/lensflare0_alpha_dot.png"),
    blending: THREE.AdditiveBlending,
    // transparent: true,
    //depthWrite: false,
  });
  pMaterial.alphaTest = 0.5;
  
  for (var p = 0; p < particleCount; p++) {
    var pX = Math.random() * 1000 - 500,
        pY = Math.random() * 1000 - 500,
        pZ = Math.random() * 1000 - 500;
    
    var particle = new THREE.Vector3(pX, pY, pZ);

    particle.velocity = new THREE.Vector3(
      (Math.random() * .2) - .1,
      (Math.random() * .2) - .1,
      (Math.random() * .2) - .1
      );

    particles.vertices.push(particle);
  }
  
  // create the particle system
  particleSystem = new THREE.Points(particles, pMaterial);
  
  // add it to the scene
  scene.add(particleSystem);
  
  // crystal sphere geom
  var sphereGeom = new THREE.SphereGeometry( crystalRadius, 3, 2 );
  sphereGeom.computeFaceNormals();

  // clipping planes for clipping to crystal
  sphereFacePlanes = planesFromGeometry( sphereGeom );
  facePlaneMatrices = sphereFacePlanes.map( planeToMatrix );

  // crystal shared material stuff
  // var mapHeight = new THREE.TextureLoader().load( "images/Infinite-Level_02_Disp_NoSmoothUV-4096.jpg" );
  // mapHeight.anisotropy = 16;
  // mapHeight.repeat.set( 0.998, 0.998 );
  // mapHeight.offset.set( 0.001, 0.001 );
  // mapHeight.wrapS = mapHeight.wrapT = THREE.RepeatWrapping;
  // mapHeight.format = THREE.RGBFormat;

  var sharedMaterialData = { 
    // color: 0xffffff, 
    // shininess: 10, 
    // displacementMap: mapHeight,
    // displacementScale: 5,
    // displacementBias: 2,
    // opacity: 0.8,
    // clipShadows: true,
  };

  // cloth texture
  var clothTex = THREE.ImageUtils.loadTexture("textures/marble.png");
  clothTex.magFilter = THREE.Linear;
  clothTex.minFilter = THREE.LinearMipMapLinearFilter;
  clothTex.wrapS = THREE.RepeatWrapping;
  clothTex.wrapT = THREE.RepeatWrapping;

  // crystals
  for (var i = 0; i < numSounds; i++) {
    var clipPlane = localPlane[i % localPlane.length];
    var areaPlane = areaPlanes[i % areaPlanes.length];

    // material for main crystal
    var materialData = Object.assign({
      clippingPlanes: [ clipPlane ],
      // clippingPlanes: clipPlanes,
      side: THREE.FrontSide,
      // side: THREE.BackSide,
    }, sharedMaterialData);

    material_sphere[i] = new THREE.MeshPhongMaterial( materialData );
    // material_sphere[i].castShadow = true;
    // material_sphere[i].receiveShadow = true; 

    var crystalPos = new THREE.Vector3(soundPositions[i][0] * 2, soundPositions[i][1] * 2, soundPositions[i][2] * 2);

    // main crystal mesh
    var crystalMesh = new THREE.Mesh( sphereGeom, material_sphere[i] );
    crystalMesh.position.copy(crystalPos);
    
    scene.add( crystalMesh );
    mesh[i] = crystalMesh;

    // inner crystal

    var materialDataInner = Object.assign({
      clippingPlanes: [ clipPlane ],
      // clippingPlanes: clipPlanes,
      side: THREE.BackSide,
      blendEquation: THREE.ReverseSubtractEquation,
      opacity: 0.8,
      // transparent: true,
      // side: THREE.DoubleSide,
      // color: 0x000000,
      map: clothTex,
    }, sharedMaterialData);

    material_sphere[i].innerMat = new THREE.MeshPhongMaterial( materialDataInner );

    var crystalMeshInner = new THREE.Mesh( sphereGeom, material_sphere[i].innerMat );
    crystalMeshInner.position.copy(crystalPos);
    
    scene.add( crystalMeshInner );
    // sceneStencilMask.add( crystalMeshInner );
    mesh[i].inner = crystalMeshInner;

    // material for crystal cap (plane clipped to crystal)

    var capMaterialData = Object.assign({
      // color: 0x000000,
      // map: clothTex,
      // lights: false,
      // side: THREE.FrontSide,
      // side: THREE.BackSide,
      side: THREE.DoubleSide,
    }, sharedMaterialData);

    var unclippedCapMaterialData = Object.assign({
      // side: THREE.FrontSide,
      // side: THREE.BackSide,
      side: THREE.DoubleSide,
      opacity: 1.0,
      transparent: true,
    }, sharedMaterialData);

    // var capMaterial = new THREE.MeshBasicMaterial( capMaterialData );
    var capMaterial = new THREE.MeshPhongMaterial( capMaterialData );
    // var capMaterial = crystalMesh.material; // uncomment for weird clipping stuff
    var unclippedCapMaterial = new THREE.MeshPhongMaterial( unclippedCapMaterialData );
    
    material_sphere[i].capMaterial = capMaterial;
    material_sphere[i].unclippedCapMaterial = unclippedCapMaterial;

    // clipping plane cap mesh
    // for (var j = 0; j < numSounds; j++) {
      var arbitraryVec = new THREE.Vector3(3, 5, 7).normalize();
      var planeAxis0 = clipPlane.normal.clone().cross(arbitraryVec);
      var planeAxis1 = clipPlane.normal.clone().cross(planeAxis0);
      var closestPointOnPlaneToOrigin = clipPlane.normal.clone().multiplyScalar(-clipPlane.constant);


      // geometry just a big quad
      var capGeom = new THREE.Geometry();
      capGeom.vertices.push(
        closestPointOnPlaneToOrigin.clone().sub(planeAxis0.clone().add(planeAxis1).multiplyScalar(crystalRadius * 20)),
        closestPointOnPlaneToOrigin.clone().add(planeAxis0.clone().sub(planeAxis1).multiplyScalar(crystalRadius * 20)),
        closestPointOnPlaneToOrigin.clone().add(planeAxis0.clone().add(planeAxis1).multiplyScalar(crystalRadius * 20)),
        closestPointOnPlaneToOrigin.clone().sub(planeAxis0.clone().sub(planeAxis1).multiplyScalar(crystalRadius * 20)),
      );
      capGeom.faces.push( 
        new THREE.Face3( 0, 1, 2 ),
        new THREE.Face3( 0, 2, 3 ) 
      );
      capGeom.computeFaceNormals();

      capGeom.faceVertexUvs[0] = [];
      capGeom.faceVertexUvs[0].push(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(10, 0),
          new THREE.Vector2(10, 10),
        ],
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(10, 10),
          new THREE.Vector2(0, 10),
        ],
      );
      capGeom.uvsNeedUpdate = true;

      var arbitraryVec = new THREE.Vector3(3, 5, 7).normalize();
      var planeAxis0 = areaPlane.normal.clone().cross(arbitraryVec);
      var planeAxis1 = areaPlane.normal.clone().cross(planeAxis0);
      var closestPointOnPlaneToOrigin = areaPlane.normal.clone().multiplyScalar(-areaPlane.constant);
      var capGeom2 = new THREE.Geometry();
      capGeom2.vertices.push(
        closestPointOnPlaneToOrigin.clone().sub(planeAxis0.clone().add(planeAxis1).multiplyScalar(crystalRadius * 20)),
        closestPointOnPlaneToOrigin.clone().add(planeAxis0.clone().sub(planeAxis1).multiplyScalar(crystalRadius * 20)),
        closestPointOnPlaneToOrigin.clone().add(planeAxis0.clone().add(planeAxis1).multiplyScalar(crystalRadius * 20)),
        closestPointOnPlaneToOrigin.clone().sub(planeAxis0.clone().sub(planeAxis1).multiplyScalar(crystalRadius * 20)),
      );
      capGeom2.faces.push( 
        new THREE.Face3( 0, 1, 2 ),
        new THREE.Face3( 0, 2, 3 ) 
      );
      capGeom2.computeFaceNormals();

      capGeom2.faceVertexUvs[0] = [];
      capGeom2.faceVertexUvs[0].push(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(10, 0),
          new THREE.Vector2(10, 10),
        ],
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(10, 10),
          new THREE.Vector2(0, 10),
        ],
      );
      capGeom2.uvsNeedUpdate = true;

      var newCapMesh = new THREE.Mesh( capGeom, capMaterial );

      var unclippedCapMesh = new THREE.Mesh( capGeom2, unclippedCapMaterial );

      scene.add( newCapMesh );
      // sceneStencilMask.add( newCapMesh );
      scene.add( unclippedCapMesh );
      mesh[i].capMesh = newCapMesh;
    // }

    // CLOTHS
    var clothRenderer = new THREE.WebGLRenderer({ 
      antialias: true,
      devicePixelRatio: window.devicePixelRatio,
      preserveDrawingBuffer: true,
    });
    clothRenderer.autoClear = false;
    clothRenderer.autoClearColor = false;
    clothRenderer.autoClearDepth = false;
    clothRenderer.localClippingEnabled = true;

    clothRenderer.setSize(1000, 1000);
     
    var mainClothSize = 600;
    var group = new ClothBunch(2, fboWidth, fboHeight, null, mainClothSize, {
      // renderer: clothRenderer,
      // flatShading: true,
      // scene: sceneStencilClipped,
      // pinMode: "random",
      // pinChance: 0.003,
      // noRandomRot: true,
      maxDist: (mainClothSize * 0.25)
    });
    group.pos.copy(crystalPos);
    group.colorScheme = "main";
    allClothGroups[i] = group;
  }


  // AUDIO ////////////////////////


  // audio listener and context
  listener = new THREE.AudioListener();
  audioContext = THREE.AudioContext;
  camera.add(listener);



  var EnvelopeGenerator = (function(audioContext) {
    function EnvelopeGenerator() {
      this.attackTime = 3.0;
      this.releaseTime = 3.0;
    };

    EnvelopeGenerator.prototype.trigger = function() {
      now = audioContext.currentTime;
      this.param.cancelScheduledValues(now);
      this.param.setValueAtTime(0, now);
      this.param.linearRampToValueAtTime(1, now + this.attackTime);
      this.param.linearRampToValueAtTime(0, now + this.attackTime + this.releaseTime);
    };

    EnvelopeGenerator.prototype.on = function() {
      now = audioContext.currentTime;
      this.param.cancelScheduledValues(now);

      this.param.setValueAtTime(crystalSoundGain.gain.value, now);
      this.param.linearRampToValueAtTime(1, now + this.attackTime);
      // console.log("on! " + now);
    };

    EnvelopeGenerator.prototype.off = function() {
      now = audioContext.currentTime;
      this.param.cancelScheduledValues(now);
      this.param.setValueAtTime(crystalSoundGain.gain.value, now);
      this.param.linearRampToValueAtTime(0, now + this.releaseTime);
      // console.log("off! " + now);
    };

    EnvelopeGenerator.prototype.connect = function(param) {
      this.param = param;
    };

    return EnvelopeGenerator;
  })(audioContext);


  // envelope
  envelope = new EnvelopeGenerator;


  // convolver and stuff
  convolver = audioContext.createConvolver();
  var reverbGain = audioContext.createGain();
  // grab audio track via XHR for convolver node
  reverbGain.gain.value = myReverbGain;
  var soundSource, SpringReverbBuffer;

  // load reverb audio
  var ajaxRequest = new XMLHttpRequest();
  ajaxRequest.open('GET', reverbSoundFile, true);
  ajaxRequest.responseType = 'arraybuffer';
  
  ajaxRequest.onload = function() {
    var audioData = ajaxRequest.response;
    audioContext.decodeAudioData(audioData, function(buffer) {
        SpringReverbBuffer = buffer;
        convolver.buffer = SpringReverbBuffer;
        convolver.connect(reverbGain);
        reverbGain.connect(audioContext.destination);
        //console.log("reverb Loaded");
        whenLoaded();
      }, function(e){"Error with decoding audio data" + e.err;});
  }
  ajaxRequest.send();

  
  // load crystal sounds
  var audioLoader = new THREE.AudioLoader();

  for (var i = 0; i < numSounds; i++) {
    soundGain[i] = audioContext.createGain();
    
    sound[i] = new THREE.PositionalAudio( listener );
    sound[i].setPanningModel(panModel);
    sound[i].setFilter(soundGain[i]);
    sound[i].setRolloffFactor(2);
    sound[i].setRefDistance(10000);
    mesh[i].add( sound[i] );
    //pointLight[i] = new THREE.PointLight( 0xffffff, .1 );
    //mesh[i].add( pointLight[i] );
    
    analyser[i] = new THREE.AudioAnalyser( sound[i], 32 );
  }
  for (var i = 0; i < numBuffers; i++) {
    audioLoader.load(soundFiles[whichFile[i]], bufferLoader);
  }

  
    crystalSoundGain = audioContext.createGain();
    crystalSoundGain.gain.value = 0.0;
    crystalSoundGain.connect(audioContext.destination);
    crystalSoundGain.connect(convolver);
    crystalSound = audioContext.createBufferSource();
    audioLoader.load(whaleSounds, crystalLoader);
    envelope.connect(crystalSoundGain.gain);



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
var inside = 0;

function update() {
  requestAnimationFrame(update);

  // console.log("" + getSignedDistanceToNearestCrystal() + ", " + getSignedDistanceToNearestCrystalSphere());


  if ((getSignedDistanceToNearestCrystal() < 0) && (inside == false))
  {
    //then we're inside one!
    envelope.on();
    inside = true;
    //console.log("hellllllooooo");
  }
  else if ((getSignedDistanceToNearestCrystal() > 0) && (inside == true))
  {
    envelope.off();
    inside = false;
  }
  // update audio  ///////////////
  var now = audioContext.currentTime;

  if (soundsPlaying == 1)
  {
    if ((loopCount % 100) === 0)
    {
      for (var i = 0; i < numSounds; i++)
      {

        //console.log("check");
        if (waitTimes[i] < (now - prevTime[i]))
        {
          waitTimes[i] = ((Math.random() * waitMax) + waitOffset);
          if (onOff[i] === 0)
          {
            soundGain[i].gain.cancelScheduledValues(now);
            onOff[i] = 1;
            if (volRandom)
            {
              var randomVolume =  Math.random();
              //console.log(randomVolume);
              soundGain[i].gain.setTargetAtTime(((onOff[i] * randomVolume) + .0000001), now+0.001, .3);
            }
            else
            {
              soundGain[i].gain.setTargetAtTime((onOff[i] + .0000001), now+0.001, .3);
            }
            //console.log("on");
            //console.log(i);
          }
          else
          {
            onOff[i] = 0;
            soundGain[i].gain.cancelScheduledValues(now);
            soundGain[i].gain.setTargetAtTime(0.00000001, now, .2);
            //console.log("off");
            //console.log(i);
          }
          prevTime[i] = now;
          
        }
      }
    }
    for (var i = 0; i < numSounds; i++)
    {
      var val = analyser[i].getAverageFrequency() / analyzerDivisor;
      material_sphere[i].emissive.r = val;
      material_sphere[i].emissive.g = val;
      material_sphere[i].emissive.b = val;

      material_sphere[i].innerMat.emissive.r = -val;
      material_sphere[i].innerMat.emissive.g = -val;
      material_sphere[i].innerMat.emissive.b = -val;

      material_sphere[i].unclippedCapMaterial.opacity = 1 - val*val;

      material_sphere[i].unclippedCapMaterial.emissive.r = val;
      material_sphere[i].unclippedCapMaterial.emissive.g = val;
      material_sphere[i].unclippedCapMaterial.emissive.b = val;

      material_sphere[i].capMaterial.emissive.r = val;
      material_sphere[i].capMaterial.emissive.g = val;
      material_sphere[i].capMaterial.emissive.b = val;

      mesh[i].rotation.x += (val* valScalar);
      mesh[i].rotation.z += (val* valScalar);
      mesh[i].rotation.y += (val* valScalar);

      mesh[i].inner.rotation.x = mesh[i].rotation.x;
      mesh[i].inner.rotation.z = mesh[i].rotation.z;
      mesh[i].inner.rotation.y = mesh[i].rotation.y;

      mesh[i].updateMatrixWorld();

      // FIXME: these volumes end up slightly small, not sure why
      var transformedSphereFacePlanes = [];
      for (var j = 0; j < sphereFacePlanes.length; j++) {
        var plane = sphereFacePlanes[j].clone();
        var translatedPlane = plane.applyMatrix4(mesh[i].matrixWorld);
        translatedPlane.negate();
        // translatedPlane.constant *= 1.1; // HACK
        transformedSphereFacePlanes[j] = translatedPlane;
      }

      material_sphere[i].capMaterial.clippingPlanes = transformedSphereFacePlanes;

      // var clothBunch = allClothGroups[i];
      // for (var j = 0; j < clothBunch.numCloths; j++) {
      //   var cloth = clothBunch.cloths[j];
      //   cloth.renderMaterial.clipping = true
      //   cloth.renderMaterial.clippingPlanes = transformedSphereFacePlanes;
      // }
      
    }
    loopCount++;
  }

  // update cloths //////////
  for (var groupIdx = 0; groupIdx < allClothGroups.length; groupIdx++) {
    allClothGroups[groupIdx].update(camera, []);
  }

  // update particles  ///////////////
  var pCount = particleCount;
  while (pCount--) {

    // get the particle
    var particle =
      particles.vertices[pCount];

    // wrap around space
    if (particle.y < -500) {
      particle.y = 500;
    }
    if (particle.x < -500) {
      particle.x = 500;
    }
    if (particle.z < -500) {
      particle.z = 500;
    }
    if (particle.y > 500) {
      particle.y = -500;
    }
    if (particle.x > 500) {
      particle.x = -500;
    }
    if (particle.z > 500) {
      particle.z = -500;
    }
    
    particle.velocity.x += (Math.random() * .02) - .01;
    particle.velocity.y += (Math.random() * .02) - .01;
    particle.velocity.z += (Math.random() * .02) - .01;

    particle.add(particle.velocity);
  }
  particleSystem.geometry.verticesNeedUpdate = true;

  // update controls
  if (controlsEnabled) {
    var delta = clock.getDelta();
    controls.update(delta);
  }

  renderer.clear();
  
  // render
  // renderer.render(scene, camera);


  // var gl = renderer.context;


  // depth prepass
  // renderer.render( scene, camera );
  // renderer.clearColor();

  // enable stencil test
  // renderer.state.setStencilTest( true );

  // config the stencil buffer to collect data for testing
  // renderer.state.setStencilFunc( gl.ALWAYS, 1, 0xff );
  // renderer.state.setStencilOp( gl.KEEP, gl.KEEP, gl.REPLACE );

  // render shape for stencil test
  // renderer.render( sceneStencilMask, camera );

  // set stencil buffer for testing
  // renderer.state.setStencilFunc( gl.EQUAL, 1, 0xff );
  // renderer.state.setStencilOp( gl.KEEP, gl.KEEP, gl.KEEP );

  // render inner crystal scene
  // renderer.render( sceneStencilClipped, camera );
  // renderer.render( scene, camera );

  // disable stencil test
  // renderer.state.setStencilTest( false );

  renderer.toneMappingExposure = Math.pow( bloomParams.exposure, 4.0 );
  composer.render();
}


function getNearestCrystalIdx() {
  var nearestIdx = -1;
  var nearestDist = Infinity;
  
  for (var i = 0; i < numSounds; i++) {
    var dist = mesh[i].position.distanceTo(camera.position);
    if (dist <= nearestDist) {
      nearestDist = dist;
      nearestIdx = i;
    }
  }

  return nearestIdx;
}

// returns distance from camera to surface of nearest crystal (including clipping plane)
// negative distance means inside crystal
// relies on correct face normals
function getSignedDistanceToNearestCrystal() {
  
  return getSignedDistanceToNearestCrystalSphere();

  // var idx = getNearestCrystalIdx();
  
  // var geom = mesh[idx].geometry;
  // var crystalPos = mesh[idx].position;
  // var crystalWorldMatrix = mesh[idx].matrixWorld;
  // var clipPlane = localPlane[idx];

  // var leastSignedDist = Infinity;

  // var cameraPos = camera.position;
  // var cameraPosArr = [cameraPos.x, cameraPos.y, cameraPos.z];

  // // get signed dist to mesh (ignoring clipping plane)
  // // by checking dist to each face
  // for (var faceIdx = 0; faceIdx < geom.faces.length; faceIdx++) {
  //   var face = geom.faces[faceIdx];
    
  //   // get face vertices in world space
  //   var v0 = geom.vertices[face.a].clone().applyMatrix4(crystalWorldMatrix);
  //   var v0Arr = [v0.x, v0.y, v0.z];
    
  //   var v1 = geom.vertices[face.b].clone().applyMatrix4(crystalWorldMatrix);
  //   var v1Arr = [v1.x, v1.y, v1.z];

  //   var v2 = geom.vertices[face.c].clone().applyMatrix4(crystalWorldMatrix);
  //   var v2Arr = [v2.x, v2.y, v2.z];
    
  //   var closestPt = [];

  //   // get unsigned dist
  //   var unsignedDist2 = ClosestPointOnTriangle(v0Arr, v1Arr, v2Arr, cameraPosArr, closestPt);
  //   var unsignedDist = Math.sqrt(unsignedDist2);

  //   // if it's new closest, get signed dist
  //   if (unsignedDist < Math.abs(leastSignedDist)) {
  //     var closestPtVec = new THREE.Vector3(closestPt[0], closestPt[1], closestPt[2]);
  //     var vecToCamera = cameraPos.clone().sub(closestPtVec);
  //     var signedDist = unsignedDist * (face.normal.dot(vecToCamera) > 0 ? 1 : -1);

  //     leastSignedDist = signedDist;
  //   }
  // }


  // // if inside mesh, check against clipping plane
  // if (leastSignedDist <= 0) {
  //   // plane.distanceToPoint returns signed dist, but may be wrong way depending on how plane normal is (manually) defined
  //   var unsignedDist = Math.abs(clipPlane.distanceToPoint(cameraPos));

  //   var vecCrystalToCamera = camera.position.clone().sub(mesh[idx].position);

  // FIXME this is incorrect since clip planes are in world coordssssssss
  //   var outwardClipNormal = clipPlane.normal.clone().negate();

  //   var outsideClip = outwardClipNormal.dot(vecCrystalToCamera);
  //   var signedDist = unsignedDist * (outsideClip ? 1 : -1);

  //   if (Math.abs(signedDist) < Math.abs(leastSignedDist)) {
  //     leastSignedDist = signedDist
  //   }
  // }

  return leastSignedDist;
}

function getSignedDistanceToNearestCrystalSphere() {

  var idx = getNearestCrystalIdx();  
  var signedDistToNearestCrystalSphere = mesh[idx].position.distanceTo(camera.position) - crystalRadius;

  return signedDistToNearestCrystalSphere;
}

function whenLoaded()
{
  soundsLoaded++;
  var now = audioContext.currentTime;
  //console.log(now);
  
  //(numBuffers + 1) because the convolution buffer should also call this function
  if (soundsLoaded == (numBuffers + 1))
  {
    soundsLoaded = 0;
    
    for (var i = 0; i < numSounds; i++)
    {
      soundGain[i].gain.setValueAtTime(0,now);
      
      //sound1.connect(masterGain); 
      sound[i].play();
      
      prevTime[i] = now;
      waitTimes[i] = ((Math.random() * waitMax) + waitOffset);
      //console.log(i);
      //console.log(waitTimes[i]);
      onOff[i] = Math.round(Math.random());
      //console.log(onOff[i]);
      if (volRandom)
      {
        soundGain[i].gain.setTargetAtTime(((onOff[i] * (Math.random())*2) + .0000001), now+0.001, 5);
      }
      else
      {
        soundGain[i].gain.setTargetAtTime((onOff[i] + .0000001), now+0.001, 5);
      }
      soundsPlaying = 1;
      //masterGain.gain.setTargetAtTime(1, now+1,1);
    }
  }
}

function bufferLoader(buffer) 
{
  for (var j = 0; j < (numSounds/numBuffers); j++)
  {
    if (sound[bufferCounter]) {
      sound[bufferCounter].setBuffer( buffer );
      sound[bufferCounter].setRefDistance( refDist );
      sound[bufferCounter].setLoop(true);
      sound[bufferCounter].setStartTime(Math.random()*((buffer.length / 44100) - 6));
      sound[bufferCounter].setPlaybackRate(ratios[Math.round(Math.random() * (ratios.length - 1))]);
      sound[bufferCounter].panner.connect(convolver);
    }
    bufferCounter++
  }
  whenLoaded();
}


function crystalLoader(buffer) 
{
    crystalSound.buffer = buffer;
    crystalSound.loop = true;
    crystalSound.playbackRate.value = (Math.random() * .3) + .5;
    crystalSound.connect(crystalSoundGain);
    crystalSound.start(0);
}


///////////////////////////////////////////////////////////////////////////////////
// clipping stuff for creating clipped cap geometry for clipped off bits of crystals
// modified from https://threejs.org/examples/#webgl_clipping_advanced


function planesFromGeometry( geometry ) {

  var verts = geometry.vertices;
  var faces = geometry.faces;

  var result = new Array( faces.length );

  for ( var i = 0; i < faces.length; i++ ) {
    
    var face = faces[i];

    var v0 = verts[face.a];
    var v1 = verts[face.b];
    var v2 = verts[face.c];

    result[ i ] = new THREE.Plane().setFromCoplanarPoints( v0, v1, v2 );
  }

  return result;
}

function planesFromMesh( vertices, indices ) {
  // creates a clipping volume from a convex triangular mesh
  // specified by the arrays 'vertices' and 'indices'

  var n = indices.length / 3,
    result = new Array( n );

  for ( var i = 0, j = 0; i < n; ++ i, j += 3 ) {

    var a = vertices[ indices[   j   ] ],
      b = vertices[ indices[ j + 1 ] ],
      c = vertices[ indices[ j + 2 ] ];

    result[ i ] = new THREE.Plane().
        setFromCoplanarPoints( a, b, c );

  }

  return result;

}

function createPlanes( n ) {
  // creates an array of n uninitialized plane objects

  var result = new Array( n );

  for ( var i = 0; i !== n; ++ i )
    result[ i ] = new THREE.Plane();

  return result;

}

function assignTransformedPlanes( planesOut, planesIn, matrix ) {
  // sets an array of existing planes to transformed 'planesIn'

  for ( var i = 0, n = planesIn.length; i !== n; ++ i )
    planesOut[ i ].copy( planesIn[ i ] ).applyMatrix4( matrix );

}

function cylindricalPlanes( n, innerRadius ) {

  var result = createPlanes( n );

  for ( var i = 0; i !== n; ++ i ) {

    var plane = result[ i ],
      angle = i * Math.PI * 2 / n;

    plane.normal.set(
        Math.cos( angle ), 0, Math.sin( angle ) );

    plane.constant = innerRadius;

  }

  return result;

}

var planeToMatrix = ( function() {
  // creates a matrix that aligns X/Y to a given plane

  // temporaries:
  var xAxis = new THREE.Vector3(),
    yAxis = new THREE.Vector3(),
    trans = new THREE.Vector3();

  return function planeToMatrix( plane ) {

    var zAxis = plane.normal,
      matrix = new THREE.Matrix4();

    // Hughes & Moeller '99
    // "Building an Orthonormal Basis from a Unit Vector."

    if ( Math.abs( zAxis.x ) > Math.abs( zAxis.z ) ) {

      yAxis.set( -zAxis.y, zAxis.x, 0 );

    } else {

      yAxis.set( 0, -zAxis.z, zAxis.y );

    }

    xAxis.crossVectors( yAxis.normalize(), zAxis );

    plane.coplanarPoint( trans );
    return matrix.set(
      xAxis.x, yAxis.x, zAxis.x, trans.x,
      xAxis.y, yAxis.y, zAxis.y, trans.y,
      xAxis.z, yAxis.z, zAxis.z, trans.z,
        0,    0,    0,      1 );

  };

} )();
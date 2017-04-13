"use strict";

// MISC VARS

var DEVMODE = true;

var clock = new THREE.Clock();
var start = Date.now();

// VISUALS VARS

var camera, controls, scene, renderer, uniforms;
var waveMagnitudes = [2,5,6,7];
var skyMat = [];
var meshes = [];
var material = [];
var effectFXAA, bloomPass, renderScene;
var composer;

var guiParams = {
  exposure: 1.0,
  bloomThreshold: 0.38,
  bloomStrength: 0.2,
  bloomRadius: 0.63,
};

// CONTROLS VARS
var moveSpeed = 10;
var runningEnabled = DEVMODE;

var pointerLocked = false;
var running = false;
var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;
var moveUp = false;
var moveDown = false;
var canJump = false;

var prevTickTime = performance.now();
var velocity = new THREE.Vector3();


// AUDIO VARS

var convolver;
var audioContext, listener;
var soundsLoaded = 0;
var curSoundSource;
var curSoundFile;
var soundGains = [];
var sounds = [];
var loadedSounds = {};
var analysers = [];
var audioLoader;
var waitTimes = [], prevTime = [], onOff = [];

var soundsPlaying = false;
var loopCount = 0;
var noiseSound;


// VISUALS CONSTANTS
const NUMBER_OF_WAVES = 5;
const NUMBER_OF_DOMES = 5;

const PALETTES = [[75,0,0], [72,26,19], [113,0,1], [112,16,17], [81,48,38], [103,38,25], [82,65,62], [147,0,2], [126,54,59], [107,70,58], [165,22,23], [171,5,10], [173,36,35], [147,71,65], [187,57,42], [128,95,84], [138,112,106], [161,104,93], [202,93,55], [208,150,132], [109,51,20], [81,72,14], [102,84,27], [185,100,0], [187,107,61], [214,96,7], [193,113,9], [183,121,40], [155,135,101], [152,144,138], [177,139,75], [196,131,92], [227,119,54], [198,141,51], [212,134,25], [172,152,142], [234,139,72], [204,154,84], [174,164,158], [223,157,62], [232,150,93], [211,164,111], [208,183,143], [233,203,160], [123,124,101], [185,191,188], [73,99,105], [76,122,137], [138,157,154], [14,19,40], [1,31,50], [26,31,52], [25,42,79], [2,63,91], [18,79,127], [53,84,111], [110,116,125], [173,175,181], [6,2,20], [57,53,61], [88,84,92], [103,99,105], [48,25,34], [170,135,146]];
const BACKGROUND_COLOR = 0x0;

// Randomly select from a variety of color palettes for the scene
function getRandomPaletteColor() {
  var myIndex = (Math.round(Math.random() * (PALETTES.length - 1)));
  var myColor = PALETTES[myIndex];
  return ((myColor[0] << 16) + (myColor[1] << 8) + myColor[2]);
}
function getRandomThreePaletteColor() {
  var myIndex = (Math.round(Math.random() * (PALETTES.length - 1)));
  var col = PALETTES[myIndex];
  // return new THREE.Vector3(col[0], col[1], col[2]);
  return new THREE.Color(col[0]/255, col[1]/255, col[2]/255);
}

const WORLD_WIDTH = 40, WORLD_DEPTH = 40;

// AUDIO CONSTANTS

const REVERB_SOUND_FILE = './reverbs/BX20E103.wav';
const NOISE_SOUND_FILE = './sounds/synthnoise.ogg';

const PAN_MODEL = 'equalpower';

const NUMBER_OF_SOUND_SOURCES = 4;
const SOUND_POSITIONS = [[-10000,30,0], [10000,80,0], [0,0,-10000],[0,-50,10000], [-5000,30,5000], [5000,80,5000],[-5000, 0, -5000], [5000, -50, -5000]];

const REVERB_GAIN = 1.0;
const REF_DIST = 10000;

const WAIT_MAX = 20;
const WAIT_OFFSET = 4;
const RANDOM_VOLUME = true;
const MAX_VOLUME = 5.0;
const ANALYSER_DIVISOR = 16;

const AUDIO_ENABLED = true;

const GUI_ENABLED = false;

var testCloths = [];

////////////////////////////////////////////////////////////////////////////////////////////////
//     INIT AND RUN
////////////////////////////////////////////////////////////////////////////////////////////////

window.onload = function() {
  var sl = new ShaderLoader();
  sl.loadShaders({
    posNoise_vert : "",
    posNoise_frag : "",

    posUpdate_vert : "",
    posUpdate_frag : "",

    velUpdate_vert : "",
    velUpdate_frag : "",

    render_vert : "",
    render_frag : "",
  }, "./glsl/", init );
};

function init()
{
  initVisualElements();
  if (AUDIO_ENABLED) {
    initAudioElements();
  }
  initControlElements();
  // Listen for window resizing
  window.addEventListener('resize', onWindowResize, false);

  render();
}

// Renders a frame
function render()
{
  requestAnimationFrame(render);

  var time = performance.now();
  var delta = ( time - prevTickTime ) / 1000;

  velocity.x -= velocity.x * 10.0 * delta;
  velocity.y -= velocity.y * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;

  // velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

  if ( moveForward ) velocity.z -= 400.0 * delta;
  if ( moveBackward ) velocity.z += 400.0 * delta;

  if ( moveLeft ) velocity.x -= 400.0 * delta;
  if ( moveRight ) velocity.x += 400.0 * delta;
  
  if ( moveUp ) velocity.y += 400.0 * delta;
  if ( moveDown ) velocity.y -= 400.0 * delta;

  var speed = moveSpeed * (running ? 5 : 1);
  controls.getObject().translateX( velocity.x * delta * speed );
  controls.getObject().translateY( velocity.y * delta * speed );
  controls.getObject().translateZ( velocity.z * delta * speed );

  prevTickTime = time;


  if (AUDIO_ENABLED) {
    renderAudio();
  }
  renderVisuals();
}

// Properly handle window resizing
function onWindowResize()
{
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  // renderer.setClearColor(BACKGROUND_COLOR);
  // renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
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

////////////////////////////////////////////////////////////////////////////////////////////////
//     VISUALS STUFF
////////////////////////////////////////////////////////////////////////////////////////////////



function initControlElements()
{
  // controls = new THREE.FirstPersonControls(camera, renderer.domElement);
  // controls.movementSpeed = 10000;
  // controls.lookSpeed = 0.1;
  // // controls.lookSpeed = 0;
  // controls.noFly = true;

  // controls.lookVertical = false;
  // controls.activeLook = false;
  // controls.freeze = true;

  controls = new THREE.PointerLockControls(camera);
  scene.add(controls.getObject());
  // controls.getObject().position.set(0, -10000, 30000);
  controls.enabled = true;

  var element = document.body;

  var onKeyDown = function ( event ) {

    switch ( event.keyCode ) {
      case 16: // SHIFT
        running = runningEnabled; break;
      case 38: // up
      case 87: // w
        moveForward = true; break;
      case 37: // left
      case 65: // a
        moveLeft = true; break;
      case 40: // down
      case 83: // s
        moveBackward = true; break;
      case 39: // right
      case 68: // d
        moveRight = true; break;
      case 69: // e
        moveUp = true; break;      
      case 67: // c
        moveDown = true; break;
    }

  };

  var onKeyUp = function ( event ) {

    switch( event.keyCode ) {

      case 16: // SHIFT
        running = false; break;
      case 38: // up
      case 87: // w
        moveForward = false; break;
      case 37: // left
      case 65: // a
        moveLeft = false; break;
      case 40: // down
      case 83: // s
        moveBackward = false; break;
      case 39: // right
      case 68: // d
        moveRight = false; break;
      case 69: // e
        moveUp = false; break;      
      case 67: // c
        moveDown = false; break;
    }

  };

  document.addEventListener( 'keydown', onKeyDown, false );
  document.addEventListener( 'keyup', onKeyUp, false );


  // pointer lock
  var canvas = document.querySelector('canvas');
  var ctx = canvas.getContext('2d');

  canvas.requestPointerLock = canvas.requestPointerLock ||
                              canvas.mozRequestPointerLock;

  document.exitPointerLock = document.exitPointerLock ||
                             document.mozExitPointerLock;

  canvas.onclick = function() {
    canvas.requestPointerLock();
  };

  document.addEventListener('pointerlockchange', lockChangeAlert, false);
  document.addEventListener('mozpointerlockchange', lockChangeAlert, false);

  controls.enabled = pointerLocked;
}


function lockChangeAlert() {
  var canvas = document.querySelector('canvas');

  pointerLocked = document.pointerLockElement === canvas || document.mozPointerLockElement === canvas;

  controls.enabled = pointerLocked;
}

function initVisualElements()
{
  // SCENE
  camera = new THREE.PerspectiveCamera( 74, window.innerWidth / window.innerHeight, 10, 100000 );
  camera.position.set( 0, -400, 300 );
  // camera.lookAt(new THREE.Vector3(0, 0, 0));
  scene = new THREE.Scene();

  // RENDERER //////////////////////////
  renderer = new THREE.WebGLRenderer({ 
    // antialias: true,
    preserveDrawingBuffer: true,
    gammaInput: true,
    gammaOutput: true,
  });
  renderer.setClearColor( getRandomPaletteColor() );

  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  THREEx.Screenshot.bindKey(renderer);

  document.body.appendChild( renderer.domElement );

  var viewportWidth = window.innerWidth;
  var viewportHeight = window.innerHeight;

  // CLOTHS //////////////////////////
  // var clothTex = THREE.ImageUtils.loadTexture("textures/marble.png");
  // // var clothTex = THREE.ImageUtils.loadTexture("textures/gridTex.jpg");
  // // var clothTex = THREE.ImageUtils.loadTexture("textures/grungy/4559510781_4e94a042b2_o_b.jpg");
  // // var clothTex = THREE.ImageUtils.loadTexture("textures/grungy/4086773135_2dde2925c1_o.jpg");
  // clothTex.wrapS = THREE.RepeatWrapping;
  // clothTex.wrapT = THREE.RepeatWrapping;
  // clothTex.anisotropy = 16;

  var sideOptions = {
    flatShading: false,
    color: new THREE.Color(0.5, 1, 0.5),
    pinMode: "random",
    noTex: true,
    noRandomRot: true,
    // backfaceMode: THREE.BackSide,
    initPosMult: 1,
    pinChance: 0.22,
    keepCentered: false,
    flagss: [
      [ "integrateVel", ],

      // [ "SHEAR_PASS_1", "SHEAR_CONSTRAINTS_ENABLED", ],
      // [ "SHEAR_PASS_2", "SHEAR_CONSTRAINTS_ENABLED", ],
      // [ "SHEAR_PASS_3", "SHEAR_CONSTRAINTS_ENABLED", ],
      // [ "SHEAR_PASS_4", "SHEAR_CONSTRAINTS_ENABLED", ],

      [ "BEND_PASS_1", ],
      [ "BEND_PASS_2", ],
      [ "STRETCH_PASS_H_1", ],
      [ "STRETCH_PASS_H_2", ],

      [ "BEND_PASS_3", ],
      [ "BEND_PASS_4", ],
      [ "STRETCH_PASS_V_2", ],
      [ "STRETCH_PASS_V_1", ],
    ],
  };

  var clothRes = 80;
  var clothSize = 1600;
  for (var i = 0; i < NUMBER_OF_WAVES; i++) {
    var opts = Object.assign({}, sideOptions);
    opts.renderDefines = {
      // DISCARD_DIST: getDomeRadius(NUMBER_OF_DOMES - 1) + 0.1,
      DISCARD_DIST: getDomeRadius(0) + 0.1,
    };
    opts.color = getRandomThreePaletteColor();
    var newCloth = new ClothBunch(1, clothRes, clothRes, null, clothSize, opts);
    newCloth.colorScheme = "fixed";
    // newCloth.rootNode.rotation.x = -Math.PI / 2;
    // newCloth.rootNode.rotation.z = Math.PI * 2 * (i / NUMBER_OF_WAVES);
    newCloth.pos.y = 500;
    
    testCloths.push(newCloth);
  }

  // for (var i = 0; i < NUMBER_OF_WAVES; i++) {
  //   var opts = Object.assign({}, sideOptions);
  //   // opts.color = HSVtoRGB(0.5, 1, 0.5);
  //   opts.color = testCloths[i].options.color;
  //   var newCloth = new ClothBunch(1, clothRes * 0.75, clothRes * 0.75, null, clothSize * 3, opts);
  //   newCloth.colorScheme = "fixed";
  //   newCloth.rootNode.rotation.x = -Math.PI / 2;
  //   newCloth.rootNode.rotation.z = Math.PI * 2 * (i / NUMBER_OF_WAVES);
  //   newCloth.pos.y = 1200;

  //   testCloths.push(newCloth);
  // }

  // POST FX //////////////////////////
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

  // GUI (FX TUNING) //////////////////////////
  if (GUI_ENABLED) {
    var gui = new dat.GUI();

    gui.add( guiParams, 'exposure', 0.1, 2 );
    gui.add( guiParams, 'bloomThreshold', 0.0, 1.0 ).onChange( function(value) {
        bloomPass.threshold = Number(value);
    });
    gui.add( guiParams, 'bloomStrength', 0.0, 3.0 ).onChange( function(value) {
        bloomPass.strength = Number(value);
    });
    gui.add( guiParams, 'bloomRadius', 0.0, 1.0 ).onChange( function(value) {
        bloomPass.radius = Number(value);
    });
    gui.open();
  }

  // LIGHTS //////////////////////////
  scene.fog = new THREE.FogExp2( getRandomPaletteColor(), 0.0001 );

  // DOMES //////////////////////////
  var skyGeo = [];
  var dome = [];
  for (var j = 0; j < NUMBER_OF_DOMES; j++)
  {
    uniforms = {
      topColor:    { value: new THREE.Color( getRandomPaletteColor() ) },
      bottomColor: { value: new THREE.Color( getRandomPaletteColor() ) },
      offset:      { value: -33 },
      exponent:    { value: 0.6 },
      time: {type: "f", value: 0.0 },
      amp: {type: "f", value: 500.0 },
      bscalar: {type: "f", value: -5.0 },
      positionscalar: {type: "f", value: .05 },
      turbulencescalar: {type: "f", value: .5 }
    };
    skyGeo[j] = new THREE.IcosahedronGeometry( getDomeRadius(j), 3 );
    // skyGeo[j] = new THREE.SphereGeometry( getDomeRadius(j), 100 );
    skyMat[j] = new THREE.MeshBasicMaterial( {
      color: 0x505000,
      side: THREE.BackSide,
    } );
    // skyMat[j] = new THREE.ShaderMaterial({ 
    //   vertexShader: ShaderLoader.get( "posNoise_vert" ), 
    //   fragmentShader: ShaderLoader.get( "posNoise_frag" ), 
    //   uniforms: uniforms, 
    //   side: THREE.BackSide 
    // });
    dome[j] = new THREE.Mesh( skyGeo[j], skyMat[j] );
    scene.add( dome[j] );
  }

  // WAVES //////////////////////////
  var geometry = [];
  for (j = 0; j < NUMBER_OF_WAVES; j++)
  {
    geometry[j] = new THREE.PlaneGeometry( 100000, 100000, WORLD_WIDTH - 1, WORLD_DEPTH - 1 );
    geometry[j].rotateX( - Math.PI / 2 );
    geometry[j].rotateY(Math.random() * 3.14 );
    uniforms = {
      topColor:    { value: new THREE.Color(  getRandomPaletteColor() ) },
      bottomColor: { value: new THREE.Color(  getRandomPaletteColor() ) },
      offset:      { value: 0 },
      exponent:    { value: 0.6 },
      time: {type: "f", value: 0.0 },
      amp: {type: "f", value: 500.0 },
      bscalar: {type: "f", value: -5.0 },
      positionscalar: {type: "f", value: 0.05 },
      turbulencescalar: {type: "f", value: 0.5 },
    };
    material[j] = new THREE.ShaderMaterial({ 
      vertexShader: ShaderLoader.get( "posNoise_vert" ), 
      fragmentShader: ShaderLoader.get( "posNoise_frag" ), 
      uniforms: uniforms, 
      side: THREE.DoubleSide,
    });
    // material[j] = new THREE.MeshBasicMaterial({ 
    //   color: new THREE.Color(getRandomPaletteColor()) ,
    // });
    // material[j].uniforms = {
    //   time: {},
    //   amp: {},
    // };
    meshes[j] = new THREE.Mesh( geometry[j], material[j] );
    // scene.add( meshes[j] );
  }
}

function getDomeRadius(domeIdx) {
  return 2000*(domeIdx+1);
}

// NOTE: call AFTER renderAudio()
function renderVisuals() {

  for (var i = 0; i < testCloths.length; i++) {
    testCloths[i].update(camera, []);
  }

  for (var j = 0; j < NUMBER_OF_WAVES; j++)
  {
    // Update the ceiling visualizers
    for (var i = 0; i < NUMBER_OF_SOUND_SOURCES; i++)
    {
      // Ensure we don't try use an analyser for a sound not yet loaded
      if (analysers[i] != undefined)
      {
        waveMagnitudes[i] = analysers[i].getAverageFrequency() / ANALYSER_DIVISOR;
      }
    }

    // material[j].uniforms[ 'time' ].value = (Date.now() - start);
    // material[j].uniforms[ 'bscalar' ].value = 0;
    material[j].uniforms[ 'time' ].value = .000025 * (j + 1) *( Date.now() - start );
    // material[j].uniforms[ 'bscalar' ].value = waveMagnitudes[j] * 1 + 50;
    material[j].uniforms[ 'amp' ].value = (waveMagnitudes[j] * 1 + 50);
  }

  for (var j = 0; j < NUMBER_OF_DOMES; j++)
  {
    // skyMat[j].uniforms[ 'time' ].value = .000025 * (j + 1) *( Date.now() - start );
  }

  // controls.update(clock.getDelta());
	// renderer.render(scene, camera);
  renderer.toneMappingExposure = Math.pow( guiParams.exposure, 4.0 );
  composer.render();
}

////////////////////////////////////////////////////////////////////////////////////////////////
//     AUDIO STUFF
////////////////////////////////////////////////////////////////////////////////////////////////

// Initialize the (all important) audio elements of the piece
function initAudioElements() {
  // Create invisible spheres to attach the audio to (convenience)
  var sphere = new THREE.SphereGeometry(100, 3, 2);
  var material_spheres = [];
  for (var i = 0; i < NUMBER_OF_SOUND_SOURCES; i++)
  {
    //bumpMap: mapHeight, bumpScale: 10
    material_spheres[i] = new THREE.MeshPhongMaterial( { color: 0xffffff,
                                                        shininess: 10,
                                                        side: THREE.DoubleSide,
                                                        opacity:.8} );
    material_spheres[i].castShadow = false;
    material_spheres[i].receiveShadow = false;
    material_spheres[i].visible = false;
  }
  // Init audio context
  listener = new THREE.AudioListener();
  audioContext = THREE.AudioContext;
  // Attach audio listener to our moving camera
  camera.add(listener);

  convolver = audioContext.createConvolver();
  var reverbGain = audioContext.createGain();
  // grab audio track via XHR for convolver node
  // BUG NOTE: Directly setting gain.value (like this) does not work in the p5.editor
  reverbGain.gain.value = REVERB_GAIN;
  var soundSource, SpringReverbBuffer;

  var ajaxRequest = new XMLHttpRequest();
  ajaxRequest.open('GET', REVERB_SOUND_FILE, true);
  ajaxRequest.responseType = 'arraybuffer';

  ajaxRequest.onload = function() {
    var audioData = ajaxRequest.response;
    audioContext.decodeAudioData(audioData, function(buffer) {
        SpringReverbBuffer = buffer;
        convolver.buffer = SpringReverbBuffer;
        convolver.connect(reverbGain);
        reverbGain.connect(audioContext.destination);
        whenLoaded();
      }, function(e) {"Error with decoding audio data" + e.err;});
  }
  ajaxRequest.send();

  // Create central noise sound and add it to the scene via noiseMesh
  var noiseMesh = new THREE.Mesh(sphere, material_spheres[0]);
  noiseMesh.position.set(0, 0, 0);
  scene.add(noiseMesh);
  noiseSound = new THREE.PositionalAudio(listener);

  // noiseSound.setPanningModel(PAN_MODEL);
  noiseSound.setFilter(soundGains[i]);
  noiseSound.setRolloffFactor(0);
  noiseMesh.add(noiseSound);

  // Setup each of the sound sources
  for (var i = 0; i < NUMBER_OF_SOUND_SOURCES; i++)
  {
    meshes[i] = new THREE.Mesh(sphere, material_spheres[i] );
    meshes[i].position.set( SOUND_POSITIONS[i][0], SOUND_POSITIONS[i][1], SOUND_POSITIONS[i][2] );
    scene.add( meshes[i] );
    soundGains[i] = audioContext.createGain();
  }

  // Create an audio loader for the piece and load the noise sound into it
  audioLoader = new THREE.AudioLoader();
  audioLoader.load(NOISE_SOUND_FILE, noiseLoader);
}

// Not actually 'rendering' audio, but all the audio stuff that is done in the render step
function renderAudio() {
  var now = audioContext.currentTime;

  if (soundsPlaying)
  {
    if ((loopCount % 100) === 0)
    {
      for (var i = 0; i < NUMBER_OF_SOUND_SOURCES; i++)
      {
        if (waitTimes[i] < (now - prevTime[i]))
        {
          // Play a random sound from this soundsource
          playRandomSound(i);
          waitTimes[i] = ((Math.random() * WAIT_MAX) + WAIT_OFFSET);
          prevTime[i] = now;
        }
      }
    }
    loopCount++;
  }
}

// Choose, load, and play a random sound file in the given source index
function playRandomSound(soundSourceIndex) {
  if (soundSourceIndex > 3) {
    throw new Error('Invalid soundSourceIndex passed to playRandomSound');
  }
  // Set this as a global so it is accessible by the bufferloader
  // Probably can just add a param to bufferLoader but I'll test that later
  // I'm not 100% on how THREE.js loaders work
  curSoundSource = soundSourceIndex;
  var now = audioContext.currentTime;

  var maxIndex;
  var minIndex = 1; // The soundfile indices start at 1
  var fileType = '.mp3';
  var randomFile = './sounds/'; // Our sound bits are in the /sounds directory

  // Decide if picking from 'L' or 'R' sampleset
  if (soundSourceIndex  % 2 === 0) {
    randomFile += 'L/S-';
    maxIndex = 118; // There are 118 L sound bits from our split up soundfile
  } else {
    randomFile += 'R/S-';
    maxIndex = 198; // There are 198 R sound bits from our split up soundfile`
  }
  // Get the soundfile number, append it and the filetype
  randomFile += Math.floor(Math.random() * (maxIndex - minIndex + 1)) + minIndex;
  randomFile += fileType;
  curSoundFile = randomFile;

  if (RANDOM_VOLUME)
  {
    // BUG NOTE: Directly setting gain.value (like this) does not work in the p5.editor
    soundGains[curSoundSource].gain.value = Math.random() * MAX_VOLUME + 0.0000001;
  }

  if (loadedSounds[curSoundFile] === undefined)
  {
    audioLoader.load(curSoundFile, bufferLoader);
  }
  else
  {
    sounds[curSoundSource] = loadedSounds[curSoundFile];
    sounds[curSoundSource].startTime = 0;
    sounds[curSoundSource].play();
  }
}

// Loader function for THREE.js to load audio
function bufferLoader(buffer)
{
  var index = curSoundSource;
  // Create a new sound so we can have a new sound buffer
  sounds[index] = new THREE.PositionalAudio( listener );
  // sounds[index].setPanningModel(PAN_MODEL);
  sounds[index].setFilter(soundGains[index]);
  // sounds[index].setRolloffFactor(2);

  sounds[index].setBuffer(buffer);
  sounds[index].setRefDistance(REF_DIST);
  sounds[index].setLoop(false);
  sounds[index].startTime = 0;
  sounds[index].setPlaybackRate(1);
  sounds[index].panner.connect(convolver);
  
  // meshes[index].add(sounds[index]);

  analysers[index] = new THREE.AudioAnalyser(sounds[index], 32);
  // Add the sound to the object map
  loadedSounds[curSoundFile] = sounds[index];
  sounds[index].play();
}

// Loader function for THREE.js to load audio, specifically for the noise source
function noiseLoader(buffer)
{
  noiseSound.setBuffer(buffer);
  noiseSound.setRefDistance(100);
  noiseSound.setLoop(true);
  noiseSound.startTime = (Math.random()*((buffer.length / 44100) - 6));
  noiseSound.setPlaybackRate(.7);
  noiseSound.panner.connect(convolver);
  whenLoaded();
}

// Called when noise and the convolver are loaded
function whenLoaded()
{
  soundsLoaded++;
  var now = audioContext.currentTime;

  // Once both the convolver and noise are loaded
  if (soundsLoaded == 2)
  {
    soundsLoaded = 0;

    for (var i = 0; i < NUMBER_OF_SOUND_SOURCES; i++)
    {
      // BUG NOTE: Directly setting gain.value (like this) does not work in the p5.editor
      soundGains[i].gain.value = 0;

      prevTime[i] = now;
      waitTimes[i] = ((Math.random() * WAIT_MAX) + WAIT_OFFSET);
      onOff[i] = Math.round(Math.random()); // NOTE(drew) was used in original but isn't now?

      if (RANDOM_VOLUME)
      {
        // BUG NOTE: Directly setting gain.value (like this) does not work in the p5.editor
        soundGains[i].gain.value = Math.random() * MAX_VOLUME + 0.0000001;
      }
      else
      {
        // BUG NOTE: Directly setting gain.value (like this) does not work in the p5.editor
        soundGains[i].gain.value = MAX_VOLUME + 0.0000001;
      }
      soundsPlaying = true;
    }
    noiseSound.play();
  }
}

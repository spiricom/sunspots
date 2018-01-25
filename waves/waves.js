"use strict";

// waves fixes

// Once I got the gain of the audio back under control, I narrowed down the source of the audio glitches. The random clicks are happening because of some processing when rendering the wave cloths. Commenting out 
// var waveMagUnif = testCloths[j].cloths[0].renderUniforms.waveMag;
// makes the clicks go away (but also ruins the cloth effect, of course). 

// I tried lowering the resolution of the cloths (I think it actually looks really nice with a lower cloth resolution and flat shading turned on, check out the version I pushed), but the clicks are still there, even with very low resolution cloths. Any ideas what the issue might be? Is there anything in your code that could be really heavy and interrupt the audio? 

// When you get a chance to check it out, let me know what you find. 

// MISC VARS

var DEVMODE = true;

var FADING_SINES = true;
var mySounds;

var debugAudioMode = false;
function debugAudioLog(val) {
  if (debugAudioMode) {
    console.log(val);
  }
}


var screenshotDims = [12 * 300, 12 * 300];

var clock = new THREE.Clock();
var start = Date.now();
var paused = false;

// VISUALS VARS

var camera, controls, scene, renderer, uniforms;
var gl;
var controlledCamera;
var fixedCamera;
var renderTarget;
var stencilMaskedScene;
var stencilMaskScene;

var particles;
var particleSystem;
var particleBounds;


var waveMagnitudes = [2,5,6,7];
var skyMat = [];
var meshes = [];
var material = [];

var effectFXAA, bloomPass, renderScenePass, composer;
var bloomParams = {
  exposure: 1.0,
  bloomThreshold: 0.59,
  bloomStrength: 0.26,
  bloomRadius: 0.9,
};


var centerY = 0;
// CONTROLS VARS
var moveSpeed = 30;
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
var domeGains = [];
var domeSounds = [];
var sounds = [];
var loadedSounds = {};
var analysers = [];
var audioLoader;
var waitTimes = [], prevTime = [], onOff = [];

var curDome = 0;
var soundsPlaying = false;
var loopCount = 0;
var noiseSound;

var domeMaxGain = .05;

var sphere;
  
var material_spheres;

var noiseGain;

// VISUALS CONSTANTS
const NUMBER_OF_WAVES = 4;
const NUMBER_OF_DOMES = 4;

const PALETTES = [
[75,0,0], 
[72,26,19], 
[113,0,1], 
[112,16,17], 
[81,48,38], 
[103,38,25], 
[82,65,62], 
[147,0,2], 
[126,54,59], 
[107,70,58], 
[165,22,23], 
[171,5,10], 
[173,36,35], 
[147,71,65], 
[187,57,42], 
[128,95,84], 
[138,112,106], 
[161,104,93], 
[202,93,55], 
[208,150,132], 
[109,51,20], 
[81,72,14], 
[102,84,27], 
[185,100,0], 
[187,107,61], 
[214,96,7], 
[193,113,9], 
[183,121,40], 
[155,135,101], 
[152,144,138], 
[177,139,75], 
[196,131,92], 
[227,119,54], 
[198,141,51], 
[212,134,25], 
[172,152,142], 
[234,139,72], 
[204,154,84], 
[174,164,158], 
[223,157,62], 
[232,150,93], 
[211,164,111], 
[208,183,143], 
[233,203,160], 
[123,124,101], 
[185,191,188], 
[73,99,105], 
[76,122,137], 
[138,157,154], 
[14,19,40], 
[1,31,50], 
[26,31,52], 
[25,42,79], 
[2,63,91], 
[18,79,127], 
[53,84,111], 
[110,116,125], 
[173,175,181], 
[6,2,20], 
[57,53,61], 
[88,84,92], 
[103,99,105], 
[48,25,34], 
[170,135,146],
];
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
  debugAudioLog("color = ", myIndex);
  // return new THREE.Vector3(col[0], col[1], col[2]);
  return new THREE.Color(col[0]/255, col[1]/255, col[2]/255);
}

const WORLD_WIDTH = 30, WORLD_DEPTH = 30;

// AUDIO CONSTANTS

const REVERB_SOUND_FILE = './reverbs/BX20E103.wav';
const NOISE_SOUND_FILE = './sounds/intercom.ogg';
const myDomeSounds = ["sounds/intercom.ogg","sounds/intercom_treble.ogg","sounds/intercom_highpass.ogg","sounds/intercom.ogg"];


const PAN_MODEL = 'HRTF';


const NUMBER_OF_SOUND_SOURCES = 4;
const SOUND_POSITIONS = [[-15000,0,15000], [15000,0,15000], [15000,0,-15000],[-15000,0,-15000], [-15000,30,15000], [15000,80,15000],[-5000, 0, -5000], [5000, -50, -5000]];

const REVERB_GAIN = 1.0;
const REF_DIST = 9000;

const WAIT_MAX = 20;
const WAIT_OFFSET = 4;
const RANDOM_VOLUME = true;
const MAX_VOLUME = .7;
const ANALYSER_DIVISOR = 4;
const ANALYSER_MULTIPLIER = 1000;

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
    posNoise_vert_wavesplanes : "",
    posNoise_frag : "",
    posNoise_frag_discard : "",

    posUpdate_vert : "",
    posUpdate_frag : "",

    velUpdate_vert : "",
    velUpdate_frag : "",

    render_vert : "",
    render_frag : "",
  }, "../glsl/", init );
};

function init()
{
  //if you want static sounds instead of fading - comment this in and the fade one out
  if (FADING_SINES)
  {
    mySounds = ["sounds/L/S-1.mp3","sounds/L/S-2.mp3","sounds/L/S-3.mp3","sounds/L/S-4.mp3"];
    debugAudioLog("fading");
  }
  else
  {
    mySounds = ["sounds/sinewave330.mp3","sounds/sinewave440.mp3","sounds/sinewave550.mp3","sounds/sinewave770.mp3"];
    debugAudioLog("not fading");
  }

  initVisualElements();
  if (AUDIO_ENABLED) {
    initAudioElements();
  }

  // TUNING GUI
  if (GUI_ENABLED) {
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



  // Listen for window resizing
  window.addEventListener('resize', onWindowResize, false);
  debugAudioLog("equalpower");
  render();
}

// updates and renders
function render()
{
  requestAnimationFrame(render);

  if (paused) return;

  // audio
  if (AUDIO_ENABLED) {
    renderAudio();
  }

  // visuals
  renderVisuals();
}

function resizeWindow(w, h) {
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize( w, h );
  composer.setSize( w, h );
  effectFXAA.uniforms['resolution'].value.set(1 / w, 1 / h );
}

// Properly handle window resizing
function onWindowResize()
{
  resizeWindow(window.innerWidth, window.innerHeight);
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


function initVisualElements()
{
  
  // RENDERER //////////////////////////
  renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    // preserveDrawingBuffer: true,
    stencil: true,
    gammaInput: true,
    gammaOutput: true,
    extensions: {
      derivatives: true,
    },
    // logarithmicDepthBuffer: true,
  });
  renderer.setClearColor( getRandomPaletteColor() );
  renderer.autoClear = false;
  renderer.localClippingEnabled = true;

  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  THREEx.Screenshot.bindKey(renderer);

  gl = renderer.getContext();

  document.body.appendChild( renderer.domElement );

  // CAMERA
  camera = new THREE.PerspectiveCamera( 84, window.innerWidth / window.innerHeight, 1000, 140000 );
  camera.position.set( 0, centerY, 0 );

  controls = new THREE.TrackballControls( camera, renderer.domElement );
  controls.target.copy( camera.position );
  controls.target.x += 200;
  controls.noZoom = true;
  controls.noPan = true;

  // renderTarget = new THREE.WebGLRenderTarget(2048, 2048, {
  //   // magFilter: THREE.LinearFilter,
  //   // minFilter: THREE.LinearMipMapLinearFilter,
  //   magFilter: THREE.NearestFilter,
  //   minFilter: THREE.NearestFilter,
  // });

  // SCENES
  scene = new THREE.Scene();
  stencilMaskedScene = new THREE.Scene();
  stencilMaskScene = new THREE.Scene();
  
  var viewportWidth = window.innerWidth;
  var viewportHeight = window.innerHeight;

  // POST FX /////////
  renderScenePass = new THREE.RenderPass(stencilMaskedScene, camera);

  effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);
  effectFXAA.uniforms['resolution'].value.set(1 / viewportWidth, 1 / viewportHeight );

  var copyShader = new THREE.ShaderPass(THREE.CopyShader);
  copyShader.renderToScreen = true;

  bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(viewportWidth, viewportHeight), 1.5, 0.2, 0.85);
  composer = new THREE.EffectComposer(renderer);
  composer.setSize(viewportWidth, viewportHeight);

  // composer.addPass({
  //   setSize: function() { },
  //   render: function() {
  //     renderer.state.setStencilTest( false );
  //   }
  // });
  composer.addPass(renderScenePass);
  composer.addPass(effectFXAA);
  composer.addPass(bloomPass);
  // composer.addPass({
  //   setSize: function() { },
  //   render: function() {
  //     renderer.state.setStencilTest( true );
  //   }
  // });
  composer.addPass(copyShader);
  renderer.gammaInput = true;

 
  // LIGHTS/FOG //////////////////////////
  scene.fog = new THREE.FogExp2( getRandomPaletteColor(), 0.001 );

  // DOMES //////////////////////////
  var skyGeo = [];
  var dome = [];
  for (var j = 0; j <= NUMBER_OF_DOMES; j++)
  {
    var detailLevel = j <= 2 ? 3 : 4;
    skyGeo[j] = new THREE.IcosahedronBufferGeometry( getDomeRadius(j), detailLevel );
    // skyGeo[j] = new THREE.CylinderGeometry( getDomeRadius(j), getDomeRadius(j), getDomeRadius(j)*2, 30 );
    // skyGeo[j] = new THREE.TorusKnotGeometry( getDomeRadius(j), getDomeRadius(j)*0.5 );

    var topColor = getRandomThreePaletteColor();
    var uniforms = {
      // topColor:    { value: new THREE.Color(1, 1, 1) },
      topColor:    { value: getRandomThreePaletteColor() },
      bottomColor: { value: topColor },
      offset:      { value: -33 },
      scale:      { value: 0.3 },
      exponent:    { value: 0.6 },
      time: {type: "f", value: 0.0 },
      amp: {type: "f", value: 500.0 },
      fragNoiseAmp: {type: "f", value: 500.0 },
      // bscalar: {type: "f", value: -25.0 },
      bscalar: {type: "f", value: -getDomeRadius(j) * 0.0018 },
      positionscalar: {type: "f", value: .05 },
      turbulencescalar: {type: "f", value: .5 }
    };

    skyMat[j] = new THREE.ShaderMaterial({ 
      vertexShader: ShaderLoader.get( "posNoise_vert" ), 
      fragmentShader: ShaderLoader.get( "posNoise_frag" ), 
      uniforms: uniforms,
      side: THREE.DoubleSide,
      // side: THREE.BackSide, 
    });

    // skyMat[j] = new THREE.MeshBasicMaterial({ 
    //   map: renderTarget.texture,
    //   side: THREE.BackSide, 
    // });

    dome[j] = new THREE.Mesh( skyGeo[j], skyMat[j] );
    dome[j].position.y = centerY;

    dome[j].color = topColor;
    
    if (j == 2) {
      // skyMat[j].colorWrite = false;
      stencilMaskScene.add( dome[j] );
    }
    else {
      scene.add( dome[j] );
    }
  }

  // STARS //////////////////////////

  


  // WAVES //////////////////////////
  var geometry = [];
  for (j = 0; j < NUMBER_OF_WAVES; j++) {

    var newGeom = new THREE.PlaneGeometry( 100000, 100000, WORLD_WIDTH - 1, WORLD_DEPTH - 1 );
    newGeom.rotateX( - Math.PI / 2 );
    newGeom.rotateY(Math.random() * 3.14 );
    
    geometry.push(newGeom)

    var domeColor = dome[j].color;

    uniforms = {
      topColor:    { value: new THREE.Color(domeColor) },
      bottomColor: { value: new THREE.Color(domeColor) },

      offset:      { value: 1 }, //0
      exponent:    { value: 0.6 },//.6
      time: {type: "f", value: 0.1 },
      amp: {type: "f", value: 1.0 },  //500
      fragNoiseAmp: {type: "f", value: 500.0 },
      bscalar: {type: "f", value: -15.0 }, //-5
      positionscalar: {type: "f", value: 0.05 },
      turbulencescalar: {type: "f", value: 0.5 },
    };

    var newMaterial = new THREE.ShaderMaterial({ 
      vertexShader: ShaderLoader.get( "posNoise_vert_wavesplanes" ), 
      fragmentShader: ShaderLoader.get( "posNoise_frag" ), 
      uniforms: uniforms, 
      side: THREE.DoubleSide,
    });
    material.push(newMaterial);

    var newMesh = new THREE.Mesh( newGeom, newMaterial );
    newMesh.position.set(0, 3000 + centerY, 0);
    
    meshes.push( newMesh );


    if (j == 2) {
      // skyMat[j].colorWrite = false;
      stencilMaskScene.add( newMesh );
    }
    else {
      scene.add( newMesh );
    }
  }
}

function getDomeRadius(domeIdx) {
  if (domeIdx < 0) {
    return 0;
  }
  else if (domeIdx < NUMBER_OF_DOMES) {
    return 12000*(domeIdx+1) + 20000;
    // return 4000*(domeIdx+1) + 500;
  }
  else {
    return 16000 * 1.3 * 1.6 * 2;
  }
}

// NOTE: call AFTER renderAudio()
function renderVisuals() {

  // controls
  var time = performance.now();
  var delta = ( time - prevTickTime ) / 1000;

  var delta = clock.getDelta();
  controls.update(delta);

  prevTickTime = time;

  // Update the ceiling visualizers
  for (var i = 0; i < material.length; i++)
  {
    // Ensure we don't try use an analyser for a sound not yet loaded
    var analyser = analysers[i % analysers.length];
    if (analyser != undefined) {
      waveMagnitudes[i] = analyser.getAverageFrequency()/ANALYSER_DIVISOR;
    }
    else {
      waveMagnitudes[i] = 1;
    }

    material[i].uniforms.time.value = (.000025 * (i + 1) *( waveMagnitudes[i] * 10 )) + (Math.random()*.00001);
    // material[i].uniforms.time.value = .000025 * (i + 1) * ( Date.now() - start ) + waveMagnitudes[i % waveMagnitudes.length] * 0.01;
    material[i].uniforms.amp.value = (waveMagnitudes[i] * 1 + 50) + (Math.random()*.0001);
    material[i].uniforms.fragNoiseAmp.value = waveMagnitudes[i % waveMagnitudes.length];
  }

  // dome uniforms
  for (var i = 0; i < skyMat.length; i++) {
    skyMat[i].uniforms.time.value = .000025 * (i + 1) * ( Date.now() - start ) + waveMagnitudes[i % waveMagnitudes.length] * 0.01;
    skyMat[i].uniforms.fragNoiseAmp.value = waveMagnitudes[i % waveMagnitudes.length];
  }

 


  // RENDER //////////////////////////////
  renderer.clear();

  // render base scene
  camera.near = 1000;
  camera.far = 140000;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);

  // enable stencil test
  renderer.state.setStencilTest( true );

  // config the stencil buffer to collect data for testing
  renderer.state.setStencilFunc( gl.ALWAYS, 1, 0xff );
  renderer.state.setStencilOp( gl.KEEP, gl.KEEP, gl.REPLACE );

  // draw mask scene
  renderer.render(stencilMaskScene, camera);

  // set stencil buffer for testing
  renderer.state.setStencilFunc( gl.EQUAL, 1, 0xff );
  renderer.state.setStencilOp( gl.KEEP, gl.KEEP, gl.KEEP );

  // draw masked scene
  renderer.clearDepth();
  camera.near = 0.1;
  camera.far = particleBounds * 1.5;
  camera.updateProjectionMatrix();
  
  renderer.render(stencilMaskedScene, camera);
  
  // renderer.toneMappingExposure = Math.pow( bloomParams.exposure, 4.0 );
  // composer.render();

  // disable stencil test
  renderer.state.setStencilTest( false );
}

////////////////////////////////////////////////////////////////////////////////////////////////
//     AUDIO STUFF
////////////////////////////////////////////////////////////////////////////////////////////////

// Initialize the (all important) audio elements of the piece
function initAudioElements() {
  // Create invisible spheres to attach the audio to (convenience)
  sphere = new THREE.SphereGeometry(500, 10, 10);

  //bumpMap: mapHeight, bumpScale: 10
  material_spheres = new THREE.MeshPhongMaterial( { color: 0xffffff,
                                                      shininess: 10,
                                                      side: THREE.DoubleSide,
                                                      opacity:.8} );
  material_spheres.castShadow = false;
  material_spheres.receiveShadow = false;
  material_spheres.visible = true;
  // Init audio context
  listener = new THREE.AudioListener();
  audioContext = THREE.AudioContext;
  // Attach audio listener to our moving camera
  camera.add(listener);

  for (var i = 0; i < NUMBER_OF_SOUND_SOURCES; i++)
  {
    soundGains[i] = audioContext.createGain();
  }
  // Create an audio loader for the piece and load the noise sound into it
  audioLoader = new THREE.AudioLoader();

  noiseGain = audioContext.createGain();
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
  noiseMesh.position.set(3000, 10000, 6000);
  noiseMesh.updateMatrixWorld();

  //scene.add(noiseMesh);
  noiseSound = new THREE.PositionalAudio(listener);

  // noiseSound.setPanningModel(PAN_MODEL);
  noiseSound.setFilter(noiseGain);
  //noiseSound.setRefDistance(10000);
  noiseSound.setRolloffFactor(1);
  noiseMesh.add(noiseSound);

  noiseGain.gain.value = .01;
  // Setup each of the sound source

  audioLoader.load(NOISE_SOUND_FILE, noiseLoader);

  curSoundSource = 0;
  for (var i = 0; i < NUMBER_OF_SOUND_SOURCES; i++)
  {
    audioLoader.load(mySounds[i], firstBufferLoader);
    
  }

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
function playRandomSound(soundSourceIndex) 
{
  if (soundSourceIndex > 3) {
    throw new Error('Invalid soundSourceIndex passed to playRandomSound');
  }
  // Set this as a global so it is accessible by the bufferloader
  // Probably can just add a param to bufferLoader but I'll test that later
  // I'm not 100% on how THREE.js loaders work
  debugAudioLog("inside playRandomSound");
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
    debugAudioLog(soundGains[curSoundSource].gain.value);
  }

  if (loadedSounds[curSoundFile] === undefined)
  {
    audioLoader.load(curSoundFile, bufferReloader);
  }
  else
  {
    sounds[curSoundSource] = loadedSounds[curSoundFile];
    sounds[curSoundSource].startTime = 0;
    sounds[curSoundSource].play();
  }

  
}

// Loader function for THREE.js to load audio
function firstBufferLoader(buffer)
{
  var index = curSoundSource;
  // Create a new sound so we can have a new sound buffer
  sounds[index] = new THREE.PositionalAudio( listener );
  // sounds[index].setPanningModel(PAN_MODEL);
  sounds[index].setFilter(soundGains[index]);
  // sounds[index].setRolloffFactor(2);

  meshes[index+10] = new THREE.Mesh(sphere, material_spheres[index] );
  meshes[index+10].position.set( SOUND_POSITIONS[index][0], SOUND_POSITIONS[index][1], SOUND_POSITIONS[index][2] );
  //scene.add( meshes[index+10] );

  sounds[index].setBuffer(buffer);
  sounds[index].setRefDistance(REF_DIST);
  sounds[index].setLoop(false);
  sounds[index].startTime = 0;
  sounds[index].setPlaybackRate(1);
  sounds[index].panner.connect(convolver);
  
  meshes[index+10].add(sounds[index]);

  analysers[index] = new THREE.AudioAnalyser(sounds[index], 32);
  // Add the sound to the object map
  loadedSounds[curSoundFile] = sounds[index];
  sounds[index].play();
   debugAudioLog("bufferLoader done" + " " + index);
    //debugAudioLog(curSoundSource);
  curSoundSource++;
}

function bufferReloader(buffer)
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
  
  meshes[index+10].add(sounds[index]);

  sounds[index].connect(analysers[index]);
  // Add the sound to the object map
  loadedSounds[curSoundFile] = sounds[index];
  sounds[index].play();
  debugAudioLog("bufferReloader done" + " " + index);
    //debugAudioLog(curSoundSource);
  //curSoundSource++;
}

// Loader function for THREE.js to load audio, specifically for the noise source
function noiseLoader(buffer)
{
  noiseSound.setBuffer(buffer);
  noiseSound.setRefDistance(100);
  noiseSound.setLoop(true);
  noiseSound.startTime = (Math.random()*((buffer.length / 44100) - 6));
  noiseSound.setPlaybackRate(.7);
  //noiseSound.panner.connect(audioContext.destination); //noise not connected for now
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

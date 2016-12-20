
// MISC VARS

var clock = new THREE.Clock();
var start = Date.now();

// VISUALS VARS

var camera, controls, scene, renderer, uniforms;
var waveMagnitudes = [2,5,6,7];
var skyMat = [];
var meshes = [];
var material = [];


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
const NUMBER_OF_WAVES = 3;
const NUMBER_OF_DOMES = 5;

const PALETTES = [[75,0,0],[72,26,19],[113,0,1],[112,16,17],[81,48,38],[103,38,25],[82,65,62],[147,0,2],[126,54,59],[107,70,58],[165,22,23],[171,5,10],[173,36,35],[147,71,65],[187,57,42],[128,95,84],[138,112,106],[161,104,93],[202,93,55],[208,150,132],[109,51,20],[81,72,14],[102,84,27],[185,100,0],[187,107,61],[214,96,7],[193,113,9],[183,121,40],[155,135,101],[152,144,138],[177,139,75],[196,131,92],[227,119,54],[198,141,51],[212,134,25],[172,152,142],[234,139,72],[204,154,84],[174,164,158],[223,157,62],[232,150,93],[211,164,111],[208,183,143],[233,203,160],[123,124,101],[185,191,188],[73,99,105],[76,122,137],[138,157,154],[14,19,40],[1,31,50],[26,31,52],[25,42,79],[2,63,91],[18,79,127],[53,84,111],[110,116,125],[173,175,181],[6,2,20],[57,53,61],[88,84,92],[103,99,105],[48,25,34],[170,135,146]];
const BACKGROUND_COLOR = 0x0;

const PARTICLE_COUNT = 0;
// const PARTICLE_COUNT = 500;
const PARTICLE_SPEED_SCALE = 1;

const WORLD_WIDTH = 128, WORLD_DEPTH = 128;

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
const MAX_VOLUME = 0.0;
const ANALYSER_DIVISOR = 16;


const AUDIO_ENABLED = false;

////////////////////////////////////////////////////////////////////////////////////////////////
//     INIT AND RUN
////////////////////////////////////////////////////////////////////////////////////////////////

function init()
{
  initVisualElements();
  if (AUDIO_ENABLED) {
    initAudioElements();
  }
  initControlElements();
  // Listen for window resizing
  window.addEventListener('resize', onWindowResize, false);

  animate();
}

window.onload = function() {
  var sl = new ShaderLoader();
  sl.loadShaders({
    posNoise_vert : "",
    posNoise_frag : ""
  }, "./glsl/", init );
};

function animate()
{
  requestAnimationFrame(animate);
  render();
}

// Renders a frame
function render()
{
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
  renderer.setClearColor(BACKGROUND_COLOR);
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  render();
}



////////////////////////////////////////////////////////////////////////////////////////////////
//     VISUALS STUFF
////////////////////////////////////////////////////////////////////////////////////////////////


function initControlElements()
{
  // controls = new THREE.FirstPersonControls(camera, renderer.domElement);
  // controls.movementSpeed = 1000;
  // controls.lookSpeed = 0.05;
  // // controls.lookSpeed = 0;
  // controls.noFly = true;
  // controls.lookVertical = false;
  // // controls.activeLook = false;
  // controls.freeze = true;

  controls = new THREE.TrackballControls(camera, renderer.domElement);
}

function initVisualElements()
{
  // SCENE
  camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 10, 2000000 );
  camera.position.set( 0, -1500, 10000 );
  scene = new THREE.Scene();

  //var helper = new THREE.GridHelper( 5000, 5000, 0xffffff, 0xffffff );
  //scene.add( helper );

  // RENDERER 
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setClearColor( getPaletteColor() );

  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );

  document.body.appendChild( renderer.domElement );

  // LIGHTS
  var dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
  dirLight.color.setHSL( 0.1, 1, 0.95 );
  dirLight.position.set( -10, 5.75, 1 );
  dirLight.position.multiplyScalar( 50 );
  scene.add( dirLight );

  var d = 50;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.camera.far = 3500;
  dirLight.shadow.bias = -0.0001;

  var hemiLight = [];
  hemiLight[0] = new THREE.HemisphereLight( getPaletteColor(), getPaletteColor(), .3 );
  hemiLight[0].position.set( 10, 500, 0);
  scene.add( hemiLight[0] );

  hemiLight[1] = new THREE.HemisphereLight( getPaletteColor(), getPaletteColor(), .3);
  hemiLight[1].position.set( 10, -500, 0);
  scene.add( hemiLight[1] );
  scene.fog = new THREE.FogExp2( getPaletteColor(), 0.0001 );

  // DOMES
  var skyGeo = [];
  var dome = [];
  for (var j = 0; j < NUMBER_OF_DOMES; j++)
  {
    uniforms = {
      topColor:    { value: new THREE.Color(  getPaletteColor() ) },
      bottomColor: { value: new THREE.Color(  getPaletteColor() ) },
      offset:      { value: -33 },
      exponent:    { value: 0.6 },
      time: {type: "f", value: 0.0 },
      amp: {type: "f", value: 500.0 },
      bscalar: {type: "f", value: -5.0 },
      positionscalar: {type: "f", value: .05 },
      turbulencescalar: {type: "f", value: .5 }
    };
    skyGeo[j] = new THREE.SphereGeometry( (4000*(j+1)), 32, 32 );
    skyMat[j] = new THREE.ShaderMaterial({ 
      vertexShader: ShaderLoader.get( "posNoise_vert" ), 
      fragmentShader: ShaderLoader.get( "posNoise_frag" ), 
      uniforms: uniforms, 
      side: THREE.BackSide 
    });
    dome[j] = new THREE.Mesh( skyGeo[j], skyMat[j] );
    scene.add( dome[j] );
  }

  // WAVES
  var geometry = [];
  for (j = 0; j < NUMBER_OF_WAVES; j++)
  {
    geometry[j] = new THREE.PlaneGeometry( 100000, 100000, WORLD_WIDTH - 1, WORLD_DEPTH - 1 );
    geometry[j].rotateX( - Math.PI / 2 );
    geometry[j].rotateY(Math.random() * 3.14 );
    uniforms = {
      topColor:    { value: new THREE.Color(  getPaletteColor() ) },
      bottomColor: { value: new THREE.Color(  getPaletteColor() ) },
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
    meshes[j] = new THREE.Mesh( geometry[j], material[j] );
    scene.add( meshes[j] );
  }

  // PARTICLES
  particlesGeom = new THREE.Geometry();
  var textureLoader = new THREE.TextureLoader();
  var particleColor = getPaletteColor();
  pMaterial = new THREE.PointsMaterial({
    color: particleColor,
    size: 5,
    map: textureLoader.load("./images/lens.png"),
    blending: THREE.AdditiveBlending,
    transparent: true
  });
  pMaterial.alphaTest = 0.5;

  for (var p = 0; p < PARTICLE_COUNT; p++) {
    var pX = Math.random() * 50000 - 25000,
        pY = Math.random() * 25000 - 25000,
        pZ = Math.random() * 50000 - 25000;

    var particle = new THREE.Vector3(pX, pY, pZ);

    particle.velocity = new THREE.Vector3(
      (Math.random() * PARTICLE_SPEED_SCALE) - PARTICLE_SPEED_SCALE / 2,
      (Math.random() * PARTICLE_SPEED_SCALE) - PARTICLE_SPEED_SCALE / 2,
      (Math.random() * PARTICLE_SPEED_SCALE) - PARTICLE_SPEED_SCALE / 2
      );

    particlesGeom.vertices.push(particle);
  }

  particleSystem = new THREE.Points(particlesGeom, pMaterial);
  scene.add(particleSystem);
}


// NOTE: call AFTER renderAudio()
function renderVisuals() {
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

    material[j].uniforms[ 'time' ].value = .000025 * (j + 1) * ( waveMagnitudes[j] * 10 );
    //material[j].uniforms[ 'bscalar' ].value = waveMagnitudes[j] * 1 + 50;
    material[j].uniforms[ 'amp' ].value = waveMagnitudes[j] * 1 + 50;
  }

  for (var j = 0; j < NUMBER_OF_DOMES; j++)
  {
    skyMat[j].uniforms[ 'time' ].value = .000025 * (j + 1) *( Date.now() - start );
  }

  var pCount = PARTICLE_COUNT;
  while (pCount--) {
    // get the particle
    var particle = particlesGeom.vertices[pCount];

    // check if we need to reset
    if (particle.y < -50000) {
      particle.velocity.y = 1 * PARTICLE_SPEED_SCALE;
    }
    if (particle.y > 0) {
      particle.velocity.y = -1 * PARTICLE_SPEED_SCALE;
    }
    if (particle.x < -50000) {
      particle.velocity.x = 1 * PARTICLE_SPEED_SCALE;
    }
    else if (particle.x > 50000) {
      particle.velocity.x = -1 * PARTICLE_SPEED_SCALE;
    }
    if (particle.z < -50000) {
      particle.velocity.z = 1 * PARTICLE_SPEED_SCALE;
    }
    else if (particle.z > 50000) {
      particle.velocity.z = -1 * PARTICLE_SPEED_SCALE;
    }

    // update the velocity with a splat of randomniz
    particle.velocity.x += (Math.random() * PARTICLE_SPEED_SCALE) - PARTICLE_SPEED_SCALE / 2;
    particle.velocity.y += (Math.random() * PARTICLE_SPEED_SCALE) - PARTICLE_SPEED_SCALE / 2;
    particle.velocity.z += (Math.random() * PARTICLE_SPEED_SCALE) - PARTICLE_SPEED_SCALE / 2;
    
    particle.add(particle.velocity);
  }

  // flag to the particle system that we've changed its vertices.
  particleSystem.geometry.verticesNeedUpdate = true;

  controls.update(clock.getDelta());
	renderer.render(scene, camera);
}

// Randomly select from a variety of color palettes for the scene
function getPaletteColor()
{
	var myIndex = (Math.round(Math.random() * (PALETTES.length - 1)));
	var myColor = PALETTES[myIndex];
	return ((myColor[0] << 16) + (myColor[1] << 8) + myColor[2]);
}

////////////////////////////////////////////////////////////////////////////////////////////////
//     AUDIO STUFF
////////////////////////////////////////////////////////////////////////////////////////////////

// Initialize the (all important) audio elements of the piece
function initAudioElements()
{
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
  noiseSound.setRolloffFactor(2);
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
  sounds[index].setRolloffFactor(2);
  sounds[index].setRefDistance(5000);

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
      onOff[i] = Math.round(Math.random());

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

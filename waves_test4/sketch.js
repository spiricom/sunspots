var clock = new THREE.Clock();
var camera, controls, scene, renderer, uniforms;

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

var waveMagnitudes = [2,5,6,7];
var skyMat = [];
var meshes = [];
var material = [];

var start = Date.now();

// CONSTANTS

const REVERB_SOUND_FILE = './reverbs/BX20E103.wav';
const NOISE_SOUND_FILE = './sounds/synthnoise.ogg';

const PAN_MODEL = 'equalpower';

const NUMBER_OF_WAVES = 3;
const NUMBER_OF_DOMES = 5;
const NUMBER_OF_SOUND_SOURCES = 4;
const PARTICLE_COUNT = 500;
const PALETTES = [[75,0,0],[72,26,19],[113,0,1],[112,16,17],[81,48,38],[103,38,25],[82,65,62],[147,0,2],[126,54,59],[107,70,58],[165,22,23],[171,5,10],[173,36,35],[147,71,65],[187,57,42],[128,95,84],[138,112,106],[161,104,93],[202,93,55],[208,150,132],[109,51,20],[81,72,14],[102,84,27],[185,100,0],[187,107,61],[214,96,7],[193,113,9],[183,121,40],[155,135,101],[152,144,138],[177,139,75],[196,131,92],[227,119,54],[198,141,51],[212,134,25],[172,152,142],[234,139,72],[204,154,84],[174,164,158],[223,157,62],[232,150,93],[211,164,111],[208,183,143],[233,203,160],[123,124,101],[185,191,188],[73,99,105],[76,122,137],[138,157,154],[14,19,40],[1,31,50],[26,31,52],[25,42,79],[2,63,91],[18,79,127],[53,84,111],[110,116,125],[173,175,181],[6,2,20],[57,53,61],[88,84,92],[103,99,105],[48,25,34],[170,135,146]];
const SOUND_POSITIONS = [[-10000,30,0], [10000,80,0], [0,0,-10000],[0,-50,10000], [-5000,30,5000], [5000,80,5000],[-5000, 0, -5000], [5000, -50, -5000]];

const PARTICLE_SPEED_SCALE = 1;
const REVERB_GAIN = 1.0;
const REF_DIST = 10000;
const WORLD_WIDTH = 128, WORLD_DEPTH = 128;
const BACKGROUND_COLOR = 0x0;

const WAIT_MAX = 20;
const WAIT_OFFSET = 4;
const RANDOM_VOLUME = true;
const MAX_VOLUME = 0.25;
const ANALYSER_DIVISOR = 16;

// Things that were commented out for one reason or another

//var ratios = [.5,.875,1.0, 1.14285714, 1.125, 1.11111111111,1.25,1.5, 1.375,2.6,1.6,2.0];
//var ratios = [1];
//var panModel = 'HRTF';
//var myPalette = [[255,255,255],[37,4,0],[137,54,41],[168,27,46],[176,40,61],[168,95,98],[167,109,90],[176,125,117],[29,23,2],[63,55,6],[100,37,4],[119,48,6],[103,64,9],[97,79,13],[143,71,18],[142,82,54],[111,96,23],[175,70,12],[123,96,76],[164,88,16],[127,111,33],[132,114,93],[154,109,29],[153,126,33],[225,99,24],[208,114,29],[190,130,31],[164,142,57],[175,159,74],[206,148,34],[203,174,113],[227,165,38],[234,170,81],[214,193,175],[216,211,205],[236,224,211],[39,40,4],[45,65,16],[62,65,55],[69,80,18],[90,92,52],[105,112,68],[125,128,90],[162,162,153],[189,190,140],[237,239,234],[0,18,1],[30,52,32],[66,111,68],[132,141,125],[57,96,64],[0,29,40],[0,54,64],[109,146,135],[130,173,163],[181,201,200],[0,17,67],[14,41,57],[7,40,107],[30,64,101],[2,60,141],[61,76,83],[0,0,8],[142,60,107]];
//var myPalette = [[163,155,89],[171,153,120],[89,92,54],[98,105,81],[145,143,109],[148,157,121],[161,166,127],[150,175,118],[188,179,91],[177,182,133],[187,195,129],[195,201,156],[208,213,154],[66,78,59],[111,134,96],[126,151,113],[155,184,143],[251,255,250],[80,118,102],[107,142,127],[138,148,140],[213,254,241],[12,75,91],[45,78,70],[2,94,114],[18,108,123],[66,107,116],[45,120,142],[85,134,121],[65,136,161],[78,151,174],[88,161,184],[148,160,157],[140,179,193],[160,179,177],[142,196,207],[176,191,191],[184,203,201],[166,212,209],[194,215,215],[207,227,221],[184,232,227],[209,238,233],[32,46,56],[15,50,71],[26,64,84],[50,66,82],[34,76,109],[53,81,102],[63,91,112],[92,106,134],[82,124,147],[107,121,149],[121,135,163],[105,152,177],[144,166,186],[72,69,77],[76,78,100],[112,109,121],[149,152,184],[86,57,94],[94,74,100],[92,86,93],[102,96,103]];

//

init();
animate();

// Initialize the visual elements of the piece - scene, camera, lighting
function initVisualElements()
{
  // SCENE
  camera = new THREE.PerspectiveCamera( 74, window.innerWidth / window.innerHeight, 10, 2000000 );
  camera.position.set( 0, -1500, 10000 );
  //camera.setLens(20);
  scene = new THREE.Scene();

  //var helper = new THREE.GridHelper( 5000, 5000, 0xffffff, 0xffffff );
  //scene.add( helper );
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setClearColor( getPaletteColor() );

  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );

  renderer.shadowMapEnabled = true;
  renderer.shadowMapSoft = true;

  renderer.shadowCameraNear = 3;
  renderer.shadowCameraFar = camera.far;
  renderer.shadowCameraFov = 50;

  renderer.shadowMapBias = 0.0039;
  renderer.shadowMapDarkness = 0.5;
  renderer.shadowMapWidth = 1024;
  renderer.shadowMapHeight = 1024;

  document.body.appendChild( renderer.domElement );

  var dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
  dirLight.color.setHSL( 0.1, 1, 0.95 );
  dirLight.position.set( -10, 5.75, 1 );
  dirLight.position.multiplyScalar( 50 );
  scene.add( dirLight );

  dirLight.castShadow = true;
  dirLight.shadowMapWidth = 2048;
  dirLight.shadowMapHeight = 2048;

  var d = 50;
  dirLight.shadowCameraLeft = -d;
  dirLight.shadowCameraRight = d;
  dirLight.shadowCameraTop = d;
  dirLight.shadowCameraBottom = -d;
  dirLight.shadowCameraFar = 3500;
  dirLight.shadowBias = -0.0001;

  var hemiLight = [];
  hemiLight[0] = new THREE.HemisphereLight( getPaletteColor(), getPaletteColor(), .3 );
  hemiLight[0].position.set( 10, 500, 0);
  scene.add( hemiLight[0] );

  hemiLight[1] = new THREE.HemisphereLight( getPaletteColor(), getPaletteColor(), .3);
  hemiLight[1].position.set( 10, -500, 0);
  scene.add( hemiLight[1] );
  scene.fog = new THREE.FogExp2( getPaletteColor(), 0.0001 );

  var vertexShader = document.getElementById( 'vertexShader' ).textContent;
  var fragmentShader = document.getElementById( 'fragmentShader' ).textContent;
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
    // uniforms.topColor.value.copy( hemiLight.color );
    // scene.fog.color.copy( uniforms.bottomColor.value );
    skyGeo[j] = new THREE.SphereGeometry( (4000*(j+1)), 32, 32 );
    // skyGeo[j] = new THREE.IcosahedronGeometry( 20,4 );
    skyMat[j] = new THREE.ShaderMaterial( { vertexShader: vertexShader, fragmentShader: fragmentShader, uniforms: uniforms, side: THREE.BackSide } );
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
      turbulencescalar: {type: "f", value: 0.5 }
    };
    material[j] = new THREE.ShaderMaterial( { vertexShader: vertexShader, fragmentShader: fragmentShader, uniforms: uniforms, side: THREE.DoubleSide } );
    meshes[j] = new THREE.Mesh( geometry[j], material[j] );
    meshes[j].receiveShadow = true;
    scene.add( meshes[j] );
  }

  particles = new THREE.Geometry();
  var textureLoader = new THREE.TextureLoader();
  var particleColor = getPaletteColor();
  pMaterial = new THREE.PointsMaterial({
    color: particleColor,
    size: 5,
    map: textureLoader.load("./images/lens.png"),
    blending: THREE.AdditiveBlending,
    transparent: true
  });
  // pMaterial.depthWrite: false,
  pMaterial.alphaTest = 0.5;

  // now create the individual particles
  for (var p = 0; p < PARTICLE_COUNT; p++) {
    // create a particle with random
    // position values, -250 -> 250
    var pX = Math.random() * 50000 - 25000,
        pY = Math.random() * 25000 - 25000,
        pZ = Math.random() * 50000 - 25000;

    var particle = new THREE.Vector3(pX, pY, pZ);
    // create a velocity vector
    particle.velocity = new THREE.Vector3(
      (Math.random() * PARTICLE_SPEED_SCALE) - PARTICLE_SPEED_SCALE / 2,
      (Math.random() * PARTICLE_SPEED_SCALE) - PARTICLE_SPEED_SCALE / 2,
      (Math.random() * PARTICLE_SPEED_SCALE) - PARTICLE_SPEED_SCALE / 2 // y: random vel
      );             // z
    // add it to the geometry
    particles.vertices.push(particle);
  }

  // create the particle system
  particleSystem = new THREE.Points(particles, pMaterial);
  // add it to the scene
  scene.add(particleSystem);
}

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

  noiseSound.setPanningModel(PAN_MODEL);
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

// Initialize the control elements for the piece
function initControlElements()
{
  controls = new THREE.FirstPersonControls(camera, renderer.domElement);
  controls.movementSpeed = 1000;
  controls.lookSpeed = 0.05;
  controls.noFly = true;
  controls.lookVertical = false;
}

function init()
{
  initVisualElements();
  initAudioElements();
  initControlElements();
  // Listen for window resizing
	window.addEventListener('resize', onWindowResize, false);
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
    sounds[curSoundSource].setStartTime(0);
    sounds[curSoundSource].play();
  }
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

// Requests and renders each frame
function animate()
{
	requestAnimationFrame(animate);
	// controls.update(); // required if controls.enableDamping = true, or if controls.autoRotate = true
	render();
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

// Renders visual elements. Must be rendered AFTER audio is render
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

    material[j].uniforms[ 'time' ].value = .000025 * (j + 1) *( waveMagnitudes[j] * 10 );
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
    var particle = particles.vertices[pCount];

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

    // update the velocity with
    // a splat of randomniz
    particle.velocity.x += (Math.random() * PARTICLE_SPEED_SCALE) - PARTICLE_SPEED_SCALE / 2;
    particle.velocity.y += (Math.random() * PARTICLE_SPEED_SCALE) - PARTICLE_SPEED_SCALE / 2;
    particle.velocity.z += (Math.random() * PARTICLE_SPEED_SCALE) - PARTICLE_SPEED_SCALE / 2;
    // and the position
    particle.add(particle.velocity);
  }

  // flag to the particle system that we've changed its vertices.
  particleSystem.geometry.verticesNeedUpdate = true;

  controls.update(clock.getDelta());
	renderer.render(scene, camera);
}

// Renders a frame
function render()
{
  renderAudio();
  renderVisuals();
}

// Randomly select from a variety of color palettes for the scene
function getPaletteColor()
{
	var myIndex = (Math.round(Math.random() * (PALETTES.length - 1)));
	var myColor = PALETTES[myIndex];
	return ((myColor[0] << 16) + (myColor[1] << 8) + myColor[2]);
}

// Loader function for THREE.js to load audio
function bufferLoader(buffer)
{
  var index = curSoundSource;
  // Create a new sound so we can have a new sound buffer
  sounds[index] = new THREE.PositionalAudio( listener );
  sounds[index].setPanningModel(PAN_MODEL);
  sounds[index].setFilter(soundGains[index]);
  sounds[index].setRolloffFactor(2);
  sounds[index].setRefDistance(5000);

  sounds[index].setBuffer(buffer);
  sounds[index].setRefDistance(REF_DIST);
  sounds[index].setLoop(false);
  sounds[index].setStartTime(0);
  sounds[index].setPlaybackRate(1);
  sounds[index].panner.connect(convolver);
  meshes[index].add(sounds[index]);

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
  noiseSound.setStartTime(Math.random()*((buffer.length / 44100) - 6));
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

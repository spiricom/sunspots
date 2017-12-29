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
var freqVariables = [];
var ampVariables = [];
var audioLoader;
var waitTimes = [], prevTime = [], onOff = [];
var FFTSize = 32;
var halfFFT = FFTSize / 2;
var currentLocationInSoundBank = [];


var soundBanks = [["del1-", 284],["gro-", 400], ["del3-", 400], ["del2-", 400]];
//comment this in for a different soundworld
//var soundBanks = [["sub-", 284],["bas_-", 400], ["del1-", 400], ["del2-", 400]];

var curDome = 0;
var soundsPlaying = false;
var loopCount = 0;
var noiseSound;
var soundStepSize = 15;

var domeMaxGain = .05;

var sphere;
  
var material_spheres;

var audioContext;

var meshes = [];
//video vars
var camera, controls, scene, renderer, uniforms;


var debugAudioMode = true;
function debugAudioLog(val) {
  if (debugAudioMode) {
    console.log(val);
  }
}


const WORLD_WIDTH = 30, WORLD_DEPTH = 30;

const REVERB_SOUND_FILE = './reverbs/BX20E103.wav';
const PAN_MODEL = 'HRTF';

const NUMBER_OF_SOUND_SOURCES = 4;
const NUMBER_OF_SOUND_BANKS = 4;
const SOUND_POSITIONS = [[-15000,0,15000], [15000,0,15000], [15000,0,-15000],[-15000,0,-15000], [-15000,30,15000], [15000,80,15000],[-5000, 0, -5000], [5000, -50, -5000]];

const REVERB_GAIN = .02;
const REF_DIST = 9000;

const WAIT_MAX = 2.0;
const WAIT_OFFSET = .1;
const RANDOM_VOLUME = 1;
const MAX_VOLUME = .09;
const ANALYSER_DIVISOR = 4;
const ANALYSER_MULTIPLIER = 1000;

const AUDIO_ENABLED = true;

const GUI_ENABLED = false;

window.onload = function() {
  init();
};

function init()
{
  
	initVideoElements();
  debugAudioLog("initializing!");
  if (AUDIO_ENABLED) {
    initAudioElements();
  }


  debugAudioLog("initialized!");
  render();
}

function render()
{
	requestAnimationFrame(render);
  	//if (paused) return;

	if (AUDIO_ENABLED) {
    	renderAudio();
 	}
 	renderVideo();
 	//console.log("hi");
 }

 function resizeWindow(w, h) {
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize( w, h );
}


function initVideoElements(){

	  // CAMERA
  camera = new THREE.PerspectiveCamera( 18, window.innerWidth / window.innerHeight, 4000, 20000 );
  camera.position.set( 0, 0, 6000 );
  camera.lookAt(new THREE.Vector3(0, 0, 0));
    // RENDERER 
  renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    preserveDrawingBuffer: true,
    gammaInput: true,
    gammaOutput: true,
    // logarithmicDepthBuffer: true,
  });

    // renderer.autoClearColor = false;
  renderer.autoClear = false;
  renderer.localClippingEnabled = true;

    renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );

    document.body.appendChild( renderer.domElement );
}

////////////////////////////////////////////////////////////////////////////////////////////////
//     AUDIO STUFF
////////////////////////////////////////////////////////////////////////////////////////////////

// Initialize the (all important) audio elements of the piece
function initAudioElements() {

  audioContext = THREE.AudioContext;
  //audioContext = new (window.AudioContext || window.webkitAudioContext)();
  audioLoader = new THREE.AudioLoader();

  //starting sounds
  mySounds = ["vis_sounds/sub-01.mp3","vis_sounds/sub-01.mp3","vis_sounds/sub-01.mp3","vis_sounds/sub-01.mp3"];
  
  //invisible spheres to attach the sounds to

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

  // Attach audio listener to our moving camera
  camera.add(listener);

  //console.log(context.getContext());


  for (var i = 0; i < NUMBER_OF_SOUND_SOURCES; i++)
  {
    soundGains[i] = audioContext.createGain();
  }

  
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

	for (var i = 0; i < NUMBER_OF_SOUND_BANKS; i++)
	{
		currentLocationInSoundBank[i] = Math.floor(Math.random() * soundBanks[i][1]);
	}
  // Setup each of the sound sources

  curSoundSource = 0;

  for (var i = 0; i < NUMBER_OF_SOUND_SOURCES; i++)
  {
    audioLoader.load(mySounds[i], firstBufferLoader);
    
  }



}

function renderVideo() {

	if (soundsPlaying == true)
	{
		for (var i = 0; i < NUMBER_OF_SOUND_SOURCES; i++)
		{
			freqVariables[i] = analysers[i].getAverageFrequency()/ANALYSER_DIVISOR;
			analysers[i].getFrequencyData();
			var FFTMax = 0;
			for (var j = 0; j < halfFFT; j++)
			{
				if (analysers[i].data[j] > FFTMax)
				{
					FFTMax = analysers[i].data[j];
				}
			}
			ampVariables[i] = FFTMax;
			//debugAudioLog("ampVariables[" + i + "] = " + FFTMax);
		}
	}
}

// Not actually 'rendering' audio, but all the audio stuff that is done in the render step
function renderAudio() {
  var now = audioContext.currentTime;
  
  if (soundsPlaying)
  {
    if ((loopCount % 2) === 0)
    {
      for (var i = 0; i < NUMBER_OF_SOUND_SOURCES; i++)
      {
        if (waitTimes[i] < (now - prevTime[i]))
        {
           
           if (onOff[i])
           {
	          // Play a sound from this soundsource chosen by random walk
	         
	          waitTimes[i] = playRandomSound(i); // playRandomSound returns the duration of the loaded sample
	        }
	        else
	        {
	        	onOff[i] = true;
	        	waitTimes[i] = ((Math.random() * WAIT_MAX) + WAIT_OFFSET);
	        	console.log(waitTimes[i]);

	        }
	          prevTime[i] = now;
        }
      }
    }
    loopCount++;
  }  
}




// Choose, load, and play a random sound file in the given source index
//TODO: I want to make this do more of a random walk instead of a straight up random insanity thing
function playRandomSound(soundSourceIndex) 
{
  if (soundSourceIndex > 3) {
    throw new Error('Invalid soundSourceIndex passed to playRandomSound');
  }

  // Set this as a global so it is accessible by the bufferloader
  // Probably can just add a param to bufferLoader but I'll test that later
  // I'm not 100% on how THREE.js loaders work

  curSoundSource = soundSourceIndex;
  var now = audioContext.currentTime;

  var minIndex = 10; // The soundfile indices start at 1
  var fileType = '.mp3';
  var randomFile = './vis_sounds/'; // Our sound bits are in the /sounds directory

  // Decide which sampleset to pick from
  var whichBank = soundSourceIndex % NUMBER_OF_SOUND_BANKS;

  var maxIndex = soundBanks[whichBank][1]; //retrieve the maximum sound index from the array's second element

  randomFile += soundBanks[whichBank][0]; //retrieve the name of the file prefix from the array's first element

  currentLocationInSoundBank[whichBank] += Math.floor((Math.random() * soundStepSize) - (soundStepSize * .5));
    console.log(currentLocationInSoundBank[whichBank]);
  	if ((currentLocationInSoundBank[whichBank] < minIndex) || (currentLocationInSoundBank[whichBank] > maxIndex))
  	{
  		currentLocationInSoundBank[whichBank] = Math.floor((Math.random() * maxIndex - minIndex + 1) + minIndex);
	}
	 // Get the soundfile number, append it and the filetype
  randomFile += currentLocationInSoundBank[whichBank];
  randomFile += fileType;
  curSoundFile = randomFile;


  if (RANDOM_VOLUME)
  {


    var newVolume = Math.random() * MAX_VOLUME + 0.000000001;

    soundGains[curSoundSource].gain.setTargetAtTime(newVolume, now, 0.5);

  }

  if (loadedSounds[curSoundFile] === undefined)
  {
    audioLoader.load(curSoundFile, bufferReloader);
    return sounds[curSoundSource].getBufferLength();
  }
  else
  {
    sounds[curSoundSource] = loadedSounds[curSoundFile];
    sounds[curSoundSource].startTime = 0;
    sounds[curSoundSource].play();
    return sounds[curSoundSource].getBufferLength();
  }


  
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
  var newplaybackRate = (Math.random() + .5);
  sounds[index].setPlaybackRate(newplaybackRate);
  sounds[index].panner.connect(convolver);
  meshes[index+10].add(sounds[index]);
  sounds[index].connect(analysers[index]);
  // Add the sound to the object map
  loadedSounds[curSoundFile] = sounds[index];
  sounds[index].play();
  onOff[index] = Math.round(Math.random()); // 

  return buffer.duration;
}


// Called when noise and the convolver are loaded
function whenLoaded()
{
  soundsLoaded++;
  var now = audioContext.currentTime;

  // Once the convolver is loaded
  if (soundsLoaded == 1)
  {
    soundsLoaded = 0;

    for (var i = 0; i < NUMBER_OF_SOUND_SOURCES; i++)
    {
      // BUG NOTE: Directly setting gain.value (like this) does not work in the p5.editor
      soundGains[i].gain.value = 0;

      prevTime[i] = now;
      waitTimes[i] = ((Math.random() * WAIT_MAX) + WAIT_OFFSET);
      onOff[i] = Math.round(Math.random()); // 

      if (RANDOM_VOLUME)
      {
        // BUG NOTE: Directly setting gain.value (like this) does not work in the p5.editor
        var newVolume = Math.random() * MAX_VOLUME + 0.000000001;
        soundGains[i].gain.setTargetAtTime(newVolume, now, 0.5);

      }
      else
      {
        // BUG NOTE: Directly setting gain.value (like this) does not work in the p5.editor
        soundGains[i].gain.setTargetAtTime(0.000000001, now, 0.5);
      }
      soundsPlaying = true;
    }
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
  analysers[index] = new THREE.AudioAnalyser(sounds[index], FFTSize);
  
  // Add the sound to the object map
  loadedSounds[curSoundFile] = sounds[index];
  sounds[index].play();
    //debugAudioLog(curSoundSource);
  curSoundSource++;
}
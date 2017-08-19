"use strict";

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();


// CONFIG
var audioEnabled = true;

var fboWidth  = 60;
var fboHeight = 60;
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

var localPlane = [];
var pointLight = [];
var allCloths = [];
var mesh = [];
var particleCount = 500;
var particles;
var particleSystem;
var pMaterial;
var material_sphere = [];
var numSounds = 4;
var numBuffers = 2;

var soundPositions = [[-350,30,0], [350,80,0], [0,0,-350],[0,-50,350], [-125,30,125], [125,80,125],[-125, 0, -125], [125, -50, -125]];
var ratios = [.5,.875,1.0, 1.14285714, 1.125, 1.11111111111,1.25,1.5, 1.375,2.6,1.6,2.0];
//var ratios = [0.5,0.75,1.0,1.125];
var analyser = [];
var mesh = [];
var sound = [];
var soundGain = [];
var waitMax = 13;
var waitOffset = 4;

//sunspotsmetal1 is good, so is timp3_1
var soundFiles = ['./sounds/sunspots_lonely_knocks.mp3', './sounds/sunspots_wood_groan.mp3','./sounds/sunspotsmetal_harmonics.mp3','./sounds/sunspotsmetal1.mp3','./sounds/sunspotsnoiseTone1.mp3','./sounds/sunspotstimp3_1.mp3','./sounds/sunspotstimp4_1.mp3','./sounds/sunspotsuglydrone1.mp3','./sounds/sunspots_arpeg_slow1.mp3','./sounds/sunspots_arpeg.mp3'];

var reverbSoundFile = './reverbs/BX20E103.wav';
var material_sphere = [];
var valScalar = .01;
var panModel = 'equalpower';
//var panModel = 'HRTF';
var particleCount = 500;
var particles;
var particleSystem;
var pMaterial;


var loopCount = 0;
var volRandom = 1;

var analyzerDivisor = 64;

var i = 0, j = 0;
var numSounds = 4;
var numBuffers = 2;
var whichFile = [5,0];

var myReverbGain = 0.16;
var clock = new THREE.Clock();
var refDist = 150;

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
  camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
  camera.position.set( 0, 25, 0 );

  // SCENE
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2( getPaletteColor(), 0.0025 );

  // scale down to make better use of z buffer precision
  // scene.scale.x = 0.01;
  // scene.scale.y = 0.01;
  // scene.scale.z = 0.01;

  var viewportWidth = window.innerWidth;
  var viewportHeight = window.innerHeight;
  if (fixedRes) {
    viewportWidth = fixedRes.width;
    viewportHeight = fixedRes.height;
  }


  // RENDERER
  renderer = new THREE.WebGLRenderer({ 
    antialias: false, // must disable for deferred stuff
    devicePixelRatio: 1,
    preserveDrawingBuffer: true, // enable this for canvas image output
    gammaInput: true,
    gammaOutput: true,
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.renderReverseSided = false;
  renderer.toneMapping = THREE.LinearToneMapping;

  renderer.setSize(viewportWidth, viewportHeight);
  document.body.appendChild(renderer.domElement);

  // controls
  controls = new THREE.FirstPersonControls( camera, renderer.domElement );

  controls.movementSpeed = 500;
  controls.lookSpeed = 0.05;
  controls.noFly = true;
  controls.lookVertical = false;

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

  // light
  var light = new THREE.DirectionalLight( getPaletteColor() );
  light.position.set( 0, 0.5, .01 ).normalize();
  scene.add( light );

  //clipping planes
  localPlane[0] = new THREE.Plane( new THREE.Vector3( 0, - 1, .6 ), 0.8 );
  localPlane[1] = new THREE.Plane( new THREE.Vector3( .5, - 1, .6), 0.8 );
  localPlane[2] = new THREE.Plane( new THREE.Vector3( 1, .5, -.2 ), 1 );
  localPlane[3] = new THREE.Plane( new THREE.Vector3( 0, -.6, 0 ), 0.7 );

  // sky mesh
  var geoSky = new THREE.SphereGeometry( 1000, 32, 32 );
  var matSky = new THREE.MeshPhongMaterial( { color: getPaletteColor(), side: THREE.DoubleSide } );
  var meshSky = new THREE.Mesh( geoSky, matSky );
  meshSky.position.set( 0, 0, 0 );
  scene.add( meshSky );
  
  // sky light
  var hemiLight = new THREE.HemisphereLight( getPaletteColor());
  scene.add( hemiLight );
  

  // particles
  particles = new THREE.Geometry();
      
  var textureLoader = new THREE.TextureLoader();
  var particleColor = getPaletteColor();
  
  pMaterial = new THREE.PointsMaterial({
    color: particleColor,
    size: 5,
    map: textureLoader.load("images/lensflare0_alpha_dot.png"),
    blending: THREE.AdditiveBlending,
    transparent: true,
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
  

  // crystal displacement map
  var mapHeight = new THREE.TextureLoader().load( "images/Infinite-Level_02_Disp_NoSmoothUV-4096.jpg" );
  mapHeight.anisotropy = 16;
  mapHeight.repeat.set( 0.998, 0.998 );
  mapHeight.offset.set( 0.001, 0.001 );
  mapHeight.wrapS = mapHeight.wrapT = THREE.RepeatWrapping;
  mapHeight.format = THREE.RGBFormat;

  // crystal materials
  for (i = 0; i < numSounds; i++) {
    material_sphere[i] = new THREE.MeshPhongMaterial( { 
      color: 0xffffff, 
      shininess: 10, 
      displacementMap: mapHeight,
      displacementScale: 5,
      displacementBias: 2,
      side: THREE.DoubleSide,
      clippingPlanes: [ localPlane[i%4] ],
      clipShadows: true,
      opacity: 0.8
    } );
    material_sphere[i].castShadow = true;
    material_sphere[i].receiveShadow = true; 
  }

  // crystal sphere geom
  var sphere = new THREE.SphereGeometry( 100, 3, 2 );
  sphere.phiStart = 0.5;
  sphere.phiLength = 0.5;

  // crystal meshes
  for (i = 0; i < numSounds; i++) {
    mesh[i] = new THREE.Mesh( sphere, material_sphere[i] );
    mesh[i].position.set( soundPositions[i][0], soundPositions[i][1],soundPositions[i][2] );
    scene.add( mesh[i] );
  }

  // CLOTHS 

  var clothTex = THREE.ImageUtils.loadTexture("textures/marble.png");
  // var clothTex = THREE.ImageUtils.loadTexture("textures/marble_orig.png");
  clothTex.magFilter = THREE.NearestFilter;
  clothTex.minFilter = THREE.NearestFilter;

  // MAIN CLOTHS
  var mainClothSize = 256;
  var group = new ClothBunch(4, fboWidth, fboHeight, clothTex, mainClothSize, {
    // pinMode: "random",
    // pinChance: 0.003,
    // noRandomRot: true,
    maxDist: (mainClothSize * 0.25)
  });
  group.colorScheme = "main";
  allClothGroups.push(group);

  // AUDIO ////////////////////////


  // audio listener and context
  listener = new THREE.AudioListener();
  audioContext = THREE.AudioContext;
  camera.add(listener);
  
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

  for (i = 0; i < numSounds; i++) {
    soundGain[i] = audioContext.createGain();
    
    sound[i] = new THREE.PositionalAudio( listener );
    sound[i].setPanningModel(panModel);
    sound[i].setFilter(soundGain[i]);
    sound[i].setRolloffFactor(2);
    sound[i].setRefDistance(5000);
    mesh[i].add( sound[i] );
    //pointLight[i] = new THREE.PointLight( 0xffffff, .1 );
    //mesh[i].add( pointLight[i] );
    
    analyser[i] = new THREE.AudioAnalyser( sound[i], 32 );
  }
  for (i = 0; i < numBuffers; i++) {
    audioLoader.load(soundFiles[whichFile[i]], bufferLoader);
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
  
  // update audio  ///////////////
  var now = audioContext.currentTime;

  if (soundsPlaying == 1)
  {
    if ((loopCount % 100) === 0)
    {
      for (i = 0; i < numSounds; i++)
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
    for (i = 0; i < numSounds; i++)
    {
      var val = analyser[i].getAverageFrequency() / analyzerDivisor;
      material_sphere[i].emissive.r = val;
      material_sphere[i].emissive.g = val;
      material_sphere[i].emissive.b = val;
      mesh[i].rotation.x += (val* valScalar);
      mesh[i].rotation.z += (val* valScalar);
      mesh[i].rotation.y += (val* valScalar);
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

  // render
  renderer.render(scene, camera, null, true);
  // renderer.toneMappingExposure = Math.pow( bloomParams.exposure, 4.0 );
  // composer.render();
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
    
    for (i = 0; i < numSounds; i++)
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
  for (j = 0; j < (numSounds/numBuffers); j++)
  {
    var thisSound = bufferCounter;
    //console.log(thisSound);
    sound[thisSound].setBuffer( buffer );
    sound[thisSound].setRefDistance( refDist );
    sound[thisSound].setLoop(true);
    sound[thisSound].setStartTime(Math.random()*((buffer.length / 44100) - 6));
    sound[thisSound].setPlaybackRate(ratios[Math.round(Math.random() * (ratios.length - 1))]);
    sound[thisSound].panner.connect(convolver);
    bufferCounter++
  }
  whenLoaded();
}

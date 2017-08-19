if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container;
var camera, controls, scene, renderer;
var light, pointLight;
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

var myPalette = [[44,15,16],[66,22,16],[62,38,31],[104,28,21],[102,47,34],[137,42,31],[157,52,37],[121,75,68],[178,39,27],[106,89,90],[178,66,46],[132,93,81],[206,45,42],[213,32,18],[205,61,44],[158,94,75],[220,69,67],[169,104,99],[204,96,77],[142,127,125],[220,115,90],[97,63,34],[77,74,50],[90,86,55],[150,78,45],[177,78,19],[120,112,80],[206,83,30],[191,94,30],[220,94,35],[199,113,57],[166,130,99],[181,128,65],[240,102,23],[194,140,110],[245,124,60],[207,151,91],[191,156,133],[229,145,74],[226,167,90],[37,44,9],[60,60,41],[141,151,105],[117,124,115],[23,57,42],[49,75,57],[98,139,124],[46,86,79],[32,98,113],[74,101,109],[36,110,140],[31,124,123],[75,130,144],[43,151,155],[131,152,154],[64,163,151],[57,159,201],[40,164,170],[80,175,164],[26,60,89],[76,148,180],[87,168,204],[79,78,93],[38,33,36]];

var soundPositions = [[-350,30,0], [350,80,0], [0,0,-350],[0,-50,350], [-125,30,125], [125,80,125],[-125, 0, -125], [125, -50, -125]];
var ratios = [.5,.875,1.0, 1.14285714, 1.125, 1.11111111111,1.25,1.5, 1.375,2.6,1.6,2.0];
//var ratios = [0.5,0.75,1.0,1.125];
var analyser = [];
var mesh = [];
var sound = [];
var soundGain = [];
var waitMax = 13;
var waitOffset = 4;

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
var localPlane = [];
var pointLight = [];
var allCloths = [];


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
  }, "../glsl/", init );
};

function init() {

  container = document.getElementById( 'container' );

  // camera
  camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
  camera.position.set( 0, 25, 0 );

  // audio listener and context
  listener = new THREE.AudioListener();
  audioContext = THREE.AudioContext;
  camera.add(listener);
  
  // scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2( getPaletteColor(), 0.0025 );

  // light
  light = new THREE.DirectionalLight( getPaletteColor() );
  light.position.set( 0, 0.5, 10 ).normalize();
  scene.add( light );

  // renderer
  renderer = new THREE.WebGLRenderer( {antialias: true, logarithmicDepthBuffer: true} );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  //renderer.clippingPlanes = localPlane; // GUI sets it to globalPlanes
  renderer.localClippingEnabled = true;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.renderReverseSided = false;
  renderer.gammaInput = true;
  renderer.gammaOutput = true;
  
  container.innerHTML = "";
  container.appendChild( renderer.domElement );

  // controls
  controls = new THREE.FirstPersonControls( camera, renderer.domElement );

  controls.movementSpeed = 500;
  controls.lookSpeed = 0.05;
  controls.noFly = true;
  controls.lookVertical = false;

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
  
  var hemiLight = new THREE.HemisphereLight( getPaletteColor());
  light.position.set( 0, 0.5, .01 ).normalize();
  scene.add( hemiLight );
  
  // displacement map for crystals
  var mapHeight = new THREE.TextureLoader().load( "images/Infinite-Level_02_Disp_NoSmoothUV-4096.jpg" );
  mapHeight.anisotropy = 16;
	mapHeight.repeat.set( 0.998, 0.998 );
	mapHeight.offset.set( 0.001, 0.001 );
	mapHeight.wrapS = mapHeight.wrapT = THREE.RepeatWrapping;
	mapHeight.format = THREE.RGBFormat;

  for (i = 0; i < numSounds; i++) {
    //bumpMap: mapHeight, bumpScale: 10
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

  convolver = audioContext.createConvolver();
  var reverbGain = audioContext.createGain();
  // grab audio track via XHR for convolver node
  reverbGain.gain.value = myReverbGain;
  var soundSource, SpringReverbBuffer;
  
  // create the particle variables
  particles = new THREE.Geometry();
      
  var textureLoader = new THREE.TextureLoader();
  
  var particleColor = getPaletteColor();
  pMaterial = new THREE.PointsMaterial({
    color: particleColor,
    size: 5,
    map: textureLoader.load("images/lensflare0_alpha_dot.png"),
    blending: THREE.AdditiveBlending,
    transparent: true
  });
  //pMaterial.depthWrite: false,
  pMaterial.alphaTest = 0.5;
  
  // now create the individual particles
  for (var p = 0; p < particleCount; p++) {
  
    // create a particle with random
    // position values, -250 -> 250
    var pX = Math.random() * 1000 - 500,
        pY = Math.random() * 1000 - 500,
        pZ = Math.random() * 1000 - 500;
    
    var particle = new THREE.Vector3(pX, pY, pZ);
    // create a velocity vector
    particle.velocity = new THREE.Vector3(
      (Math.random() * .2) - .1,
      (Math.random() * .2) - .1,
      (Math.random() * .2) - .1
      );
    // add it to the geometry
    particles.vertices.push(particle);
  }
  
  // create the particle system
  particleSystem = new THREE.Points(
      particles,
      pMaterial);
  
  // add it to the scene
  scene.add(particleSystem);
  

  // load reverb audio data
  ajaxRequest = new XMLHttpRequest();
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
  
  // sound crystals
  var audioLoader = new THREE.AudioLoader();

  // sphere geom
  var sphere = new THREE.SphereGeometry( 100, 3, 2 );
  sphere.phiStart = 0.5;
  sphere.phiLength = 0.5;

  for (i = 0; i < numSounds; i++) {
    // crystal mesh
    mesh[i] = new THREE.Mesh( sphere, material_sphere[i] );
    mesh[i].position.set( soundPositions[i][0], soundPositions[i][1],soundPositions[i][2] );
    scene.add( mesh[i] );
    
    // CLOTHS //////////////////////////

    var cloth = new GpuCloth(100, 100, new THREE.Color(0.5, 1, 0.5), null, 200, {
      pinMode: "random",
    });
    console.log(cloth.getRenderMesh());
    scene.add(cloth.getRenderMesh());

    // var mainClothSize = 256;
    // var group = new ClothBunch(4, 20, 20, null, mainClothSize, {
    //   // pinMode: "random",
    //   // pinChance: 0.003,
    //   // noRandomRot: true,
    //   color: new THREE.Color(0.5, 1, 0.5),
    //   maxDist: (mainClothSize * 0.5)
    // });
    // group.colorScheme = "fixed";
    // allCloths.push(group);

    // var clothOpts = {
    //   flatShading: true,
    //   color: new THREE.Color(0.5, 1, 0.5),
    //   pinMode: "randomAndEdges",
    //   // pinMode: "corners",
    //   // pinChance: 0.08,
    //   noTex: true,
    //   noRandomRot: true,
    //   // initPosMult: 1.02,
    //   noAutoCenter: true,
    //   manualTransform: true,
    // };

    // var clothRes = 10;
    // var clothSize = 200;

    // var opts = Object.assign({}, clothOpts);

    // // opts.renderDefines = {
    //   // DISCARD_DIST: clothSize / 2 + 0.1,
    // // };
    // // opts.color = new THREE.Color(1, 0, 0, 1);
    
    // var newCloth = new ClothBunch(1, clothRes, clothRes, null, clothSize, opts);
    // newCloth.colorScheme = "fixed";
    // newCloth.rootNode.rotation.x = -Math.PI / 2;
    // newCloth.rootNode.rotation.z = Math.PI * 2 * (i / 4);

    // newCloth.rootNode.position.y = -200;
    // // newCloth.rootNode.position.copy(mesh[i].position);
    
    // // lowLodNode.add(newCloth.rootNode);
    
    // allCloths.push(newCloth);

    // crystal audio
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

  //var helper = new THREE.GridHelper( 500, 10, 0x444444, 0x444444 );
  //helper.position.y = 0.1;
  //scene.add( helper );

  // resize listener
  window.addEventListener( 'resize', onWindowResize, false );

  // start update/render loop
  render();
}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight);

  //controls.handleResize();

}

function render() {
  requestAnimationFrame( render );
  
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
  
  // update controls  ///////////////
  var delta = clock.getDelta();

  controls.update( delta );
  
  // update cloths  
  for (var i = 0; i < allCloths.length; i++) {
    allCloths[i].update(camera, []);
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
    
    // update the velocity with
    // a splat of randomniz
    particle.velocity.x += (Math.random() * .02) - .01;
    particle.velocity.y += (Math.random() * .02) - .01;
    particle.velocity.z += (Math.random() * .02) - .01;
    //console.log(particle.velocity);
    // and the position
    particle.add(
      particle.velocity);
  }

  // flag to the particle system
  // that we've changed its vertices.
  particleSystem.geometry.verticesNeedUpdate = true;
	
  // render the scene
  renderer.render( scene, camera );
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

function getPaletteColor()
{
  	var myIndex = (Math.round(Math.random() * (myPalette.length - 1)));
  	myColor = myPalette[myIndex];
  	//console.log("palette length");
  	//console.log(myPalette.length);
  	//console.log(myIndex);
  	return ((myColor[0] << 16) + (myColor[1] << 8) + myColor[2]);	
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

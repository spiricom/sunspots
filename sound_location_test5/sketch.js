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
//var myPalette = [[75,0,0],[72,26,19],[113,0,1],[112,16,17],[81,48,38],[103,38,25],[82,65,62],[147,0,2],[126,54,59],[107,70,58],[165,22,23],[171,5,10],[173,36,35],[147,71,65],[187,57,42],[128,95,84],[138,112,106],[161,104,93],[202,93,55],[208,150,132],[109,51,20],[81,72,14],[102,84,27],[185,100,0],[187,107,61],[214,96,7],[193,113,9],[183,121,40],[155,135,101],[152,144,138],[177,139,75],[196,131,92],[227,119,54],[198,141,51],[212,134,25],[172,152,142],[234,139,72],[204,154,84],[174,164,158],[223,157,62],[232,150,93],[211,164,111],[208,183,143],[233,203,160],[123,124,101],[185,191,188],[73,99,105],[76,122,137],[138,157,154],[14,19,40],[1,31,50],[26,31,52],[25,42,79],[2,63,91],[18,79,127],[53,84,111],[110,116,125],[173,175,181],[6,2,20],[57,53,61],[88,84,92],[103,99,105],[48,25,34],[170,135,146]];
//var myPalette = [[255,255,255],[37,4,0],[137,54,41],[168,27,46],[176,40,61],[168,95,98],[167,109,90],[176,125,117],[29,23,2],[63,55,6],[100,37,4],[119,48,6],[103,64,9],[97,79,13],[143,71,18],[142,82,54],[111,96,23],[175,70,12],[123,96,76],[164,88,16],[127,111,33],[132,114,93],[154,109,29],[153,126,33],[225,99,24],[208,114,29],[190,130,31],[164,142,57],[175,159,74],[206,148,34],[203,174,113],[227,165,38],[234,170,81],[214,193,175],[216,211,205],[236,224,211],[39,40,4],[45,65,16],[62,65,55],[69,80,18],[90,92,52],[105,112,68],[125,128,90],[162,162,153],[189,190,140],[237,239,234],[0,18,1],[30,52,32],[66,111,68],[132,141,125],[57,96,64],[0,29,40],[0,54,64],[109,146,135],[130,173,163],[181,201,200],[0,17,67],[14,41,57],[7,40,107],[30,64,101],[2,60,141],[61,76,83],[0,0,8],[142,60,107]];
//var myPalette = [[163,155,89],[171,153,120],[89,92,54],[98,105,81],[145,143,109],[148,157,121],[161,166,127],[150,175,118],[188,179,91],[177,182,133],[187,195,129],[195,201,156],[208,213,154],[66,78,59],[111,134,96],[126,151,113],[155,184,143],[251,255,250],[80,118,102],[107,142,127],[138,148,140],[213,254,241],[12,75,91],[45,78,70],[2,94,114],[18,108,123],[66,107,116],[45,120,142],[85,134,121],[65,136,161],[78,151,174],[88,161,184],[148,160,157],[140,179,193],[160,179,177],[142,196,207],[176,191,191],[184,203,201],[166,212,209],[194,215,215],[207,227,221],[184,232,227],[209,238,233],[32,46,56],[15,50,71],[26,64,84],[50,66,82],[34,76,109],[53,81,102],[63,91,112],[92,106,134],[82,124,147],[107,121,149],[121,135,163],[105,152,177],[144,166,186],[72,69,77],[76,78,100],[112,109,121],[149,152,184],[86,57,94],[94,74,100],[92,86,93],[102,96,103]];
//ballerina
//var myPalette = [[160,114,105],[176,144,148],[207,134,119],[214,161,172],[226,178,183],[100,64,47],[125,86,62],[166,98,44],[213,206,168],[184,207,178],[12,106,122],[21,120,135],[61,121,136],[74,136,158],[141,165,172],[100,208,193],[189,192,192],[143,204,205],[45,215,232],[84,210,251],[122,226,210],[76,231,218],[170,219,207],[201,214,213],[167,232,253],[4,21,55],[34,47,80],[51,61,103],[28,87,146],[76,85,161],[53,97,125],[50,99,183],[90,113,172],[48,115,203],[49,137,184],[60,128,220],[98,126,217],[98,148,179],[60,143,238],[117,139,223],[70,164,235],[117,170,219],[102,190,255],[157,184,246],[119,204,244],[171,207,240],[56,62,165],[85,70,156],[127,102,176],[132,119,190],[154,148,191],[93,73,102],[121,107,125],[200,116,195],[201,137,204],[179,168,181],[69,17,39],[81,44,58],[128,55,102],[122,71,95],[116,88,111],[154,134,150],[232,117,177],[231,196,207]];
//fauvist
//var myPalette = [[77,31,35],[108,32,0],[95,49,32],[156,59,21],[169,74,35],[160,88,91],[216,70,10],[157,107,89],[173,152,152],[42,20,0],[61,46,0],[112,62,10],[138,75,25],[125,88,0],[160,90,0],[143,105,37],[178,93,53],[172,107,8],[205,103,19],[161,125,82],[184,117,56],[228,89,13],[137,133,115],[154,135,13],[170,139,68],[219,119,12],[188,133,109],[239,110,36],[185,139,0],[199,136,60],[239,129,57],[194,155,0],[219,144,96],[198,160,102],[249,145,65],[211,182,95],[242,170,76],[237,181,15],[233,199,95],[240,198,19],[244,217,20],[255,223,129],[255,235,65],[255,239,161],[82,78,22],[85,100,16],[98,109,84],[131,132,47],[112,142,63],[206,187,13],[186,191,150],[221,220,131],[225,227,207],[236,241,220],[255,254,225],[104,128,87],[119,153,119],[117,123,138],[103,96,113],[64,55,65],[100,62,102],[134,93,140],[99,38,70],[135,60,98]];
//neutral (a25)
//var myPalette = [[17,0,0],[29,8,0],[37,18,21],[46,27,27],[67,37,46],[163,145,140],[195,145,125],[51,19,0],[69,33,0],[64,45,12],[82,42,15],[66,49,40],[76,55,9],[74,60,42],[97,54,21],[98,63,24],[99,71,41],[89,76,67],[117,73,27],[106,87,61],[123,89,34],[156,76,0],[117,99,18],[144,92,52],[130,101,52],[151,96,20],[128,107,93],[129,115,36],[145,109,30],[153,108,70],[145,116,65],[137,118,102],[154,124,79],[167,128,42],[209,108,17],[153,136,101],[170,132,110],[187,130,34],[171,142,93],[184,137,110],[213,137,45],[168,155,122],[180,151,103],[179,166,140],[209,167,124],[201,170,156],[191,179,150],[203,191,162],[206,190,132],[198,195,193],[213,201,172],[240,214,162],[251,227,196],[252,250,242],[11,11,4],[187,189,148],[212,212,203],[220,221,206],[231,231,220],[239,239,230],[9,0,28],[54,16,58],[32,2,27],[191,186,189]];
//b4 blue and orange
var myPalette = [[44,15,16],[66,22,16],[62,38,31],[104,28,21],[102,47,34],[137,42,31],[157,52,37],[121,75,68],[178,39,27],[106,89,90],[178,66,46],[132,93,81],[206,45,42],[213,32,18],[205,61,44],[158,94,75],[220,69,67],[169,104,99],[204,96,77],[142,127,125],[220,115,90],[97,63,34],[77,74,50],[90,86,55],[150,78,45],[177,78,19],[120,112,80],[206,83,30],[191,94,30],[220,94,35],[199,113,57],[166,130,99],[181,128,65],[240,102,23],[194,140,110],[245,124,60],[207,151,91],[191,156,133],[229,145,74],[226,167,90],[37,44,9],[60,60,41],[141,151,105],[117,124,115],[23,57,42],[49,75,57],[98,139,124],[46,86,79],[32,98,113],[74,101,109],[36,110,140],[31,124,123],[75,130,144],[43,151,155],[131,152,154],[64,163,151],[57,159,201],[40,164,170],[80,175,164],[26,60,89],[76,148,180],[87,168,204],[79,78,93],[38,33,36]];
// icon i22
//var myPalette = [[58,15,0],[69,3,0],[80,15,26],[77,40,39],[91,51,45],[101,70,67],[180,50,18],[188,67,19],[130,125,126],[42,32,26],[80,31,0],[71,53,14],[109,33,0],[108,49,0],[118,60,32],[142,49,0],[88,84,53],[128,73,34],[153,64,13],[121,91,20],[153,85,19],[105,104,101],[123,110,14],[188,83,19],[122,118,87],[149,112,77],[138,120,29],[177,102,18],[208,97,35],[182,115,41],[181,118,81],[205,117,28],[177,131,96],[193,136,66],[208,132,27],[228,126,43],[216,142,0],[178,159,84],[210,156,41],[205,160,88],[239,145,28],[197,161,128],[195,175,87],[240,162,35],[237,167,112],[217,177,125],[218,182,43],[242,178,45],[245,181,98],[224,210,105],[250,204,101],[245,213,69],[255,227,170],[255,234,132],[96,98,58],[255,240,85],[255,254,145],[85,113,69],[103,122,112],[45,56,56],[20,27,37],[19,6,30],[42,18,33],[134,84,100]];
// wintery f1
//var myPalette = [[48,44,32],[68,58,42],[74,66,44],[84,74,55],[87,81,62],[100,87,64],[100,94,75],[107,98,86],[110,104,87],[121,108,83],[119,113,96],[128,117,94],[134,125,101],[137,131,114],[151,129,112],[144,136,117],[152,139,106],[151,143,121],[157,153,125],[168,157,138],[173,163,145],[172,169,157],[186,166,146],[180,174,165],[182,174,145],[187,181,172],[188,180,152],[192,187,175],[200,187,152],[198,193,181],[205,195,163],[206,201,189],[216,207,173],[214,209,197],[223,216,205],[229,224,212],[235,230,218],[242,235,224],[252,243,231],[27,30,22],[35,35,24],[51,51,42],[57,60,52],[64,66,61],[77,77,68],[80,82,77],[87,87,78],[94,96,91],[100,102,95],[107,106,93],[108,111,103],[118,118,107],[116,121,108],[124,124,117],[134,136,131],[142,142,135],[150,149,138],[155,155,144],[162,161,150],[176,180,165],[109,117,103],[127,131,126],[139,148,138],[66,72,67]];

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
init();
animate();

function init() {

  container = document.getElementById( 'container' );

  camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
  camera.position.set( 0, 25, 0 );

  listener = new THREE.AudioListener();
  audioContext = THREE.AudioContext;
  camera.add(listener);
  
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2( getPaletteColor(), 0.0025 );

  light = new THREE.DirectionalLight( getPaletteColor() );
  light.position.set( 0, 0.5, 10 ).normalize();
  scene.add( light );

  //clipping plane
  localPlane[0] = new THREE.Plane( new THREE.Vector3( 0, - 1, .6 ), 0.8 );
  localPlane[1] = new THREE.Plane( new THREE.Vector3( .5, - 1, .6), 0.8 );
  localPlane[2] = new THREE.Plane( new THREE.Vector3( 1, .5, -.2 ), 1 );
  localPlane[3] = new THREE.Plane( new THREE.Vector3( 0, -.6, 0 ), 0.7 );
  var sphere = new THREE.SphereGeometry( 100, 3, 2 );
  sphere.phiStart = .5;
  sphere.phiLength = .5;
  
  var geoSky = new THREE.SphereGeometry( 1000, 32, 32 );
  var matSky = new THREE.MeshPhongMaterial( { color: getPaletteColor(), side: THREE.DoubleSide } );
  var meshSky = new THREE.Mesh( geoSky, matSky );
  meshSky.position.set( 0, 0, 0 );
  scene.add( meshSky );
  
  var hemiLight = new THREE.HemisphereLight( getPaletteColor());
  light.position.set( 0, 0.5, .01 ).normalize();
  scene.add( hemiLight );
  
  var mapHeight = new THREE.TextureLoader().load( "images/Infinite-Level_02_Disp_NoSmoothUV-4096.jpg" );
  mapHeight.anisotropy = 16;
	mapHeight.repeat.set( 0.998, 0.998 );
	mapHeight.offset.set( 0.001, 0.001 );
	mapHeight.wrapS = mapHeight.wrapT = THREE.RepeatWrapping;
	mapHeight.format = THREE.RGBFormat;

  for (i = 0; i < numSounds; i++)
  {
    //bumpMap: mapHeight, bumpScale: 10
    material_sphere[i] = new THREE.MeshPhongMaterial( { color: 0xffffff, shininess: 10, displacementMap: mapHeight,displacementScale: 5,displacementBias: 2,side: THREE.DoubleSide,clippingPlanes: [ localPlane[i%4] ],clipShadows: true,opacity:.8} );
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
  
  // create the particle variables
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
      (Math.random() * .2) - .1 // y: random vel
      );             // z
    // add it to the geometry
    particles.vertices.push(particle);
  }
  
  // create the particle system
  particleSystem = new THREE.Points(
      particles,
      pMaterial);
  
    // also update the particle system to
  // sort the particles which enables
  // the behaviour we want
  //particleSystem.sortParticles = true;
  
  // add it to the scene
  scene.add(particleSystem);
  
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
  


  
  // sound spheres

  var audioLoader = new THREE.AudioLoader();


  for (i = 0; i < numSounds; i++)
  {
    mesh[i] = new THREE.Mesh( sphere, material_sphere[i] );
    mesh[i].position.set( soundPositions[i][0], soundPositions[i][1],soundPositions[i][2] );
    scene.add( mesh[i] );
    
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
  
  for (i = 0; i < numBuffers; i++)
  {
    audioLoader.load(soundFiles[whichFile[i]], bufferLoader);
  }

  //var helper = new THREE.GridHelper( 500, 10, 0x444444, 0x444444 );
  //helper.position.y = 0.1;
  //scene.add( helper );


  renderer = new THREE.WebGLRenderer( {antialias: true, logarithmicDepthBuffer: true} );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
	//renderer.clippingPlanes = localPlane; // GUI sets it to globalPlanes
	renderer.localClippingEnabled = true;

//bumpMap
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.renderReverseSided = false;
	renderer.gammaInput = true;
	renderer.gammaOutput = true;
	// end bumpMap
	
  container.innerHTML = "";
  container.appendChild( renderer.domElement );

  //
  controls = new THREE.FirstPersonControls( camera, renderer.domElement );

  controls.movementSpeed = 50;
  controls.lookSpeed = 0.05;
  controls.noFly = true;
  controls.lookVertical = false;




  window.addEventListener( 'resize', onWindowResize, false );
  

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight);

  //controls.handleResize();

}

function animate() {

  requestAnimationFrame( animate );
  render();

}


function render() {
  
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
  
  var delta = clock.getDelta();

  controls.update( delta );
  
  var pCount = particleCount;
  while (pCount--) {

    // get the particle
    var particle =
      particles.vertices[pCount];

    // check if we need to reset
    if (particle.y < -500) {
      particle.y = 500;
      particle.velocity.y = 0;
    }
    if (particle.x < -500) {
      particle.x = 500;
      particle.velocity.x = 0;
    }
    if (particle.z < -500) {
      particle.z = 500;
      particle.velocity.z = 0;
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

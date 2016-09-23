
var container;
var clock = new THREE.Clock();
var camera, controls, scene, renderer;

var skyGeo = [], skyMat = [], dome = [];
var numDomes = 5;
var particleCount = 500;
var myPalette = [[75,0,0],[72,26,19],[113,0,1],[112,16,17],[81,48,38],[103,38,25],[82,65,62],[147,0,2],[126,54,59],[107,70,58],[165,22,23],[171,5,10],[173,36,35],[147,71,65],[187,57,42],[128,95,84],[138,112,106],[161,104,93],[202,93,55],[208,150,132],[109,51,20],[81,72,14],[102,84,27],[185,100,0],[187,107,61],[214,96,7],[193,113,9],[183,121,40],[155,135,101],[152,144,138],[177,139,75],[196,131,92],[227,119,54],[198,141,51],[212,134,25],[172,152,142],[234,139,72],[204,154,84],[174,164,158],[223,157,62],[232,150,93],[211,164,111],[208,183,143],[233,203,160],[123,124,101],[185,191,188],[73,99,105],[76,122,137],[138,157,154],[14,19,40],[1,31,50],[26,31,52],[25,42,79],[2,63,91],[18,79,127],[53,84,111],[110,116,125],[173,175,181],[6,2,20],[57,53,61],[88,84,92],[103,99,105],[48,25,34],[170,135,146]];
//var myPalette = [[255,255,255],[37,4,0],[137,54,41],[168,27,46],[176,40,61],[168,95,98],[167,109,90],[176,125,117],[29,23,2],[63,55,6],[100,37,4],[119,48,6],[103,64,9],[97,79,13],[143,71,18],[142,82,54],[111,96,23],[175,70,12],[123,96,76],[164,88,16],[127,111,33],[132,114,93],[154,109,29],[153,126,33],[225,99,24],[208,114,29],[190,130,31],[164,142,57],[175,159,74],[206,148,34],[203,174,113],[227,165,38],[234,170,81],[214,193,175],[216,211,205],[236,224,211],[39,40,4],[45,65,16],[62,65,55],[69,80,18],[90,92,52],[105,112,68],[125,128,90],[162,162,153],[189,190,140],[237,239,234],[0,18,1],[30,52,32],[66,111,68],[132,141,125],[57,96,64],[0,29,40],[0,54,64],[109,146,135],[130,173,163],[181,201,200],[0,17,67],[14,41,57],[7,40,107],[30,64,101],[2,60,141],[61,76,83],[0,0,8],[142,60,107]];
//var myPalette = [[163,155,89],[171,153,120],[89,92,54],[98,105,81],[145,143,109],[148,157,121],[161,166,127],[150,175,118],[188,179,91],[177,182,133],[187,195,129],[195,201,156],[208,213,154],[66,78,59],[111,134,96],[126,151,113],[155,184,143],[251,255,250],[80,118,102],[107,142,127],[138,148,140],[213,254,241],[12,75,91],[45,78,70],[2,94,114],[18,108,123],[66,107,116],[45,120,142],[85,134,121],[65,136,161],[78,151,174],[88,161,184],[148,160,157],[140,179,193],[160,179,177],[142,196,207],[176,191,191],[184,203,201],[166,212,209],[194,215,215],[207,227,221],[184,232,227],[209,238,233],[32,46,56],[15,50,71],[26,64,84],[50,66,82],[34,76,109],[53,81,102],[63,91,112],[92,106,134],[82,124,147],[107,121,149],[121,135,163],[105,152,177],[144,166,186],[72,69,77],[76,78,100],[112,109,121],[149,152,184],[86,57,94],[94,74,100],[92,86,93],[102,96,103]];
particleSpeedScale = 1;
particleSpeedScaleHalf = particleSpeedScale / 2;

var reverbSoundFile = './reverbs/BX20E103.wav';
var panModel = 'equalpower';
//var panModel = 'HRTF';

var myReverbGain = 1.0;
var convolver;
var audioContext,listener;
var soundsLoaded = 0;
var numSounds = 4;
var numBuffers = 2;
var bufferCounter = 0;
var soundPositions = [[-10000,30,0], [10000,80,0], [0,0,-10000],[0,-50,10000], [-5000,30,5000], [5000,80,5000],[-5000, 0, -5000], [5000, -50, -5000]];
//var ratios = [.5,.875,1.0, 1.14285714, 1.125, 1.11111111111,1.25,1.5, 1.375,2.6,1.6,2.0];
var ratios = [1];
var soundGain = [];
var sound = [];
var analyser = [];
var material_sphere = [];
var audioLoader;
var soundFiles = ['./sounds/sunspots_whale.mp3', './sounds/buchlaems41L.mp3','./sounds/buchlaems41R.mp3','./sounds/buchlaems42L.mp3','./sounds/buchlaems42R.mp3','./sounds/buchlaems43L.mp3','./sounds/buchlaems43R.mp3'];
var noiseSoundFile = ['./sounds/synthnoise.ogg'];
var whichFile = [4,3];
var refDist = 10000;
var waitTimes = [], prevTime = [], onOff = [];
var waitMax = 13;
var waitOffset = 4;
var volRandom = 1;
var analyzerDivisor = 16;
var soundsPlaying = 0;
var loopCount = 0;
var valScalar = .1;
var noiseMesh;
var noiseSound;


var uniforms;
var controls;

var mesh = [];

var geometry = [];

var material = [];
var numWaves = 3;

var j = 0;

var waveMagnitude= [2,5,6,7];

var hemiLight = [];
var dirLight;

var worldWidth = 128, worldDepth = 128,
worldHalfWidth = worldWidth / 2, worldHalfDepth = worldDepth / 2;

var bgColor = 0x0;
  
var myColor, myColorCombined, myColorCombine2, myColorCombinedTop, myColorCombinedBottom;
var start = Date.now();


init();
animate();


function init() {

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



	dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
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
	
	hemiLight[0] = new THREE.HemisphereLight( getPaletteColor(), getPaletteColor(), .3 );
	hemiLight[0].position.set( 10, 500, 0);
	scene.add( hemiLight[0] );
	
	
	hemiLight[1] = new THREE.HemisphereLight( getPaletteColor(), getPaletteColor(), .3);
	hemiLight[1].position.set( 10, -500, 0);
	scene.add( hemiLight[1] );

	scene.fog = new THREE.FogExp2( getPaletteColor(), 0.0001 );


	var vertexShader = document.getElementById( 'vertexShader' ).textContent;
	var fragmentShader = document.getElementById( 'fragmentShader' ).textContent;

  for (j = 0; j < numDomes; j++)
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
  	//uniforms.topColor.value.copy( hemiLight.color );
  	//scene.fog.color.copy( uniforms.bottomColor.value );
  	skyGeo[j] = new THREE.SphereGeometry( (4000*(j+1)), 32, 32 );
  	//skyGeo[j] = new THREE.IcosahedronGeometry( 20,4 );
  	skyMat[j] = new THREE.ShaderMaterial( { vertexShader: vertexShader, fragmentShader: fragmentShader, uniforms: uniforms, side: THREE.BackSide } );
  	dome[j] = new THREE.Mesh( skyGeo[j], skyMat[j] );
  	scene.add( dome[j] );
  }
  	// make some waves!!
  	/*
  var texture = new THREE.TextureLoader().load( "textures/new/Black.png" );
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set( 1, 1 ); 
  */
  for (j = 0; j < numWaves; j++)
  {
  	geometry[j] = new THREE.PlaneGeometry( 100000, 100000, worldWidth - 1, worldDepth - 1 );
  	geometry[j].rotateX( - Math.PI / 2 );
  	geometry[j].rotateY(Math.random() * 3.14 );
  	
    /*
  	for ( var i = 0, l = geometry[j].vertices.length; i < l; i ++ ) {
  
  		geometry[j].vertices[ i ].y = waveMagnitude[j] * Math.random();
  
  	}
  	//geometry[j].dynamic = true;
  	*/
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
  	mesh[j] = new THREE.Mesh( geometry[j], material[j] );
  	mesh[j].receiveShadow = true;

  	scene.add( mesh[j] );
  }
  
  
        // create the particle variables
  
  particles = new THREE.Geometry();
      
  var textureLoader = new THREE.TextureLoader();
  
  // create the particle variables
  var particleColor = getPaletteColor();
  pMaterial = new THREE.PointsMaterial({
    color: particleColor,
    size: 5,
    map: textureLoader.load("./images/lens.png"),
    blending: THREE.AdditiveBlending,
    transparent: true
  });
  //pMaterial.depthWrite: false,
  pMaterial.alphaTest = 0.5;
  
  // now create the individual particles
  for (var p = 0; p < particleCount; p++) {
  
    // create a particle with random
    // position values, -250 -> 250
    var pX = Math.random() * 50000 - 25000,
        pY = Math.random() * 25000 - 25000,
        pZ = Math.random() * 50000 - 25000;
    
    var particle = new THREE.Vector3(pX, pY, pZ);
    // create a velocity vector
    particle.velocity = new THREE.Vector3(
      (Math.random() * particleSpeedScale) - particleSpeedScaleHalf,
      (Math.random() * particleSpeedScale) - particleSpeedScaleHalf,
      (Math.random() * particleSpeedScale) - particleSpeedScaleHalf // y: random vel
      );             // z
    // add it to the geometry
    particles.vertices.push(particle);
  }
  
  // create the particle system
  particleSystem = new THREE.Points(
      particles,
      pMaterial);
    // add it to the scene
  scene.add(particleSystem);
  
  
  
  
  // audio stuff
  var sphere = new THREE.SphereGeometry( 100, 3, 2 );
  for (i = 0; i < numSounds; i++)
  {
    //bumpMap: mapHeight, bumpScale: 10
    material_sphere[i] = new THREE.MeshPhongMaterial( { color: 0xffffff, shininess: 10,side: THREE.DoubleSide,opacity:.8} );
    material_sphere[i].castShadow = false;
		material_sphere[i].receiveShadow = false;
		material_sphere[i].visible = false;
    
  }
  listener = new THREE.AudioListener();
  audioContext = THREE.AudioContext;
  camera.add(listener);
  
  convolver = audioContext.createConvolver();
  var reverbGain = audioContext.createGain();
// grab audio track via XHR for convolver node
  reverbGain.gain.value = myReverbGain;
  var soundSource, SpringReverbBuffer;
  
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
  
  
  //noise in center
  noiseMesh = new THREE.Mesh( sphere, material_sphere[0] );
  noiseMesh.position.set( 0, 0, 0 );
  scene.add(noiseMesh);
  noiseSound =new THREE.PositionalAudio( listener );
  noiseSound.setPanningModel(panModel);
  noiseSound.setFilter(soundGain[i]);
  noiseSound.setRolloffFactor(2);
  noiseMesh.add(noiseSound);
  
  
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
  var audioLoader = new THREE.AudioLoader();
  for (i = 0; i < numBuffers; i++)
  {
    audioLoader.load(soundFiles[whichFile[i]], bufferLoader);
  }
  audioLoader.load(noiseSoundFile, noiseLoader);
  
  //controls stuff
  
	controls = new THREE.FirstPersonControls( camera, renderer.domElement );
  controls.movementSpeed = 1000;
  controls.lookSpeed = 0.05;
  controls.noFly = true;
  controls.lookVertical = false;
  
	window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setClearColor( bgColor);
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );

	render();

}

function animate()
{
  			requestAnimationFrame( animate );
				//controls.update(); // required if controls.enableDamping = true, or if controls.autoRotate = true
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
            console.log("on");
            console.log(i);
          }
          else
          {
            onOff[i] = 0;
            soundGain[i].gain.cancelScheduledValues(now);
            soundGain[i].gain.setTargetAtTime(0.00000001, now, .2);
            console.log("off");
            console.log(i);
          }
          prevTime[i] = now;
          
        }
      }
    }
    
    for (i = 0; i < numSounds; i++)
    {
      waveMagnitude[i] = analyser[i].getAverageFrequency() / analyzerDivisor;
    }
    
    loopCount++;
  }

  for (var j = 0; j < numWaves; j++)
  {
    material[j].uniforms[ 'time' ].value = .000025 * (j + 1) *( waveMagnitude[j] * 10 );
    //material[j].uniforms[ 'bscalar' ].value = waveMagnitude[j] * 1 + 50;
    material[j].uniforms[ 'amp' ].value = waveMagnitude[j] * 1 + 50;
  }
  
  for (j = 0; j < numDomes; j++)
  {
    skyMat[j].uniforms[ 'time' ].value = .000025 * (j + 1) *( Date.now() - start );
  }
  
  


  var pCount = particleCount;
  while (pCount--) {

    // get the particle
    var particle =
      particles.vertices[pCount];

    // check if we need to reset
    if (particle.y < -50000) {
      particle.velocity.y = 1 * particleSpeedScale;
    }
    if (particle.y > 0) {
      particle.velocity.y = -1 * particleSpeedScale;
    }
    if (particle.x < -50000) {
      particle.velocity.x = 1 * particleSpeedScale;
    }
    else if (particle.x > 50000) {
      particle.velocity.x = -1 * particleSpeedScale;
    }
    if (particle.z < -50000) {
      particle.velocity.z = 1 * particleSpeedScale;
    }
    else if (particle.z > 50000) {
      particle.velocity.z = -1 * particleSpeedScale;
    }
    
    // update the velocity with
    // a splat of randomniz
    particle.velocity.x += (Math.random() * particleSpeedScale) - particleSpeedScaleHalf;
    particle.velocity.y += (Math.random() * particleSpeedScale) - particleSpeedScaleHalf;
    particle.velocity.z += (Math.random() * particleSpeedScale) - particleSpeedScaleHalf;
    //console.log(particle.velocity);
    // and the position
    particle.add(
    particle.velocity);
  }

  // flag to the particle system
  // that we've changed its vertices.
  particleSystem.geometry.verticesNeedUpdate = true;
  
  controls.update(clock.getDelta());
	renderer.render( scene, camera );
}

function getPaletteColor()
{
  	var myIndex = (Math.round(Math.random() * (myPalette.length - 1)));
  	myColor = myPalette[myIndex];
  	console.log(myIndex);
  	return ((myColor[0] << 16) + (myColor[1] << 8) + myColor[2]);	
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

function noiseLoader(buffer) 
{

  console.log("noise");
  noiseSound.setBuffer( buffer );
  noiseSound.setRefDistance( 100);
  noiseSound.setLoop(true);
  noiseSound.setStartTime(Math.random()*((buffer.length / 44100) - 6));
  noiseSound.setPlaybackRate(.7);
  noiseSound.panner.connect(convolver);
  //bufferCounter++
  whenLoaded();
}


function whenLoaded()
{
  soundsLoaded++;
  var now = audioContext.currentTime;
  console.log(now);
  console.log(soundsLoaded);
  
  //(numBuffers + 2) because the convolution buffer and noiseSound should also call this function
  if (soundsLoaded == (numBuffers + 2))
  {
    soundsLoaded = 0;
    
    for (i = 0; i < numSounds; i++)
    {
      soundGain[i].gain.setValueAtTime(0,now);
      
      //sound1.connect(masterGain); 
      sound[i].play();
      //sound2.play();
      //sound3.play();
      //sound4.play();
      
      prevTime[i] = now;
      waitTimes[i] = ((Math.random() * waitMax) + waitOffset);
      console.log(i);
      //console.log(waitTimes[i]);
      onOff[i] = Math.round(Math.random());
      console.log(onOff[i]);
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
    noiseSound.play();
  }
}


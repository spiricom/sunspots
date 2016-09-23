if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container;
var stats;
var controls;
var camera, scene, renderer;

var clothGeometry = [];
var groundMaterial;

var object = [];
var collidableMeshList = [];

var gainNode;

var gui;
var guiControls;

var clothMaterial = [];

var firstTime = 1;

var clothColors = [];

var prevClothColors = [];

var numCloths = 4;

var context;

var audioBuffer = [];

var sourceNode = [];

var analyser = [];
var fftArray = [];
var panners = [];
var array;
var listener;
var myCounter = 0;
var counterMax = 300;
var flasher = 0;
init();
animate();

function init() {

	container = document.createElement( 'div' );
	document.body.appendChild( container );
	
	// check if the default naming is enabled, if not use the chrome one.
  if (! window.AudioContext) {
      if (! window.webkitAudioContext) {
          alert('no audiocontext found');
      }
      window.AudioContext = window.webkitAudioContext;
  }
  context = new AudioContext();
  array =  new Uint8Array(512);
  listener = context.listener;
  listener.setOrientation(0,0,-5,0,1,0);
  
  for (var w = 0; w < numCloths; w++)
  {
    // setup a analyzer

    var panner = context.createPanner();
    panner.panningModel = 'equalpower';
    panner.distanceModel = 'exponential';
    panner.refDistance = 1;
    panner.maxDistance = 1000;
    panner.rolloffFactor = .1;
    panner.coneInnerAngle = 300;
    panner.coneOuterAngle = 0;
    panner.coneOuterGain = .7;
    panner.setOrientation(0,1,0);
    panner.setPosition(((Math.random()-.5)*30), ((Math.random()-.5)*30), ((Math.random()-.5)*30));
    panner.connect(context.destination);
    panners.push(panner);
    
    var an = context.createAnalyser();
    an.smoothingTimeConstant = 0.3;
    an.fftSize = 1024;
    an.connect(panners[w]);
    analyser.push(an);
    
    
        // create a buffer source node
    var sn = context.createBufferSource();
    // and connect to destination
    sn.connect(analyser[w]);
    loadSound(w);
    sourceNode.push(sn);

  }
  //create background sound
    var an = context.createAnalyser();
    an.smoothingTimeConstant = 0.2;
    an.fftSize = 1024;
    an.connect(context.destination);
    analyser.push(an);
    
    gainNode = context.createGain();
    gainNode.connect(analyser[4]);
    gainNode.gain.setValueAtTime(0, context.currentTime);
    // create a buffer source node
    var sn = context.createBufferSource();
    // and connect to destination
    sn.connect(gainNode);
    loadSound(4);
    sourceNode.push(sn);
  


	/*
	var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  var analyser = audioCtx.createAnalyser();
  source = audioCtx.createMediaStreamSource(stream);
  source.connect(analyser);
  analyser.connect(distortion);
  // etc.
  
  analyser.fftSize = 2048;
  var bufferLength = analyser.frequencyBinCount;
  var dataArray = new Uint8Array(bufferLength);

  
  analyser.getByteFrequencyData(dataArray);
  */
	// scene (First thing you need to do is set up a scene)
	scene = new THREE.Scene();
	//scene.fog = new THREE.Fog( 0xcce0ff, 500, 10000 );

	// camera (Second thing you need to do is set up the camera)
	camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.x = 500;//450;
	camera.position.y = 500;//450;
	camera.position.z = 500;//1500;
	scene.add( camera );
	//camera.add(listener);

	// renderer (Third thing you need is a renderer)
	renderer = new THREE.WebGLRenderer( { antialias: true, devicePixelRatio: 1 } );
	//renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	//renderer.setClearColor( scene.fog.color );
	//renderer.setClearColor(0xffffff);

	container.appendChild( renderer.domElement );
	renderer.gammaInput = true;
	renderer.gammaOutput = true;
	renderer.shadowMap.enabled = true;

	// This gives us stats on how well the simulation is running
	stats = new Stats();
	container.appendChild( stats.domElement );

	// mouse controls
	controls = new THREE.TrackballControls( camera, renderer.domElement );

	// lights (fourth thing you need is lights)
	var light, materials;
	scene.add( new THREE.AmbientLight( 0x666666 ) );
	light = new THREE.DirectionalLight( 0xdfebff, 1.75 );
	light.position.set( 50, 200, 100 );
	light.position.multiplyScalar( 1.3 );
	light.castShadow = false;
	// light.shadowCameraVisible = true;
	light.shadow.mapSize.width = 1024;
	light.shadow.mapSize.height = 1024;

	var d = 300;
	light.shadow.camera.left = -d;
	light.shadow.camera.right = d;
	light.shadow.camera.top = d;
	light.shadow.camera.bottom = -d;
	light.shadow.camera.far = 1000;

	scene.add( light );


	// cloth (Now we're going to create the cloth)
	// every thing in our world needs a material and a geometry

	
	// this part allows us to use an image for the cloth texture
	// can include transparent parts
	var loader = new THREE.TextureLoader();
	//var clothTexture = loader.load( "textures/new/Velvet_Red.png" )
	//var clothTexture = loader.load( "textures/new/Velvet_DeepRed.png" )
	//var clothTexture = loader.load( "textures/new/Grunge Surface 2.png" )
	//var clothTexture = loader.load( "textures/new/Granite 4.png" )
	//var clothTexture = loader.load( "textures/new/Brown.png" )
	//var clothTexture = loader.load( "textures/new/BabyBlue.png" )
	//var clothTexture = loader.load( "textures/new/Boulder1.png" )
	var clothTexture = loader.load( "textures/grungy/4559510781_4e94a042b2_o_b.jpg" );
	//var clothTexture = loader.load( "textures/grungy/4602202938_a1011dddd2_o.jpg" );
	
	clothTexture.wrapS = clothTexture.wrapT = THREE.RepeatWrapping;
	clothTexture.anisotropy = 128;
	

	// cloth material
	// this tells us the material's color, how light reflects off it, etc.
  var w = 0;
  
  makeCloths();
  
  for (w = 0; w < numCloths; w++)
  {
  	
  	clothColors[w] = [];
  	prevClothColors[w] = [];
  	for (var i = 0; i < 3; i++)
  	{
  	  clothColors[w][i] = Math.random();
  	  prevClothColors[w][i] = clothColors[w][i];
  	}
  	var myColor;
  	var mySpecular;
  	var myTexture;
  	

	  myColor = HSVtoRGB(clothColors[w][0],clothColors[w][1],clothColors[w][2]);
	  mySpecular = 0x0;
	  myTexture = clothTexture;
  	
  	
  	//var myColor = HSVtoRGB(clothColors[w][0],clothColors[w][1],clothColors[w][2]);
  	clothMaterial[w] = new THREE.MeshPhongMaterial( {
  		color: myColor,
  		specular: mySpecular,
  		wireframeLinewidth: 1.5,
  		map: myTexture,
  		side: THREE.DoubleSide,
  		alphaTest: 0.5
  	} );
    
  	// cloth geometry
  	// the geometry contains all the points and faces of an object
  	clothGeometry[w] = new THREE.ParametricGeometry( clothInitialPosition[w], cloth[w].w, cloth[w].h );
  	clothGeometry[w].dynamic = true;

  	
  	// more stuff needed for the texture
  	var uniforms = { texture:  { type: "t", value: clothTexture } };
  	var vertexShader = document.getElementById( 'vertexShaderDepth' ).textContent;
  	var fragmentShader = document.getElementById( 'fragmentShaderDepth' ).textContent;
  	

  	// cloth mesh
  	// a mesh takes the geometry and applies a material to it
  	// so a mesh = geometry + material
    	object[w] = new THREE.Mesh( clothGeometry[w], clothMaterial[w] );
    	object[w].position.set( 0, 0, 0 );
    	object[w].castShadow = false;
  
  	// whenever we make something, we need to also add it to the scene
  	scene.add( object[w] ); // add cloth to the scene
  	//collidableMeshList.push(object);

  	
  	// more stuff needed for texture
  	object.customDepthMaterial = new THREE.ShaderMaterial( {
  		uniforms: uniforms,
  		vertexShader: vertexShader,
  		fragmentShader: fragmentShader,
  		side: THREE.DoubleSide
  	} );
  	
  }

  	// ground
  
	/*
	// needed for ground texture
	var groundTexture = loader.load( "textures/terrain/grasslight-big.jpg" );
	groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
	groundTexture.repeat.set( 25, 25 );
	groundTexture.anisotropy = 16;
	*/

	// ground material
	groundMaterial = new THREE.MeshPhongMaterial(
		{
			color: 0x0,//0x3c3c3c,
			specular: 0x0//0x3c3c3c//,
			//map: groundTexture
		} );

	// ground mesh
	var mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 20000, 20000 ), groundMaterial );
	mesh.position.y = -250;
	mesh.rotation.x = - Math.PI / 2;
	mesh.receiveShadow = true;
	scene.add( mesh ); // add ground to scene



	//console.log('bounding box coordinates: ' + '(' + boundingBox.min.x + ', ' + boundingBox.min.y + ', ' + boundingBox.min.z + '), ' + '(' + boundingBox.max.x + ', ' + boundingBox.max.y + ', ' + boundingBox.max.z + ')' );

	window.addEventListener( 'resize', onWindowResize, false );


	// some initial conditions here
	// pinCloth sets how the cloth is pinned
	pinCloth('Corners');

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {

	if (firstTime == 1)
	{
  	requestAnimationFrame( animate );
  
  	var time = Date.now();
  
  	simulate(time); // run physics simulation to create new positions of cloth
  	render(); 		// update position of cloth, compute normals, rotate camera, render the scene
  	stats.update();
  	controls.update();
	}
	//firstTime = 0;
}

// restartCloth() is used when we change a fundamental cloth property with a slider
// and therefore need to recreate the cloth object from scratch
function restartCloth()
{
		var w = 0;
		
		for (w = 0; w < numCloths; w++)
		{
		
  		scene.remove(object[w]);
  		//clothInitialPosition = plane( 500, 500 );
  		cloth[w] = new Cloth( xSegs, ySegs, fabricLength, w );
  
  		//GRAVITY = 9.81 * 140; //
  		gravity = new THREE.Vector3( 0, - GRAVITY, 0 ).multiplyScalar( MASS );
  
  		// recreate cloth geometry
  		clothGeometry[w] = new THREE.ParametricGeometry( clothInitialPosition[w], xSegs, ySegs );
  		clothGeometry[w].dynamic = true;
  
  		// recreate cloth mesh
  		object[w] = new THREE.Mesh( clothGeometry[w], clothMaterial[w] );
  		object[w].position.set( 0, 0, 0 );
  		object[w].castShadow = true;
  
  		scene.add( object[w] ); // adds the cloth to the scene
		}
}

// the rendering happens here
function render() {

	var timer = Date.now() * 0.0002;
  
  var w = 0;
  
  for (w = 0; w < numCloths; w++)
  {
  	// update position of the cloth
  	// i.e. copy positions from the particles (i.e. result of physics simulation)
  	// to the cloth geometry
  	var p = cloth[w].particles;
  	for ( var i = 0, il = p.length; i < il; i ++ ) {
  		clothGeometry[w].vertices[ i ].copy( p[ i ].position );
  	}
  
  	// recalculate cloth normals
  	clothGeometry[w].computeFaceNormals();
  	clothGeometry[w].computeVertexNormals();
  
  	clothGeometry[w].normalsNeedUpdate = true;
  	clothGeometry[w].verticesNeedUpdate = true;
    
    //panners[w].setPosition(clothGeometry[w].vertices[0]);

    analyser[w].getByteFrequencyData(array);
    //console.log(array);
    
    var average = getAverageVolume(array);
    //console.log(average);

  	for (var i = 0; i < 3; i++)
  	{
  	  var tempColor = clothColors[w][i];
  	  //console.log(tempColor);
  	  tempColor += ((Math.random() - .5) *.03);
  	  clothColors[w][i] = average / 30;
  	  //clothColors[w][i] = tempColor;
  	}
  	
  	clothMaterial[w].color.setHex(HSVtoRGB(clothColors[w][0], clothColors[w][1], clothColors[w][2]));
	}
  if (flasher == 1)
  {

    analyser[4].getByteFrequencyData(array);
    average = getAverageVolume(array);
    groundMaterial.color.setHex(HSVtoRGB(0, 0, average / 20));
  }
  else
  {
    groundMaterial.color.setHex(0x000000);
  }
	if (myCounter >= counterMax)
	{
	  myCounter = 0;
	  now = context.currentTime;
	  if (flasher == 1)
	  {
	    counterMax = ((Math.random()* 3000) + 100);
	    gainNode.gain.linearRampToValueAtTime(0, now + .2);
	  }
	  else
	  {
	    counterMax = ((Math.random()* 100) + 100);
	    gainNode.gain.linearRampToValueAtTime(1.0, now +.2);
	  }
	  //console.log(counterMax);
	  flasher = !flasher;
	}	   
	myCounter++;
	//console.log(myCounter);
	//console.log("flasher");
	//console.log(flasher);
	
	
	
  //sourceNode[4].playbackRate = 0;
	// option to auto-rotate camera
	if ( rotate ) {
		var cameraRadius = Math.sqrt(camera.position.x*camera.position.x + camera.position.z*camera.position.z);
		camera.position.x = Math.cos( timer ) * cameraRadius;
		camera.position.z = Math.sin( timer ) * cameraRadius;
	}
  //console.log()
	camera.lookAt( scene.position );
	listener.setOrientation(camera.position.x,camera.position.y,camera.position.z,0,1,0);
	renderer.render( scene, camera ); // render the scene
}



function HSVtoRGB(h, s, v) {
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
    var result = Math.round(((r*255)<<16) + ((g*255)<< 8) + (b*255));
    
    return result;
}



// load the specified sound
function loadSound(w) {
    var url;
    
    if (w == 0)
    { 
      var url = "./sounds/sunspots5_bl_mono.ogg";
    }
    else if (w == 1)
    {
      var url = "./sounds/sunspots5_br_mono.ogg";
    }
    else if (w == 2)
    {
      var url = "./sounds/sunspots5_fl_mono.ogg";
    }
    else if (w == 3)
    {
      var url = "./sounds/sunspots5_fr_mono.ogg";
    }
    else if (w == 4)
    {
      var url = "./sounds/timpani_improv.mp3";
    }
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    // When loaded decode the data
    request.onload = function() {

        // decode the data
        context.decodeAudioData(request.response, function(buffer) {
            // when the audio is decoded play the sound
            playSound(buffer, w);
        }, onError);
    }
    request.send();
}


function playSound(buffer, w) {
  sourceNode[w].buffer = buffer;

  sourceNode[w].loop = true;
  sourceNode[w].start(0);

}

function getAverageVolume(array) 
{
  var values = 0;
  var average;

  var length = array.length;

  // get all the frequency amplitudes
  for (var i = 0; i < length; i++) {
      values += array[i];
  }

  average = values / length;
  return average;
}

// log if an error occurs
function onError(e) 
{
  console.log(e);
}

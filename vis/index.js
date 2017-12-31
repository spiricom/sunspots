"use strict";

// config
var fontPath = "fonts/Times_Italic.typeface.json";
var statsEnabled = false;
var skin3dEnabled = true;

// misc globals
var stats;

var scene;
var bgScene;
var frontScene;

var renderer;

var shaderSystem;

var audioSystem;

var composer, copyPass, ssaaRenderPass;

var camera;
var controls;

var font;

var mat;

// controls globals
var targetRotation = 0;
var targetRotationOnMouseDown = 0;

var mouseX = 0;
var mouseXOnMouseDown = 0;


// 3d scene stuff
var radius = 100, theta = 0;

var objs = [];
var frontSceneObjs = [];
///////////////

init();

function init(){

  // require webgl
  if( !Detector.webgl ){
    Detector.addGetWebGLMessage();
    return true;
  }

  // renderer
  renderer = new THREE.WebGLRenderer({
    antialias: false,
    preserveDrawingBuffer: true,
  });
  renderer.setClearColor( 0xffffff, 0 );
  renderer.autoClear = false;
  renderer.setPixelRatio( 1 );
  document.body.appendChild(renderer.domElement);

  // stats
  if (statsEnabled) {
    stats = new Stats();
    // stats.domElement.style.position = 'absolute';
    // stats.domElement.style.bottom = '0px';
    document.body.appendChild( stats.domElement );
  }

  function updateFragDefines(defs) {};
  shaderSystem = ShaderSystem(renderer, updateFragDefines);


  camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 10000 );

  audioSystem = VisAudio(camera);
  
  scene = new THREE.Scene();
  bgScene = new THREE.Scene();
  frontScene = new THREE.Scene();
  
  var light = new THREE.DirectionalLight( 0xffffff, 1 );
  light.position.set( 1, 1, 1 ).normalize();
  scene.add( light );

  mat = new THREE.ShaderMaterial({
    uniforms: {
      texture: { type: 't', },
      prevViewMatrix: { type: 'm4', },
      prevModelMatrix: { type: 'm4', },
    },
    vertexShader: document.getElementById( "vertexShader" ).textContent,
    fragmentShader: document.getElementById( "fragmentShader1" ).textContent,
    side: THREE.DoubleSide,
  });

  var lambertMat = new THREE.MeshNormalMaterial( { 
    // color: Math.random() * 0x303030,
    side: THREE.DoubleSide,
  } );

  var geometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
  // var geometry = new THREE.SphereBufferGeometry( 1 );

  // var object = new THREE.Mesh( geometry, mat.clone() );
  // scene.add( object );
  // objs.push(object);

  {
    var object = new THREE.Mesh( geometry, mat.clone() );
    object.position.y = 53;
    // object.position.x = 53;
    object.scale.x = 100;
    object.scale.y = 100;
    object.scale.z = 100;
    scene.add( object );
    objs.push(object);
  }
  {
    var object = new THREE.Mesh( geometry, mat.clone() );
    object.position.y = -55;
    // object.position.x = 53;
    object.scale.x = 100;
    object.scale.y = 100;
    object.scale.z = 100;
    object.rotation.x = 0.30;
    scene.add( object );
    objs.push(object);
  }
  // {
  //   var object = new THREE.Mesh( geometry, mat.clone() );
  //   object.position.y = -10;
  //   object.position.x = 40;
  //   object.position.z = 40;
  //   object.scale.x = 20;
  //   object.scale.y = 100;
  //   object.scale.z = 20;
  //   scene.add( object );
  //   objs.push(object);
  // }
  {
    var object = new THREE.Mesh( geometry, mat.clone() );
    object.position.x = -10;
    object.position.y = 40;
    object.position.z = 40;
    object.scale.x = 20;
    object.scale.y = 100;
    object.scale.z = 20;
    scene.add( object );
    objs.push(object);
  }

  // screen quad
  var quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      vertexShader: document.getElementById("quadVertexShader").textContent,
      fragmentShader: document.getElementById("fragmentShaderBasic").textContent,
      depthWrite: false,
      depthTest: false
    })
  );
  bgScene.add(quad);

  // controls
  controls = new THREE.TrackballControls( camera, renderer.domElement );
  camera.position.z = 20;
  controls.noZoom = true;
  controls.noPan = true;

  // front scene

  var normalMat = new THREE.MeshNormalMaterial({});

  var cutGeometry = new THREE.BoxBufferGeometry( 0.5, 0.5, 0.5, 1, 1, 1 );
  // var cutGeometry = new THREE.TetrahedronBufferGeometry( 0.5 );
  // var cutGeometry = new THREE.SphereBufferGeometry( 1, 4, 4 );
  // var cutGeometry = new THREE.PlaneBufferGeometry( 1, 4, 4 );
  
  for ( var i = 0; i < 700; i ++ ) {
    var basicMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(Math.random(), Math.random(), Math.random()),
    });

    object.basicMat = basicMat;
    object.normalMat = normalMat;
    var object = new THREE.Mesh( cutGeometry, normalMat );

    object.position.x = (Math.random() * (Math.random() < 0.5 ? -1 : 1)) * 13;
    object.position.y = (Math.random() * (Math.random() < 0.5 ? -1 : 1)) * 13;
    object.position.z = (Math.random() * (Math.random() < 0.5 ? -1 : 1)) * 13;

    object.rotation.x = Math.random() * 2 * Math.PI;
    object.rotation.y = Math.random() * 2 * Math.PI;
    object.rotation.z = Math.random() * 2 * Math.PI;

    // object.scale.x = 0.4 * Math.random() + 10.4;
    // object.scale.y = 0.03;
    // object.scale.z = 0.03;
    
    object.baseScaleX = object.scale.x;

    frontSceneObjs.push(object)
    scene.add( object );

    object.basicClone = new THREE.Mesh( cutGeometry, basicMat );
    
    object.basicClone.position.copy( object.position );
    object.basicClone.rotation.copy( object.rotation );

    scene.add( object.basicClone );
  }


  // setInterval(update, 1 / 30 * 1000);
  update();
}

function update() {
  requestAnimationFrame( update );

  render();

  if (stats) stats.update();
}


function render() {

  if (shaderSystem.initialized) {

    // uniforms from audio
    var numSounds = audioSystem.numSoundSources;
    for (var i = 0; i < numSounds; i++) {
      shaderSystem.setUniform("u_control" + i, audioSystem.ampVariables[i]);
    }
    for (var i = 0; i < numSounds; i++) {
      var idx = i + numSounds;
      shaderSystem.setUniform("u_control" + idx, audioSystem.freqVariables[i]);
    }

    var numFrontObjs = frontSceneObjs.length;
    var a = audioSystem.ampVariables[2];
    var f = audioSystem.freqVariables[2];
    
    if (f) {
      for (var i = 0; i < numFrontObjs; i++) {
        var obj = frontSceneObjs[i];
        
        var newScale = a * 0.06;

        newScale = newScale*newScale;

        newScale += 1;
        
        // newScale = obj.scale.x * 0.8 + newScale * 0.2;
        obj.scale.x = Math.max(newScale, 1);
        
        var invOtherScale = Math.pow(newScale, 2);
        
        invOtherScale = Math.min(Math.max(invOtherScale, 0.2), 30);

        var otherScale = 1 / invOtherScale;

        obj.scale.y = otherScale;
        obj.scale.z = otherScale;

        obj.basicClone.scale.copy(obj.scale);
        if (newScale > 6.0) {
          obj.basicClone.material.visible = true;
          obj.material.visible = false;
        }
        else {
          obj.basicClone.material.visible = false;
          obj.material.visible = true;          
        }
      }
    }


    // update shadersystem
    shaderSystem.updateAndRender();

    renderer.clearDepth();
    renderer.render( frontScene, camera );


    // skinned 3d stuff
    if (skin3dEnabled) {
      var rts = shaderSystem.getRenderTarget(2);
      var prevViewMatrix = camera.matrixWorld.clone();
      
      for (var i = 0; i < objs.length; i++) {
        var obj = objs[i];

        obj.material.uniforms.texture.value = rts[2][1].texture;
        obj.material.uniforms.prevViewMatrix.value = prevViewMatrix;

        obj.material.uniforms.prevModelMatrix.value = obj.modelViewMatrix.clone();
      }

      theta += 0.2;
      camera.lookAt( scene.position );

      controls.update();
      camera.updateMatrixWorld();

      renderer.autoClear = false;

      renderer.clearTarget(rts[2][0]);
      renderer.render( bgScene, camera, rts[2][0] );
      renderer.render( scene, camera, rts[2][0] );

      var temp = rts[2][0];
      rts[2][0] = rts[2][1];
      rts[2][1] = temp;
    }
  }

}


"use strict";

// config
var fontPath = "fonts/Times_Italic.typeface.json";
var statsEnabled = false;

// misc globals
var stats;

var scene, bgScene;
var renderer;

var shaderSystem;

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



  camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 10000 );
  
  scene = new THREE.Scene();
  bgScene = new THREE.Scene();
  
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

  var lambertMat = new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } );

  // var geometry = new THREE.BoxBufferGeometry( 600, 600, 600 );
  var geometry = new THREE.SphereBufferGeometry( 600 );

  // var object = new THREE.Mesh( geometry, mat.clone() );
  // scene.add( object );
  // objs.push(object);

  for ( var i = 0; i < 4; i ++ ) {
    var object = new THREE.Mesh( geometry, mat.clone() );
    // var object = new THREE.Mesh( geometry, lambertMat );
    object.position.x = (Math.random()*0.4+0.6 * (Math.random() < 0.5 ? -1 : 1)) * 600;
    object.position.y = (Math.random()*0.4+0.6) * 600;
    object.position.z = (Math.random()*0.4+0.6 * (Math.random() < 0.5 ? -1 : 1)) * 600;
    // object.rotation.x = Math.random() * 2 * Math.PI;
    // object.rotation.y = Math.random() * 2 * Math.PI;
    // object.rotation.z = Math.random() * 2 * Math.PI;
    object.scale.x = 0.8;
    object.scale.y = 0.8;
    object.scale.z = 0.8;
    scene.add( object );
    objs.push(object);
  }

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


  controls = new THREE.TrackballControls( camera, renderer.domElement );
  camera.position.z = 20;
  controls.noZoom = true;
  controls.noPan = true;

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
    shaderSystem.updateAndRender();

    var rts = shaderSystem.getRenderTarget(2);
    var prevViewMatrix = camera.matrixWorld.clone();
    
    for (var i = 0; i < objs.length; i++) {
      var obj = objs[i];


      // obj.rotation.x -= 0.01;
      // obj.rotation.y -= 0.01;
      // obj.rotation.z -= 0.01;

      obj.material.uniforms.texture.value = rts[2][1].texture;
      obj.material.uniforms.prevViewMatrix.value = prevViewMatrix;

      obj.material.uniforms.prevModelMatrix.value = obj.modelViewMatrix.clone();
    }

    theta += 0.2;
    // camera.position.x = radius * Math.sin( THREE.Math.degToRad( theta ) );
    // camera.position.y = radius * Math.sin( THREE.Math.degToRad( theta ) );
    // camera.position.z = radius * Math.cos( THREE.Math.degToRad( theta ) );
    camera.lookAt( scene.position );

    controls.update();
    camera.updateMatrixWorld();

    renderer.autoClear = false;

    // renderer.clear();
    // renderer.render( bgScene, camera );
    // renderer.render( scene, camera );

    renderer.clearTarget(rts[2][0]);
    renderer.render( bgScene, camera, rts[2][0] );
    renderer.render( scene, camera, rts[2][0] );

    var temp = rts[2][0];
    rts[2][0] = rts[2][1];
    rts[2][1] = temp;
  }

}


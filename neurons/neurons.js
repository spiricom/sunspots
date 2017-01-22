"use strict";

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();


// init camera, scene, renderer
var scene, camera, renderer;
var clock;

var tuniform;

window.onload = function() {
  var sl = new ShaderLoader();
  sl.loadShaders({
    neurons_vert : "",
    neurons_frag : "",
  }, "./glsl/", init );
};

function init() {
  scene = new THREE.Scene();
  
  var fov = 75;
  var aspect = window.innerWidth / window.innerHeight;

  camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
  camera.position.z = 100;
  camera.lookAt(scene.position);

  renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(0xff00ff);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  
  clock = new THREE.Clock();

  tuniform = {
    time: {
      type: 'f',
      value: 0.1
    },
    resolution: {
      type: 'v2',
      value: new THREE.Vector2()
    },
    mouse: {
      type: 'v4',
      value: new THREE.Vector2()
    }
  };

  // Mouse position in - 1 to 1
  renderer.domElement.addEventListener('mousedown', function(e) {
    var canvas = renderer.domElement;
    var rect = canvas.getBoundingClientRect();
    tuniform.mouse.value.x = (e.clientX - rect.left) / window.innerWidth * 2 - 1;
    tuniform.mouse.value.y = (e.clientY - rect.top) / window.innerHeight * -2 + 1; 
  });
  renderer.domElement.addEventListener('mouseup', function(e) {
    var canvas = renderer.domElement;
    var rect = canvas.getBoundingClientRect();
    tuniform.mouse.value.z = (e.clientX - rect.left) / window.innerWidth * 2 - 1;
    tuniform.mouse.value.w = (e.clientY - rect.top) / window.innerHeight * -2 + 1;
  });

  // resize canvas function
  window.addEventListener('resize', onResize);
  tuniform.resolution.value.x = window.innerWidth;
  tuniform.resolution.value.y = window.innerHeight;
  
  // Create Plane
  var material = new THREE.ShaderMaterial({
    uniforms: tuniform,
    vertexShader: ShaderLoader.get("neurons_vert"),
    fragmentShader: ShaderLoader.get("neurons_frag"),
  });
  var mesh = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(window.innerWidth, window.innerHeight, 40), material
  );
  scene.add(mesh);

  // start update loop
  update();
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function update(time) {
  tuniform.time.value += clock.getDelta();
  requestAnimationFrame(update);
  renderer.render(scene, camera);
}


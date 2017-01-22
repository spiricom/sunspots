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
    iResolution: {
      type: 'v3',
      value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1),
    },
    iGlobalTime: {
      type: 'f',
      value: 0.1,
    },
    iTimeDelta: {
      type: 'f',
      value: 1/60,
    },
    iFrame: {
      type: 'i',
      value: 0,
    },
    iFrameRate: {
      type: 'f',
      value: 60,
    },
    iChannelTime: {
      type: 'fv1',
      value: [0, 0, 0, 0],
    },
    iChannelResolution: {
      type: 'fv',
      value: [0,0,1,  0,0,1,  0,0,1,  0,0,1,],
    },
    iMouse: {
      type: 'v4',
      value: new THREE.Vector4(0, 0, 0, 0),
    },
    // TODO iChannel0, iChannel1, etc
    iDate: {
      type: 'v4',
      value: new THREE.Vector4(0, 0, 0, 0),
    },
    iSampleRate: {
      type: 'f',
      value: 44100,
    },
  };

  // Mouse position in - 1 to 1
  // TODO convert to pixels, set (x, y) every frame and (z, w) every frame button is down
  renderer.domElement.addEventListener('mousedown', function(e) {
    var canvas = renderer.domElement;
    var rect = canvas.getBoundingClientRect();
    tuniform.iMouse.value.z = (e.clientX - rect.left) / window.innerWidth * 2 - 1;
    tuniform.iMouse.value.w = (e.clientY - rect.top) / window.innerHeight * -2 + 1; 
  });

  // resize canvas function
  window.addEventListener('resize', onResize);
  tuniform.iResolution.value.x = window.innerWidth;
  tuniform.iResolution.value.y = window.innerHeight;
  tuniform.iResolution.value.z = 1; // pixel aspect ratio
  
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
  tuniform.iResolution.value.x = window.innerWidth;
  tuniform.iResolution.value.y = window.innerHeight;
}

function update() {
  requestAnimationFrame(update);

  var dt = clock.getDelta();

  tuniform.iFrame.value++;
  tuniform.iTimeDelta.value = dt;
  tuniform.iFrameRate.value = 1 / dt;
  tuniform.iGlobalTime.value += dt;
  
  renderer.render(scene, camera);
}


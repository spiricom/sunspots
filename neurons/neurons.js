"use strict";

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();


// init camera, scene, renderer
var gl, scene, camera, renderer;
var clock;

var fragUniforms;
var mesh;
var shaderLoader;

window.onload = function() {
  shaderLoader = new ShaderLoader();
  shaderLoader.loadShaders({
    neurons_vert : "",
    neurons_frag : "",
  }, "./glsl/", init);
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

  gl = renderer.getContext();
  
  clock = new THREE.Clock();

  fragUniforms = {
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
    fragUniforms.iMouse.value.z = (e.clientX - rect.left) / window.innerWidth * 2 - 1;
    fragUniforms.iMouse.value.w = (e.clientY - rect.top) / window.innerHeight * -2 + 1; 
  });

  // resize canvas function
  window.addEventListener('resize', onResize);
  fragUniforms.iResolution.value.x = window.innerWidth;
  fragUniforms.iResolution.value.y = window.innerHeight;
  fragUniforms.iResolution.value.z = 1; // pixel aspect ratio
  

  // Create Plane
  mesh = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(window.innerWidth, window.innerHeight, 40)
  );
  scene.add(mesh);

  refreshShaders();

  // start update loop
  update();
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  fragUniforms.iResolution.value.x = window.innerWidth;
  fragUniforms.iResolution.value.y = window.innerHeight;
}

function refreshShaders() {
  var newMat = new THREE.ShaderMaterial({
    uniforms: fragUniforms,
    vertexShader: ShaderLoader.get("neurons_vert"),
    fragmentShader: ShaderLoader.get("neurons_frag"),
  });

  var oldMat = mesh.material;

  // HACK to initialize new material
  mesh.material = newMat;
  renderer.render(scene, camera);

  // restore old material if new one failed to compile
  var status = gl.getProgramParameter( newMat.program.program, gl.LINK_STATUS );
  if (!status) {
    mesh.material = oldMat;
    renderer.render(scene, camera);
  }
}

function update() {
  requestAnimationFrame(update);

  if (!ShaderLoader.loading) {
    shaderLoader.loadShaders({
      neurons_vert : "",
      neurons_frag : "",
    }, "./glsl/", refreshShaders);
  }

  var dt = clock.getDelta();

  fragUniforms.iFrame.value++;
  fragUniforms.iTimeDelta.value = dt;
  fragUniforms.iFrameRate.value = 1 / dt;
  fragUniforms.iGlobalTime.value += dt;
  
  renderer.render(scene, camera);
}


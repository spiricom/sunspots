"use strict";

// config
var fontPath = "fonts/Times_Italic.typeface.json";
var statsEnabled = false;

// misc globals
var stats;

var scene;
var renderer;

var shaderSystem;

var composer, copyPass, ssaaRenderPass;

var camera;
var controls;

var font;

// controls globals
var targetRotation = 0;
var targetRotationOnMouseDown = 0;

var mouseX = 0;
var mouseXOnMouseDown = 0;

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

  function updateFragDefines(defs) {}

  shaderSystem = ShaderSystem(renderer, updateFragDefines);

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
  }
}


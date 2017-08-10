"use strict";

// uses multiple render passes since threejs doesn't support mrt


function GpuParticleSystem( width, height, posUpdateMaterials, velUpdateMaterials, renderMesh, initPosTex, initVelTex ){

  var gl = renderer.getContext();

  // set to true for randomized order each frame
  this.shufflePasses = false;
  this.verletIntegration = true;

  renderMesh.frustumCulled = false;

  // need float textures for positions/velocities
  if (!gl.getExtension("OES_texture_float")){
    throw new Error("float textures not supported");
  }

  // need to access textures from vertex shader
  if( gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) == 0 ) {
    throw new Error("vertex shader texture read not supported");
  }

  console.assert(posUpdateMaterials.constructor === Array);
  console.assert(velUpdateMaterials.constructor === Array);

  this.posUpdateMaterials = posUpdateMaterials;
  this.velUpdateMaterials = velUpdateMaterials;
  this.initPosTex = initPosTex;
  this.initVelTex = initVelTex;
  this.renderMesh = renderMesh;
  this.renderer = renderer;
  this.posUpdateMeshes = [];
  this.velUpdateMeshes = [];
  
  this.scene = new THREE.Scene();
  this.orthoCamera = new THREE.OrthographicCamera(-1,1,1,-1,1/Math.pow( 2, 53 ),1);

  var options = {
    // use bilinear with non-pixel-snapped sampling to smooth the cloth
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    // magFilter: THREE.NearestFilter,
    // minFilter: THREE.NearestFilter,

    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,

    format: THREE.RGBAFormat,
    type: THREE.FloatType
  };

  this.posRenderTex_target = new THREE.WebGLRenderTarget(width, height, options);
  this.posRenderTex_source = new THREE.WebGLRenderTarget(width, height, options);

  if (this.verletIntegration) {
    this.posRenderTex_prevSource = new THREE.WebGLRenderTarget(width, height, options);
  }
  else {
    this.velRenderTex_target = new THREE.WebGLRenderTarget(width, height, options);
    this.velRenderTex_source = new THREE.WebGLRenderTarget(width, height, options);
  }

  // used for rendering attribute textures
  var simGeom = new THREE.BufferGeometry();
  simGeom.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array([
    -1,  1, 0,
     1, -1, 0,
     1,  1, 0, 

    -1,  1, 0, 
    -1, -1, 0, 
     1, -1, 0, 
  ]), 3 ) );
  simGeom.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array([
     0,1, 1,0, 1,1,
     0,1, 0,0, 1,0,
   ]), 2 ) );

  for (var i = 0; i < this.posUpdateMaterials.length; i++) {
    var posUpdateMesh = new THREE.Mesh( simGeom, this.posUpdateMaterials[i] )
    this.posUpdateMeshes.push(posUpdateMesh);
    this.scene.add(posUpdateMesh);
  }
  for (var i = 0; i < this.velUpdateMaterials.length; i++) {
    var velUpdateMesh = new THREE.Mesh( simGeom, this.velUpdateMaterials[i] )
    this.velUpdateMeshes.push(velUpdateMesh);
    this.scene.add(velUpdateMesh);
  }

  this.clock = new THREE.Clock();
  this.clock.start();
  this.timeOffset = Math.random() * 1000;

  this.isFirstPass = [true, true];
};

GpuParticleSystem.prototype.getAveragePos = function() {
  var w = this.posRenderTex_source.width;
  var h = this.posRenderTex_source.height;

  if (!this.pixelBuffer) {
    this.pixelBuffer = new Float32Array(w * h * 4);
    this.averagePos = [];
  }

  renderer.readRenderTargetPixels(this.posRenderTex_source, 0, 0, w, h, this.pixelBuffer);
  var x = 0;
  var y = 0;
  var z = 0;
  var count = 0;
  for (var i = 0; i < w * h; i+= 10) {
    x += this.pixelBuffer[i*4 + 0];
    y += this.pixelBuffer[i*4 + 1];
    z += this.pixelBuffer[i*4 + 2];
    count++;
  }
  x /= count;
  y /= count;
  z /= count;

  this.averagePos.x = x;
  this.averagePos.y = y;
  this.averagePos.z = z;
  // return [x, y, z];
}

// shuffles array in-place
function shuffle(a) {
  for (let i = a.length; i; i--) {
    let j = Math.floor(Math.random() * i);
    [a[i - 1], a[j]] = [a[j], a[i - 1]];
  }
}

GpuParticleSystem.prototype.update = function(camera) {
  // make sure camera matrices are updated
  camera.updateMatrix();
  camera.updateMatrixWorld();

  // // if not in view, don't update
  // var frustum = new THREE.Frustum;
  // var cullingRadius = 500;
  // frustum.setFromMatrix( new THREE.Matrix4().multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse ) );
  // if ( !frustum.intersectsSphere( new THREE.Sphere(this.renderMesh.getWorldPosition(), cullingRadius) )) {
  //   return
  // }

  // hide all meshes so we can toggle them on individually
  for (var i = 0; i < this.posUpdateMeshes.length; i++) {
    this.posUpdateMeshes[i].visible = false;
  }
  for (var i = 0; i < this.velUpdateMeshes.length; i++) {
    this.velUpdateMeshes[i].visible = false;
  }

  // update vel (if not verlet mode), then pos
  for (var posVel = (this.verletIntegration ? 1 : 0); posVel <= 1; posVel++) {
    var isVelPass = posVel === 0;

    var curMeshArr = isVelPass ? this.velUpdateMeshes : this.posUpdateMeshes;

    // for each pass on this attribute (pos/vel)
    var idxs = [];
    for (var i = 0; i < curMeshArr.length; i++) {
      idxs.push(i);
    }
    if (this.shufflePasses) {
      shuffle(idxs);
    }

    for (var idxIdx = 0; idxIdx < idxs.length; idxIdx++) {
      var i = idxs[idxIdx];

      var curMesh = curMeshArr[i];

      // use just the shader for this pass
      curMesh.visible = true;

      // bind correct pos/vel source textures
      if (!this.isFirstPass[posVel]) {
        curMesh.material.uniforms.positions.value = this.posRenderTex_source.texture;
        if (this.verletIntegration) {
          curMesh.material.uniforms.prevPositions.value = this.posRenderTex_prevSource.texture;
        }
        else {
          curMesh.material.uniforms.velocities.value = this.velRenderTex_source.texture;
        }
      }
      else {
        // bind init values
        curMesh.material.uniforms.positions.value = this.initPosTex;
        if (this.verletIntegration) {
          curMesh.material.uniforms.prevPositions.value = this.initPosTex;
        }
        else {
          curMesh.material.uniforms.velocities.value = this.initVelTex;
        }
      }
      this.isFirstPass[posVel] = false;

      // render new vals to target texture
      var curRenderTarget = isVelPass ? this.velRenderTex_target : this.posRenderTex_target;
      this.renderer.render( this.scene, this.orthoCamera, curRenderTarget, true );
      
      // disable that mesh/shader again
      curMesh.visible = false;

      // flip source/target tex
      if (isVelPass) { // flip vel textures
        var justWrittenTo = this.velRenderTex_target;
        this.velRenderTex_target = this.velRenderTex_source;
        this.velRenderTex_source = justWrittenTo;
      }
      else { // flip pos textures
        if (this.verletIntegration) {
          var prevPrevSource = this.posRenderTex_prevSource;
          var justWrittenTo = this.posRenderTex_target;
          var prevSource = this.posRenderTex_source;
          
          this.posRenderTex_target = prevPrevSource;
          this.posRenderTex_source = justWrittenTo;
          this.posRenderTex_prevSource = prevSource;
        }
        else {
          var justWrittenTo = this.posRenderTex_target;
          this.posRenderTex_target = this.posRenderTex_source;
          this.posRenderTex_source = justWrittenTo;
        }
      }
    }
  }

  // update pos tex for rendering
  this.renderMesh.material.uniforms.positions.value = this.posRenderTex_source.texture;

  // update time uniforms
  var t = this.clock.getElapsedTime() + this.timeOffset;
  var dt = this.clock.getDelta();

  for (var i = 0; i < this.posUpdateMeshes.length; i++) {
    this.posUpdateMaterials[i].uniforms.time.value = t;
    this.posUpdateMaterials[i].uniforms.dt.value = dt;
  }
  for (var i = 0; i < this.velUpdateMeshes.length; i++) {
    this.velUpdateMaterials[i].uniforms.time.value = t;
    this.velUpdateMaterials[i].uniforms.dt.value = dt;
  }
};

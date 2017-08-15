"use strict";

// var pinMode = "random";
// var pinMode = "none";
// var pinMode = "corners";

function GpuCloth( width, height, color, tex, sideLength, options ) {

  this.sideLength = sideLength;

  var fboWidth = width;
  var fboHeight = height;

  var pinMode = options.pinMode;

  var initPosMult = options.initPosMult || 1;

  // init pos data, w/ pinned bool in alpha channel
  // var side = Math.random() * 100 + 200
  var len = fboWidth * fboHeight * 4;
  var posData = new Float32Array(len);
  var idx = 0;
  for (var x = 0; x < fboWidth; x++) {
    for (var y = 0; y < fboHeight; y++) {
      posData[idx] = (x / (fboWidth-1) - 0.5) * this.sideLength * initPosMult;
      // if (y == 0) {
      //   console.log("x" + x + ": " + posData[idx]);
      // }
      idx++;
      posData[idx] = (y / (fboHeight-1) - 0.5) * this.sideLength * initPosMult;
      // if (x == 0) {
      //   console.log("y" + y + ": " + posData[idx]);
      // }
      idx++;
      if (options.randomInitialZ) {
        posData[idx] = (Math.random()*2-1) * this.sideLength * 0.5;
      }
      else {
        posData[idx] = 0;
        // posData[idx] = idx / len * this.sideLength;
      }
      idx++;

      // pinning
      posData[idx] = 0;
      if (pinMode === "random" || pinMode === "randomAndEdges") {
        posData[idx] = Math.random() < (options.pinChance || 0.08); 
      }
      if (pinMode === "edges" || pinMode === "randomAndEdges") {
        posData[idx] = posData[idx] || (x === 0) || (x === fboWidth-1) || (y === 0) || (y === fboHeight-1);
      }
      if (pinMode === "corners") {
        posData[idx] = (x === 0 || x === fboWidth-1) && (y === 0 || y === fboHeight-1);
      }
      idx++;
    }
  }

  // initial pos texture
  var initialPosTex = new THREE.DataTexture(posData, fboWidth, fboHeight, THREE.RGBAFormat, THREE.FloatType);
  initialPosTex.needsUpdate = true;

  // initial vel data
  var velData = new Float32Array(len);

  // initial vel texture
  var initialVelTex = new THREE.DataTexture(velData, fboWidth, fboHeight, THREE.RGBFormat, THREE.FloatType);
  initialVelTex.needsUpdate = true;

  // update shader uniforms
  var updateUniforms = {
    positions: { type: "t", value: null },
    prevPositions: { type: "t", value: null },
    initPositions: { type: "t", value: initialPosTex },
    velocities: { type: "t", value: null },
    dims: { type: "2fv", value: new THREE.Vector2(fboWidth, fboHeight) },
    time: { type: "1f", value: 0 },
    dt: { type: "1f", value: 1/60 },
    particlesPerSide: { type: "1f", value: fboWidth },
    FABRIC_SIDE_LENGTH: { type: "1f", value: this.sideLength },
  };

  // update shaders
  var posUpdateShaders = [];
  var flagss = options.flagss || [
    [ 
    "INTEGRATE_VEL_PASS", 
    
    "BEND_PASS_1",
    "BEND_PASS_2",
    "BEND_PASS_3",
    "BEND_PASS_4",

    "STRETCH_PASS_H_1",
    "STRETCH_PASS_H_2",
    "STRETCH_PASS_V_2",
    "STRETCH_PASS_V_1",
    
    "SHEAR_CONSTRAINTS_ENABLED",
    "SHEAR_PASS_1",
    "SHEAR_PASS_2",
    "SHEAR_PASS_3",
    "SHEAR_PASS_4",
    ],
  ];
  for (var k = 0; k < flagss.length; k++) {
    var posFragShader = "";

    for (var j = 0; j < flagss[k].length; j++) {
      posFragShader += "#define " + flagss[k][j] + "\n";
    }

    posFragShader += ShaderLoader.get( "posUpdate_frag" );

    var posUpdateShader = new THREE.ShaderMaterial({
      uniforms: updateUniforms,
      vertexShader: ShaderLoader.get( "posUpdate_vert" ),
      fragmentShader: posFragShader,
    });

    posUpdateShaders.push(posUpdateShader);
  }

  var velUpdateShader = new THREE.ShaderMaterial({
    uniforms: updateUniforms,
    vertexShader: ShaderLoader.get( "velUpdate_vert" ),
    fragmentShader:  ShaderLoader.get( "velUpdate_frag" ),
    defines: {
      MAX_DIST: options.maxDist,
    },
  });

  // render shader
  var renderDefines = options.renderDefines || {};
  if (options) {
    if (options.flatShading) {
      renderDefines.FLAT_SHADING = true;
    }
    if (!tex || options.noTex) {
      renderDefines.NO_TEXTURE = true;
    }
  }
  this.renderDefines = renderDefines;

  this.renderUniforms = {
    positions: { type: "t", value: initialPosTex },
    prevPositions: { type: "t", value: initialPosTex },
    // pointSize: { type: "f", value: 1 },
    dataTexDims: { type: "2vf", value: new THREE.Vector2(fboWidth, fboHeight) },
    waveMag: {type: "f", value: 1},
    color: { type: "3vf", value: HSVtoRGB(color[0], color[1], color[2]) },
    // flatShading: { type: "1f", value: 1 },
    // color: { type: "3vf", value: HSVtoRGB(Math.random(), Math.random(), Math.random()) },
    texture: { type: "t", value: tex },
  };

  var renderShader = new THREE.ShaderMaterial({
    uniforms: this.renderUniforms,
    extensions: {
      derivatives: true,
      fragDepth: true,
    },
    side: options.backfaceMode || THREE.DoubleSide,
    defines: renderDefines,
    vertexShader: ShaderLoader.get( "render_vert" ),
    fragmentShader: ShaderLoader.get( "render_frag" ),
    transparent: true,
    shading: THREE.SmoothShading,
  });

  // render geom
  var renderGeom = new THREE.BufferGeometry();

  // vertex buffer
  var l = (fboWidth * fboHeight);
  var vertices = new Float32Array(l * 3);
  var idx = 0;
  for (var x = 0; x < fboWidth; x++) {
    for (var y = 0; y < fboHeight; y++) {
      vertices[idx] = x / (fboWidth-1);
      idx++;
      vertices[idx] = y / (fboHeight-1);
      idx++;
      vertices[idx] = 0;
      idx++;
    }
  }
  // for (var j = 0; j < l; j++) {
    // vertices[j*3 + 0] = (j % fboWidth) / fboWidth;
    // vertices[j*3 + 1] = (j / fboWidth) / fboHeight;
    // vertices[j*3 + 2] = 0;
  // }
  renderGeom.addAttribute("position", new THREE.BufferAttribute(vertices, 3));

  // index buffer
  var indices = [];
  for (var x = 0; x < fboWidth-1; x++) {
    for (var y = 0; y < fboHeight-1; y++) {
      indices.push( (x+0) + (y+0)*fboWidth );
      indices.push( (x+0) + (y+1)*fboWidth );
      indices.push( (x+1) + (y+0)*fboWidth );

      // comment these out for cool triangles
      indices.push( (x+1) + (y+1)*fboWidth );
      indices.push( (x+1) + (y+0)*fboWidth );
      indices.push( (x+0) + (y+1)*fboWidth );
    }
  }
  renderGeom.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1))

  // renderMesh
  var renderMesh = new THREE.Mesh( renderGeom, renderShader );

  // random orientation
  // HACK: just store the rotation here, apply it in scenegraph setup later
  renderMesh.rotx = Math.PI * 2 * Math.random();
  renderMesh.roty = Math.PI * 2 * Math.random();

  // CREATE CLOTH
  this.particleSystem = new GpuParticleSystem( 
    fboWidth, fboHeight, 
    posUpdateShaders, [velUpdateShader], 
    renderMesh, 
    initialPosTex, initialVelTex, {
    verletIntegration: true,
  } );

}

GpuCloth.prototype.update = function(camera) {
  this.particleSystem.update(camera);
}

GpuCloth.prototype.getRenderMesh = function() {
  return this.particleSystem.renderMesh;
}


GpuCloth.prototype.setPosition = function(x, y, z) {
  this.particleSystem.renderMesh.position.set(x, y, z);
}

GpuCloth.prototype.getPosition = function() {
  return this.particleSystem.renderMesh.position;
}

GpuCloth.prototype.setColor = function(color) {
  this.particleSystem.renderMesh.material.uniforms.color.value = color;
}

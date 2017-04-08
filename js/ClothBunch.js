"use strict";

var drifterSpeed = 1;

function ClothBunch( numCloths, fboWidth, fboHeight, tex, sideLength, options ) {
  this.options = options || {};
  this.sideLength = sideLength || 256;

  this.numCloths = numCloths;
  this.tex = tex;

  this.pos = new THREE.Vector3(0, 0, 0);
  this.vel = new THREE.Vector3(0, 0, 0);

  this.clothColors = [];
  for (var i = 0; i < numCloths; i++) {
    this.clothColors[i] = [];
    for (var j = 0; j < 3; j++) {
      this.clothColors[i][j] = Math.random();
    }
  }

  this.rootNode = new THREE.Object3D();
  // if (this.options.isBg) {
  //   camera.add(this.rootNode);
  // }
  // else {
    scene.add(this.rootNode);
  // }
    
  this.cloths = [];
  this.clothRootNodes = [];
  for (var i = 0; i < this.numCloths; i++) {
    var cloth = new GpuCloth(fboWidth, fboHeight, this.clothColors[i], this.tex, this.sideLength, this.options);
    this.cloths[i] = cloth;

    var node = new THREE.Object3D();
    node.add(cloth.getRenderMesh());
    this.rootNode.add(node);
    this.clothRootNodes[i] = node;
  }
}

ClothBunch.prototype.update = function(camera, avgVolumes) {

  // colors
  if (this.colorScheme == "main") {
    for (var i = 0; i < this.cloths.length; i++) {
      if (avgVolumes.length > i) {
        var col = HSVtoRGB(
          // EasingFunctions.easeOutQuad(avgVolumes[i] / 20 + 0.2) + 0.1,
          avgVolumes[i] / 80 + 0.3,
          EasingFunctions.easeInQuart(THREE.Math.clamp(avgVolumes[i] / 30 + 0.3, 0, 1)),
          THREE.Math.clamp(EasingFunctions.easeInCubic(avgVolumes[i] / 20) + 0.02, 0, 1)
          );
      }
      else {
        var col = HSVtoRGB(1, 0, 1);
      }
      var col = HSVtoRGB(1, 0, 1);
      this.cloths[i].setColor(col);
    }
  }
  else if (this.colorScheme == "fixed") {
    for (var i = 0; i < this.cloths.length; i++) {
      // this.cloths[i].setColor(renderer.getClearColor().multiply(10));
      this.cloths[i].setColor(this.options.color);
    }
  }

  // drift position
  if (this.vel.x !== 0 && this.vel.y !== 0) {
    if (this.pos.y < -5000) {
      this.vel.y = 1 * drifterSpeed;
    }
    else if (this.pos.y > 5000) {
      this.vel.y = -1 * drifterSpeed;
    }
    if (this.pos.x < -5000) {
      this.vel.x = 1 * drifterSpeed;
    }
    else if (this.pos.x > 5000) {
      this.vel.x = -1 * drifterSpeed;
    }
    if (this.pos.z < -5000) {
      this.vel.z = 1 * drifterSpeed;
    }
    else if (this.pos.z > 5000) {
      this.vel.z = -1 * drifterSpeed;
    }
  }

  this.pos.add(this.vel);


  // update transform
  if (this.options.isBg) {
    this.rootNode.position.copy(camera.position);

    var fwd = (new THREE.Vector3()).copy(camera.getWorldDirection());
    fwd.multiplyScalar(28000);
    this.rootNode.position.add(fwd);

    this.rootNode.lookAt(camera.position);
  }
  else {
    this.rootNode.position.set(this.pos.x, this.pos.y, this.pos.z);
  }

  for (var j = 0; j < this.numCloths; j++) {
    var ps = this.cloths[j].particleSystem;
    var clothMesh = ps.renderMesh;

    var keepClothsCentered = true;
    if (keepClothsCentered) {
      ps.getAveragePos();
      clothMesh.position.set(-ps.averagePos.x, -ps.averagePos.y, -ps.averagePos.z);
    }

    var clothRotScaleNode = this.clothRootNodes[j];
    if (!this.options.noRandomRot) {
      clothRotScaleNode.rotation.x = clothMesh.rotx;
      clothRotScaleNode.rotation.y = clothMesh.roty;
    }
    if (this.options.scale) {
      clothRotScaleNode.scale.x = this.options.scale;
      clothRotScaleNode.scale.y = this.options.scale;
      clothRotScaleNode.scale.z = this.options.scale;
    }

    clothMesh.matrixWorldNeedsUpdate = true;
  }

  // update particle systems
  for (var i = 0; i < this.cloths.length; i++) {
    // this.cloths[i].update(this.options.isBg ? cameraFixed : camera);
    this.cloths[i].update(camera);
  }
}

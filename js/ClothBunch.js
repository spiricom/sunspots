"use strict";

var drifterSpeed = 1;

function ClothBunch( numCloths, fboWidth, fboHeight, tex, sideLength, options ) {
  fboWidth = Math.floor(fboWidth);
  fboHeight = Math.floor(fboHeight);
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
  scene.add(this.rootNode);

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

var easings = {
  linear: function (t) { return t },
  inQuad: function (t) { return t*t },
  outQuad: function (t) { return t*(2-t) },
  inOutQuad: function (t) { return t<.5 ? 2*t*t : -1+(4-2*t)*t },
  inCubic: function (t) { return t*t*t },
  outCubic: function (t) { return (--t)*t*t+1 },
  inOutCubic: function (t) { return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1 },
  inQuart: function (t) { return t*t*t*t },
  outQuart: function (t) { return 1-(--t)*t*t*t },
  inOutQuart: function (t) { return t<.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t },
  inQuint: function (t) { return t*t*t*t*t },
  outQuint: function (t) { return 1+(--t)*t*t*t*t },
  inOutQuint: function (t) { return t<.5 ? 16*t*t*t*t*t : 1+16*(--t)*t*t*t*t }
};

ClothBunch.prototype.update = function(camera, avgVolumes) {

  // colors
  if (this.colorScheme == "main") {
    var cols = this.clothColors

    for (var i = 0; i < this.cloths.length; i++) {
      // for (var channelIdx = 0; channelIdx < 3; channelIdx++) {
        // var tempColor = cols[i][channelIdx];
        // tempColor += ((Math.random() - .5) *.03);
        // cols[i][channelIdx] = avgVolumes[i] / 30;
      // }
      // this.cloths[i].setColor(HSVtoRGB(cols[i][0], cols[i][1], cols[i][2]));

      var v = avgVolumes[i] / 30;
      // this.cloths[i].setColor(HSVtoRGB(v, v, v));

      this.cloths[i].setColor(HSVtoRGB(
        easings.inQuart(v * 0.8) * -0.2 + 0.6, 
        v * 0.5 + 0.2, 
        easings.inQuad(v) * 0.9 + 0.05
      ));

    }
  }
  else if (this.colorScheme == "fixed") {
    for (var i = 0; i < this.cloths.length; i++) {
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
  if (!this.options.manualTransform) {
    if (this.options.isBg) {
      this.rootNode.position.copy(camera.position);

      var fwd = (new THREE.Vector3()).copy(camera.getWorldDirection());
      fwd.multiplyScalar(12000);
      this.rootNode.position.add(fwd);

      this.rootNode.lookAt(camera.position);
    }
    else {
      this.rootNode.position.set(this.pos.x, this.pos.y, this.pos.z);
    }
  }

  // auto-centering
  for (var j = 0; j < this.numCloths; j++) {
    var ps = this.cloths[j].particleSystem;
    var clothMesh = ps.renderMesh;

    var keepCentered = this.options.keepCentered;
    if (keepCentered) {
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

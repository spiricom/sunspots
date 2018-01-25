"use strict";

var ShaderLoader = function() {
  ShaderLoader.shaders = {};

  ShaderLoader.get = function(id) {
    return ShaderLoader.shaders[id];
  };
};
ShaderLoader.prototype = {
  loadShaders: function(shaders, baseUrl, callback) {
    // copy input into existing shaders list
    if (shaders) {
      for (var name in shaders) {
        ShaderLoader.shaders[name] = ShaderLoader.shaders[name] || shaders[name] || "";
      }
    }

    ShaderLoader.loading = true;
    this.baseUrl = baseUrl || "./";
    this.callback = callback;
    this.batchLoad(this, "onShadersReady");
  },
  batchLoad: function(scope, callback) {
    var queue = 0;
    var shaderChanged = false;

    function loadHandler(name, req) {
      return function() {
        var changed = ShaderLoader.shaders[name] !== req.responseText;
        shaderChanged = shaderChanged || changed;
        ShaderLoader.shaders[name] = req.responseText;
        queue--;
        if (queue <= 0) {
          scope[callback](shaderChanged);
        }
      };
    }
    
    for (var name in ShaderLoader.shaders) {
      // if (ShaderLoader.shaders[name] === "") {
        queue++;
        var req = new XMLHttpRequest();
        req.onload = loadHandler(name, req);
        req.open('get', scope.baseUrl + name + ".glsl", true);
        req.send();
      // }
    }
  },
  onShadersReady: function(shaderChanged) {
    if (this.callback) {
      this.callback(shaderChanged);
    }
    ShaderLoader.loading = false;
  }
};

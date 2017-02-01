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
        ShaderLoader.shaders[name] = ShaderLoader.shaders[name] || "";
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
        // console.log(ShaderLoader.shaders[name]);
        // console.log(req.responseText);
        shaderChanged = shaderChanged || changed;
        ShaderLoader.shaders[name] = req.responseText;
        queue--;
        if (queue <= 0) {
          scope[callback](shaderChanged);
        }
      };
    }
    
    for (var name in ShaderLoader.shaders) {
      queue++;
      var req = new XMLHttpRequest();
      req.onload = loadHandler(name, req);
      req.open('get', scope.baseUrl + name + ".glsl", true);
      req.send();
    }
  },
  onShadersReady: function(shaderChanged) {
    ShaderLoader.loading = false;
    if (this.callback) {
      this.callback(shaderChanged);
    }
  }
};

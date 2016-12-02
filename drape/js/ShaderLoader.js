"use strict";

var ShaderLoader = function() {
  ShaderLoader.get = function(id) {
    return ShaderLoader.shaders[id];
  };
};
ShaderLoader.prototype = {
  loadShaders: function(shaders, baseUrl, callback) {
    ShaderLoader.shaders = shaders;

    this.baseUrl = baseUrl || "./";
    this.callback = callback;
    this.batchLoad(this, "onShadersReady");
  },
  batchLoad: function(scope, callback) {
    var queue = 0;

    function loadHandler(name, req) {
      return function() {
        ShaderLoader.shaders[name] = req.responseText;
        queue--;
        if (queue <= 0) {
          scope[callback]();
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
  onShadersReady: function() {
    if (this.callback) {
      this.callback();
    }
  }
};

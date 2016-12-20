
var fps = 60;
var centerX, centerY;
var renderer;
var vpR; // radius of biggest circle that fits in viewport
var t = 0;

function setup() {
  var viewportWidth = window.innerWidth;
  var viewportHeight = window.innerHeight;
  centerX = viewportWidth/2;
  centerY = viewportHeight/2;
  vpR = min(centerX, centerY);

  renderer = createCanvas(viewportWidth, viewportHeight);
  frameRate(fps);
  ellipseMode(RADIUS);
  angleMode(DEGREES);

  print = console.log;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  var viewportWidth = window.innerWidth;
  var viewportHeight = window.innerHeight;
  centerX = viewportWidth/2;
  centerY = viewportHeight/2;
  vpR = min(centerX, centerY);
}

var trailDatas = [];

function drawPlanet(planet, drawRings, drawPlanets, update) {
  // rings
  stroke(226, 226, 224);
  strokeWeight(3/vpR);
  var p = planet;

  // identify planets by tree structure rather than by object reference
  if (p.idx === undefined) {
    p.idx = numPlanets;
    numPlanets++;
  }

  var orbitTheta = 360 * t / p.period;

  push();
  rotate(orbitTheta);
  {
    if (drawRings) {
      // ring
      noFill();
      ellipse(0, 0, p.orbitR);

      // ring ticks
      var numTicks = p.numTicks;
      for (var j = 0; j < numTicks; j++) {
        var theta = map(j, 0, numTicks, 0, 360);
        var v = createVector(cos(theta), sin(theta));
        var v0 = p5.Vector.mult(v, p.orbitR - p.tickInner);
        var v1 = p5.Vector.mult(v, p.orbitR + p.tickOuter);
        line(v0.x, v0.y, v1.x, v1.y);
      }
    }

    // planet
    if (drawPlanets) {
      noStroke();
      if (planet.color) fill(planet.color);
      else              fill(131, 66, 60);
      ellipse(p.orbitR, 0, p.r);
    }


    var curMat = renderer.drawingContext.currentTransform;
    var invMat = curMat;
    // var invMat = curMat.inverse();
    var x = p.orbitR;
    var y = 0;
    var pt = {
      x: x * invMat.a + y * invMat.c + invMat.e,
      y: x * invMat.b + y * invMat.d + invMat.f
    };
    trailDatas.push(pt);
  }
  pop();

  // children
  if (p.orbiters) {
    push();
    translate(cos(orbitTheta) * p.orbitR, sin(orbitTheta) * p.orbitR);
    {
      for (var i = 0; i < p.orbiters.length; i++) {
        drawPlanet(p.orbiters[i], drawRings, drawPlanets);
      }
    }
    pop();
  }
}

var numPlanets = 0;

function draw() {
  var systemRoot = {
    color: color(255, 88, 0),
    orbitR: 0,
    r: 0.1,
    period: 1,
    numTicks: 0,
    orbiters: [
      {
        orbitR: 0.85,
        r: 0.02,
        period: 16,
        tickOuter: 0.025,
        tickInner: 0.05,
        numTicks: 30,
      },
      {
        orbitR: 0.35,
        r: 0.03,
        period: 8,
        tickOuter: 0.03,
        tickInner: 0.02,
        numTicks: 12,
        orbiters: [
          {
            orbitR: 0.1,
            r: 0.02,
            period: -4,
            tickOuter: 0.025,
            tickInner: 0.01,
            numTicks: 6,
          },
          {
            orbitR: 0.15,
            r: 0.02,
            period: 2,
            tickOuter: 0.025,
            tickInner: 0.01,
            numTicks: 6,
          },
        ],
      },
      {
        orbitR: 2,
        r: 0.03,
        period: 32,
        tickOuter: 0.1,
        tickInner: 2,
        numTicks: 6,
      },
    ],
  };


  background(245, 245, 243);
  t = frameCount / fps;

  push();
  translate(centerX, centerY);
  translate(centerX * 0.2, centerX * 0.3);


  drawPlanet(systemRoot, false, false, true);

  scale(vpR);
  {
    drawPlanet(systemRoot, true, false);

    // vertical
    strokeWeight(4/vpR);
    stroke(226, 226, 224);
    line(0, 0, 0, -vpR);

    strokeWeight(2/vpR);
    stroke(226 * 0.7, 226 * 0.7, 224 * 0.7);
    line(0, 0, 0, -vpR);
    line(0, 0, -0.1, -vpR);

    drawPlanet(systemRoot, false, true);
  }
  pop();


  for (var i = 0; i < trailDatas.length; i++) {
    ellipse(trailDatas[i].x, trailDatas[i].y, 10);
  }
}


/*
 *
 * grouping adjacent
 * do circles have notes
 * stretch orbits of nearby to get closer
 *
 *
 */
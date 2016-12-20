
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
    // ring
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

    // trail
    if (drawPlanets && !p.noTrail) {
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
    noTrail: true,
    orbiters: [
      {
        orbitR: 0.85,
        r: 0.02,
        period: 16,
        tickOuter: 0.03,
        tickInner: 0.03,
        numTicks: 60,
      },
      {
        orbitR: 0.35,
        r: 0.03,
        period: 8,
        tickOuter: 0.02,
        tickInner: 0.02,
        numTicks: 12,
        orbiters: [
          {
            orbitR: 0.1,
            r: 0.02,
            period: -4,
            tickOuter: 0.02,
            tickInner: 0.02,
            numTicks: 6,
          },
          {
            orbitR: 0.15,
            r: 0.02,
            period: 2,
            tickOuter: 0.02,
            tickInner: 0.02,
            numTicks: 6,
          },
        ],
      },
      {
        orbitR: 3,
        r: 0.03,
        period: 32,
        tickOuter: 0.1,
        tickInner: 3,
        numTicks: 6,
        noTrail: true,
      },
    ],
  };


  background(245, 245, 243);
  t = frameCount / fps;



  // trails
  var numTrailSegments = 1000;
  trailDatas.splice(0, max(0, trailDatas.length-numTrailSegments));

  // fill(226, 226, 224);
  // noFill();
  // noStroke();
  stroke(0);
  for (var i = 0; i < trailDatas.length; i++) {
    var a = i/numTrailSegments;
    // fill(226 * ((1-a) * 0.7 + 0.3), 226 * ((1-a) * 0.7 + 0.3), 224 * ((1-a) * 0.7 + 0.3));
    fill(255);
    strokeWeight(1 * a);
    ellipse(trailDatas[i].x, trailDatas[i].y, 8 * (a * 0.9 + 0.1) );
  }


  // stroke(226 * 0.6, 226 * 0.6, 224 * 0.6);
  stroke(226 * 0.2, 226 * 0.2, 224 * 0.2);
  strokeWeight(1/vpR);
  push();
  translate(centerX, centerY);
  translate(centerX * 0.2, centerX * 0.2);
  scale(vpR);
  {

    // rings
    drawPlanet(systemRoot, true, false);

    // vertical line
    strokeWeight(4/vpR);
    stroke(226, 226, 224);
    line(0, 0, 0, -vpR);

    strokeWeight(2/vpR);
    stroke(226 * 0.7, 226 * 0.7, 224 * 0.7);
    line(0, 0, 0, -vpR);
    line(0, 0, -0.1, -vpR);


  }
  pop();


  push();
  translate(centerX, centerY);
  translate(centerX * 0.2, centerX * 0.2);
  scale(vpR);
  {
    // planets
    drawPlanet(systemRoot, false, true);
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
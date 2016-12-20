
var fps = 60;
var centerX, centerY;
var vpR; // radius of biggest circle that fits in viewport
var t = 0;

function setup() {
  var viewportWidth = window.innerWidth;
  var viewportHeight = window.innerHeight;
  centerX = viewportWidth/2;
  centerY = viewportHeight/2;
  vpR = min(centerX, centerY);

  createCanvas(viewportWidth, viewportHeight);
  frameRate(fps);
  ellipseMode(RADIUS);
  angleMode(DEGREES);
}


function draw() {
  var planets = [
    {
      orbitR: 0.85,
      r: 0.02,
      period: 16,
      tickOuter: 0.025,
      tickInner: 0.05,
      numTicks: 30,
    },
    {
      orbitR: 0.3,
      r: 0.03,
      period: 8,
      tickOuter: 0.1,
      tickInner: 0.05,
      numTicks: 12,
    },
    {
      orbitR: 2,
      r: 0.03,
      period: 32,
      tickOuter: 0.1,
      tickInner: 2,
      numTicks: 6,
    },
  ];


  background(245, 245, 243);
  // stroke(226, 226, 224);
  t = frameCount / fps;


  push();
  translate(centerX, centerY);
  translate(centerX * 0.2, centerX * 0.3);
  scale(vpR);
  {

    // rings
    stroke(226, 226, 224);
    strokeWeight(3/vpR);
    for (var i = 0; i < planets.length; i++) {
      var p = planets[i];

      push();
      rotate(360 * t / p.period);
      {
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
      pop();
    }

    // vertical
    strokeWeight(4/vpR);
    stroke(226, 226, 224);
    line(0, 0, 0, -vpR);

    strokeWeight(2/vpR);
    stroke(226 * 0.7, 226 * 0.7, 224 * 0.7);
    line(0, 0, 0, -vpR);
    line(0, 0, -0.1, -vpR);

    stroke(226, 226, 224);
    // planets
    for (var i = 0; i < planets.length; i++) {
      var p = planets[i];

      push();
      rotate(360 * t / p.period);
      {
        // planet
        noStroke();
        fill(131, 66, 60);
        ellipse(p.orbitR, 0, p.r);
      }
      pop();
    }

    // sun
    noStroke();
    // strokeWeight(8/vpR);
    // stroke(245, 245, 243);
    fill(255, 88, 0);
    ellipse(0, 0, 0.1);
  }
  pop();

}


/*
 *
 * grouping adjacent
 * note line
 * do circles have notes
 * stretch orbits of nearby to get closer
 *
 *
 */
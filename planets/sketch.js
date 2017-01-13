
// IMPORTANT NOTE: requires chrome with experimental canvas features enabled in chrome://flags (for canvas transform matrix retrieval - can be replaced with external transform system if necessary)

var fps = 60;
var centerX, centerY;
var renderer;
var vpR; // radius of biggest circle that fits in viewport
var t = 0;
var sunPos; // screen pixels
var topline = 0;
var bottomline = 0;
var leftline = 1;
var rightline = 0;
var detune = 2;
var randFreqs = [];
var numOsc = 5;
var gains = [];
var oscs = [];
var howManyPlanets = 10;
//var myScale = [60, 61.77, 62.04, 62.4, 64.71, 64.44, 66.75, 67.02, 67.38, 69.69, 69.42, 71.73]; // just tuned piano (La Monte Young)
var myScale = [60, 61.05, 62.04, 62.97, 63.86, 64.71, 65.51, 67.02, 68.4, 69.05, 69.69, 70.88];

function setup() {
  // misc
  print = console.log;

  // visuals
  var viewportWidth = window.innerWidth;;
  var viewportHeight = window.innerHeight;;
  centerX = viewportWidth/2;
  centerY = viewportHeight/2;
  vpR = min(centerX, centerY);

  renderer = createCanvas(viewportWidth, viewportHeight);
  frameRate(fps);
  ellipseMode(RADIUS);
  angleMode(DEGREES);
  
  // audio
  initSound();
}

function initSound(){

  context = new AudioContext;
  for (var j = 0; j < howManyPlanets; j++)
  {
    
    oscs[j] = [];
    gains[j] = [];
    var myFilter = context.createBiquadFilter();

    // Connect source to filter, filter to destination.
    myFilter.connect(context.destination);
    var myIndex = (Math.round(Math.random() * (myScale.length - 1)));
    var myOctave = pow(2, (Math.round(Math.random() * 6.0)));
    var fundamental = midiToFreq(myScale[myIndex] - 36) * (myOctave + 1);
    myFilter.frequency.value = random(fundamental, fundamental+random(500,6000));
    myFilter.Q.value = 1.0;
    //var fundamental = random(40, 160);
    //create a random array of frequencies
    for (var i = 0; i < numOsc; i++) { 
      randFreqs[i] = fundamental * (1);
      // print(randFreqs[i]);
    }
  
    for (var i = 0; i < numOsc; i++) {
      var o = context.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = randFreqs[i];
      o.detune.value = random(-detune, detune); // random detuning
  
      var g = context.createGain();
  
      // connect nodes
      o.connect(g);
      g.gain.value = 0.0;
      //g.gain.value = (1.0 / ((numOsc) * 4));
      g.connect(myFilter);
      o.start(0);
      oscs[j].push(o);
      gains[j].push(g);

    }
    
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  var viewportWidth = window.innerWidth;
  var viewportHeight = window.innerHeight;
  centerX = viewportWidth/2;
  centerY = viewportHeight/2;
  vpR = min(centerX, centerY);
}


function midiToFreq(midi_code) {
  var offset_code = midi_code - 69;
  if (offset_code > 0) {
    return Number(440 * Math.pow(2, offset_code / 12));
  } else {
    return Number(440 / Math.pow(2, -offset_code / 12));
  }
}
function ring(whichPlanet)
{
  for (var i = 0; i < numOsc; i++) 
  {
    //ramp up to the amplitude of the harmonic quickly (within 7ms)
    gains[whichPlanet][i].gain.cancelScheduledValues(0);
    gains[whichPlanet][i].gain.setTargetAtTime((random(0.0000001,(1.0/(numPlanets*numOsc)))), context.currentTime, 0.005);
    //ramp down to almost zero (non-zero to avoid divide by zero in exponential function) over the decay time for the harmonic
    gains[whichPlanet][i].gain.setTargetAtTime(0.0000001, (context.currentTime+.015), random(0.001, 1.7));
  }
}

// gets called whenever a planet crosses the top line
function onPlanetCrossedLine(planetName, planet) {
  ring(planetName-1);
  //console.log("planet crossed line: " + planetName);
}

// gets called _once_ each frame for each pair of overlapping planets
function onPlanetTouchingPlanetPerFrame(planetName1, planet1, planetName2, planet2, centerDist) {
  // print("planets " + planetName1 + " and " + planetName2 + " are touching with center dist " + centerDist + "!");
}

// called once whenever a pair starts touching
function onPlanetTouchingPlanetEnter(planetName1, planet1, planetName2, planet2) {
  print("planets " + planetName1 + " and " + planetName2 + " are now touching");
}

// called once whenever a pair stops touching
function onPlanetTouchingPlanetExit(planetName1, planet1, planetName2, planet2) {
  print("planets " + planetName1 + " and " + planetName2 + " are no longer touching");
}

function arePlanetsTouching(p1, p2) {
  return p1.state.touching[p2];
}

var planetDatas = [];
var planetsList = [];

var trailDatas = [];

function keyPressed() 
{
  if (keyCode === LEFT_ARROW) 
  {
    if (leftline == 1)
    {
      leftline = 0;
    }
    else
    {
      leftline = 1;
    }
  }
  if (keyCode === RIGHT_ARROW) 
  {
    if (rightline == 1)
    {
      rightline = 0;
    }
    else
    {
      rightline = 1;
    }
  }
  if (keyCode === UP_ARROW) 
  {
    if (topline == 1)
    {
      topline = 0;
    }
    else
    {
      topline = 1;
    }
  }
  if (keyCode === DOWN_ARROW) 
  {
    if (bottomline == 1)
    {
      bottomline = 0;
    }
    else
    {
      bottomline = 1;
    }
  }
}

function updateAndDrawPlanets(planet, drawRings, drawPlanets, updatePass) {
  var p = planet;

  // identify planets by tree structure rather than by object reference
  if (p.idx === undefined) {
    p.idx = numPlanets;
    planetDatas[p.idx] = planetDatas[p.idx] || {};
    numPlanets++;
  }
  planetsList[p.idx] = planet
  
  var planetState = planetDatas[p.idx];
  planetState.def = planet
  planet.state = planetState
  
  var orbitTheta = 360 * t / p.period;

  push();
  rotate(orbitTheta);
  {
    // draw ring
    if (drawRings && p.orbitR > 0) {
      // ring
      noFill();
      // fill(0);
      ellipse(0, 0, p.orbitR);

      // ring ticks
      var numTicks = p.numTicks;
      for (var j = 0; j < numTicks; j++) {
        // HACK: start at >0 degrees because 0-degree subpixel line renders more opaque in chrome
        var theta = map(j, 0, numTicks, 0.05, 360);
        // theta += sin(theta*3) * 6;
        var v = createVector(cos(theta), sin(theta));
        var v0 = p5.Vector.mult(v, p.orbitR - p.tickInner);
        var v1 = p5.Vector.mult(v, p.orbitR + p.tickOuter);
        line(v0.x, v0.y, v1.x, v1.y);
      }
    }

    // draw planet
    if (drawPlanets) {
      noStroke();
      if (planet.color) fill(planet.color);
      else              fill(0, 0, 0);
      if (planet.state.numPlanetsTouching > 0) {
        fill(255, 0, 0);
      }
      ellipse(p.orbitR, 0, p.r);
    }

    if (updatePass) {
      // get screen pos
      var curMat = renderer.drawingContext.currentTransform
      var invMat = curMat;
      var x = p.orbitR;
      var y = 0;
      var screenPos = {
        x: x * invMat.a + y * invMat.c + invMat.e,
        y: x * invMat.b + y * invMat.d + invMat.f
      };

      // initialize prevScreenPos
      if (typeof planetState.prevScreenPos === "undefined") {
        planetState.prevScreenPos = screenPos;
      }

      planetState.screenPos = screenPos;

      // line crossing checks
      if (p.name !== "sun") 
      {
        
        if (topline)
        {
          if ( (screenPos.y < sunPos.y) && ((screenPos.x > sunPos.x) != (planetState.prevScreenPos.x > sunPos.x)) ) 
          {
            onPlanetCrossedLine(p.name || p.idx, p);
          }
        }
        
        if (bottomline)
        {
          if ( (screenPos.y > sunPos.y) && ((screenPos.x > sunPos.x) != (planetState.prevScreenPos.x > sunPos.x)) ) 
          {
            onPlanetCrossedLine(p.name || p.idx, p);
          }
        }
        
        if (leftline)
        { 
          
          if ( (screenPos.x < sunPos.x) && ((screenPos.y > sunPos.y) != (planetState.prevScreenPos.y > sunPos.y)) ) 
          {
            onPlanetCrossedLine(p.name || p.idx, p);
          }
        }
        
        if (rightline)
        {
          if ( (screenPos.x > sunPos.x) && ((screenPos.y < sunPos.y) != (planetState.prevScreenPos.y < sunPos.y)) ) 
          {
            onPlanetCrossedLine(p.name || p.idx, p);
          }
        }
      }

      planetState.prevScreenPos = screenPos;
    }

  }
  pop();

  // children
  if (p.orbiters) {
    push();
    translate(cos(orbitTheta) * p.orbitR, sin(orbitTheta) * p.orbitR);
    {
      for (var i = 0; i < p.orbiters.length; i++) {
        updateAndDrawPlanets(p.orbiters[i], drawRings, drawPlanets, updatePass);
      }
    }
    pop();
  }
}

// maps planetState to set of planets with higher idx that are touching
var prevTouchingPairs = new Map();
var touchingPairs = new Map();

function updatePlanetOverlaps() {

  // refresh per-frame state
  for (var i = 0; i < planetsList.length; i++) {
    planetsList[i].state.touchingSet = new Set();
    planetsList[i].state.numPlanetsTouching = 0;
  }

  prevTouchingPairs = touchingPairs;
  touchingPairs = new Map();

  for (var i = 0; i < planetsList.length-1; i++) {
    var p1 = planetsList[i];
    for (var j = i+1; j < planetsList.length; j++) {
      var p2 = planetsList[j];
      var dx = p1.state.screenPos.x - p2.state.screenPos.x;
      var dy = p1.state.screenPos.y - p2.state.screenPos.y;
      var dist = sqrt(dx*dx + dy*dy);
      if (dist <= p1.r + p2.r) {
        onPlanetTouchingPlanetPerFrame(p1.name || p1.idx, p1, p2.name || p2.idx, p2, dist);
        
        if (!touchingPairs.has(p1.state)) {
          touchingPairs.set(p1.state, new Set());
        }
        touchingPairs.get(p1.state).add(p2.state);

        p1.state.touchingSet.add(p2);
        p2.state.touchingSet.add(p1);
        
        p1.state.numPlanetsTouching++;
        p2.state.numPlanetsTouching++;
      }
    }
  }

  for (var state1 of prevTouchingPairs.keys()) {
    for (var state2 of prevTouchingPairs.get(state1).keys()) {
      if (!(touchingPairs.get(state1) && touchingPairs.get(state1).has(state2))) {
        var p1 = state1.def;
        var p2 = state2.def;
        onPlanetTouchingPlanetExit(p1.name || p1.idx, p1, p2.name || p2.idx, p2);
      }
    }
  }

  for (var state1 of touchingPairs.keys()) {
    for (var state2 of touchingPairs.get(state1).keys()) {
      if (!(prevTouchingPairs.get(state1) && prevTouchingPairs.get(state1).has(state2))) {
        var p1 = state1.def;
        var p2 = state2.def;
        onPlanetTouchingPlanetEnter(p1.name || p1.idx, p1, p2.name || p2.idx, p2);
      }
    }
  }

  prevTouchingPairs = touchingPairs;
}

var numPlanets = 0;

function draw() {
  
  
  var centerOffset = {
    x: centerX * 0,
    y: centerY * 0,
  }

  sunPos = {
    x: centerX + centerOffset.x,
    y: centerY + centerOffset.y,
  }

  numPlanets = 0;
  
  // defines the solar system
  // refreshed every frame for live reloading purposes - can be made static without other changes
  var systemRoot = {
    color: color(0, 0, 0),
    name: "sun",
    orbitR: 0,
    r: 0.025,
    period: 1,
    numTicks: 0,
    noTrail: true,
    orbiters: [
      {
        orbitR: 0.25,
        r: 0.02,
        period: 6,

      },
      {
        orbitR: 0.4,
        r: 0.03,
        period: 35,

      },
      { // ADDED FOR COLLISION DEBUG
        orbitR: 0.4,
        r: 0.1,
        period: 3,

      },
      {
        orbitR: 0.5,
        r: 0.03,
        period: 5,

      },
      {
        orbitR: 0.7,
        r: 0.03,
        period: 10,

      },
      {
        orbitR: .8,
        r: 0.02,
        period: 11,
      },
      {
        orbitR: .9,
        r: 0.02,
        period: 12,
      },
      {
        orbitR: .95,
        r: 0.02,
        period: 13,
        orbiters: [
          {
            orbitR: 0.1,
            r: 0.01,
            period: 7,

          },
          {
            orbitR: 0.15,
            r: 0.01,
            period: 8,

          }]
      },
    ],
  };

  var trailGrowRate = 0;
  // var trailGrowRate = 0.001;

  background(245, 245, 255);
  // background(245 * 0.3, 245 * 0.3, 243 * 0.3);
  t = frameCount / fps;


  // UPDATE PLANET DATA STUFF
  updateAndDrawPlanets(systemRoot, false, false, true);
  updatePlanetOverlaps(systemRoot);


  // trails
  var numTrailSegments = 1000;
  trailDatas.splice(0, max(0, trailDatas.length-numTrailSegments));

  stroke(0);
  fill(245, 245, 243);
  strokeWeight(1);
  for (var i = 0; i < trailDatas.length; i++) {
    var a = i/numTrailSegments;
    ellipse(trailDatas[i].x, trailDatas[i].y, 8 * (a * 0.1 + 0.9) );
  }

  if (trailGrowRate !== 0) {
    var cx = centerX;
    var cy = centerY;
    for (var i = 0; i < trailDatas.length; i++) {
      trailDatas[i].x = (trailDatas[i].x - cx) * (1 + trailGrowRate) + cx;
      trailDatas[i].y = (trailDatas[i].y - cy) * (1 + trailGrowRate) + cy;
    }
  }


  // DRAW PLANETS
  push();
  translate(centerX, centerY);
  scale(vpR);
  {
    updateAndDrawPlanets(systemRoot, false, true, false);
  }
  pop();

  // DRAW RINGS AND LINES
  stroke(226 * 0.6, 226 * 0.6, 224 * 0.6, 255 * 0.5);
  strokeWeight(2/vpR);
  push();
  translate(centerX, centerY);
  scale(vpR);
  {

    // rings
    updateAndDrawPlanets(systemRoot, true, false, false);

    if (topline)
    {
      // topline
      strokeWeight(2/vpR);
      stroke(0, 0, 0);
      line(0, 0, 0, -vpR);
    }
    
    if (bottomline)
    {
        // bottomline
      strokeWeight(2/vpR);
      stroke(0, 0, 0);
      line(0, 0, 0, vpR);
    }
    if (leftline)
    {
        // vertical line
      strokeWeight(2/vpR);
      stroke(0, 0, 0);
      line(0, 0, -vpR,0);
    }
    if (rightline)
    {
        // vertical line
      strokeWeight(2/vpR);
      stroke(0, 0, 0);
      line(0, 0,vpR, 0);
    }
     //strokeWeight(2/vpR);
     //stroke(226 * 0.7, 226 * 0.7, 224 * 0.7);
   //line(0, 0, 0, -vpR);
     //line(0, 0, -0.1, -vpR);


  }
  pop();
}


/*
 *
 * grouping adjacent
 * do circles have notes
 * stretch orbits of nearby to get closer
 *
 *
 */
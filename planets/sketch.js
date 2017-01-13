
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
  var viewportWidth = window.innerWidth;;
  var viewportHeight = window.innerHeight;;
  centerX = viewportWidth/2;
  centerY = viewportHeight/2;
  vpR = min(centerX, centerY);

  renderer = createCanvas(viewportWidth, viewportHeight);
  frameRate(fps);
  ellipseMode(RADIUS);
  angleMode(DEGREES);
  console.log("hello");
  print = console.log;
  initSound();

}

function midiToFreq(midi_code) {
    var offset_code = midi_code - 69;
    if (offset_code > 0) {
        return Number(440 * Math.pow(2, offset_code / 12));
    } else {
        return Number(440 / Math.pow(2, -offset_code / 12));
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

var planetDatas = [];

var trailDatas = [];

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
        print(randFreqs[i]);
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

function drawPlanet(planet, drawRings, drawPlanets, update) {
  var p = planet;

  // identify planets by tree structure rather than by object reference
  if (p.idx === undefined) {
    p.idx = numPlanets;
    planetDatas[p.idx] = planetDatas[p.idx] || {};
    numPlanets++;
  }
  
  var data = planetDatas[p.idx];
  
  var orbitTheta = 360 * t / p.period;

  push();
  rotate(orbitTheta);
  {
    // ring
    if (drawRings) {
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

    // planet
    if (drawPlanets) {
      noStroke();
      if (planet.color) fill(planet.color);
      else              fill(0, 0, 0);
      ellipse(p.orbitR, 0, p.r);
    }

    // get screen pos
    var curMat = renderer.drawingContext.currentTransform
    var invMat = curMat;
    //print(invMat);
    var x = p.orbitR;
    var y = 0;
    var screenPos = {
      x: x * invMat.a + y * invMat.c + invMat.e,
      y: x * invMat.b + y * invMat.d + invMat.f
    };
    
    // arc top check (happens on drawPlanets pass)
    if (drawPlanets && p.name !== "sun") 
    {
      if (typeof data.prevScreenPos === "undefined") 
      {
        data.prevScreenPos = screenPos;
      } 
      
      if (topline)
      {
        if ( (screenPos.y < sunPos.y) && ((screenPos.x > sunPos.x) != (data.prevScreenPos.x > sunPos.x)) ) 
        {
          // crossed the line
          onPlanetCrossedLine(p.name || p.idx, p);
        }
      }
      
      if (bottomline)
      {
        if ( (screenPos.y > sunPos.y) && ((screenPos.x > sunPos.x) != (data.prevScreenPos.x > sunPos.x)) ) 
        {
          onPlanetCrossedLine(p.name || p.idx, p);
        }
      }
      
      if (leftline)
      { 
        
        if ( (screenPos.x < sunPos.x) && ((screenPos.y > sunPos.y) != (data.prevScreenPos.y > sunPos.y)) ) 
        {
          // crossed the line
          onPlanetCrossedLine(p.name || p.idx, p);
        }
      }
      
      if (rightline)
      {
        if ( (screenPos.x > sunPos.x) && ((screenPos.y < sunPos.y) != (data.prevScreenPos.y < sunPos.y)) ) 
        {
          // crossed the line
          onPlanetCrossedLine(p.name || p.idx, p);
        }
      }
      data.prevScreenPos = screenPos;
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



  // trails
  var numTrailSegments = 1000;
  trailDatas.splice(0, max(0, trailDatas.length-numTrailSegments));

  // fill(226, 226, 224);
  // noFill();
  // noStroke();

  // stroke(100);
  stroke(0);
  // fill(245 * 0.2, 245 * 0.2, 243 * 0.2);
  fill(245, 245, 243);
  strokeWeight(1);
  for (var i = 0; i < trailDatas.length; i++) {
    var a = i/numTrailSegments;
    // fill(226 * ((1-a) * 0.7 + 0.3), 226 * ((1-a) * 0.7 + 0.3), 224 * ((1-a) * 0.7 + 0.3));
    // strokeWeight(1 * a);
    // ellipse(trailDatas[i].x, trailDatas[i].y, 8 * (a * 0.9 + 0.1) );
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


  push();
  translate(centerX, centerY);
  //translate(centerX * 0.2, centerX * 0.2);
  scale(vpR);
  {
    // planets
    drawPlanet(systemRoot, false, true);
  }
  pop();

  stroke(226 * 0.6, 226 * 0.6, 224 * 0.6, 255 * 0.5);
  // stroke(226 * 0.2, 226 * 0.2, 224 * 0.2);
  // stroke(255);
  strokeWeight(2/vpR);
  push();
  translate(centerX, centerY);
  //translate(centerX * 0.2, centerX * 0.2);
  scale(vpR);
  
  {

    // rings
    drawPlanet(systemRoot, true, false);

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
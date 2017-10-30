
// IMPORTANT NOTE: requires chrome with experimental canvas features enabled in chrome://flags (for canvas transform matrix retrieval - can be replaced with external transform system if necessary)

/*
//
separate ring functions for type of planet
noise functions for collisions
//decay time control
//timbre control
tick percussion sounds
*/

var reverbSoundFile = './reverbs/BX20E103.wav';
var convolver;
var myReverbGain = 0.10;

var fps = 30;
var centerX, centerY;
var renderer;
var vpR; // radius of biggest circle that fits in viewport
var t = 0;
var startTime = new Date().getTime();
var sunPos; // screen pixels

var topline = 0;
var bottomline = 0;
var leftline = 0;
var rightline = 0;

var detune = 4;// was 2
var randFreqs = [];
var numOsc = 6;
var gains = [];
var pitchPanners = [];
var noisePanners = [];
var tickPanners = [];
var oscs = [];
var pitchFilters = [];
var noiseFilters = [];
var tickFilters = [];
var ticks = [];
var tickGains = [];
var noises = [];
var noiseGains = [];
var pitchIndex = [];
var fundamentals = [];
var howManyPlanets = getNumPlanets();
var moonsOn = [];
var ticksOn = [];
var ringsOn = [];
var planetsOn = [];
var currentColor = 1;
var planetScalar = 1;
var ticksScalar = 4;
var toneBrightness = 0.0;
var planetNum = -1;
var previousTickPos = [];
//var myScale = [60, 61.77, 62.04, 62.4, 64.71, 64.44, 66.75, 67.02, 67.38, 69.69, 69.42, 71.73]; // just tuned piano (La Monte Young)
var myScale = [60, 61.05, 62.04, 62.97, 63.86, 64.71, 65.51, 67.02, 68.4, 69.05, 69.69, 70.88];
var scales = [[46.88, 51.86, 54.83, 61.55, 65.90, 76.91, 78.83, 91.55, 94.51, 101.0],
[51.42, 58.88, 63.09, 70.44, 71.73, 74.10, 80.70, 82.74, 94.51, 101],
[47.0, 54.02, 61.67, 66.65, 73.67, 83.63, 92.69, 94.53, 101.53, 104.69],
[44.87, 51.86, 55.73, 61.55, 63.86, 77.9, 78.84, 90.84, 101.1, 102.0],
[36.0, 51.86, 55.02, 62.04, 65.53, 69.06, 72.0, 81.06, 101.30, 103.25]];


var bufferSize = 4096;
var pinkNoise;
var whiteNoise;

function generatePinkNoise() {
    var b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
    var node = context.createScriptProcessor(bufferSize, 1, 1);
    node.onaudioprocess = function(e) {
        var output = e.outputBuffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            var white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            output[i] *= 0.11; // (roughly) compensate for gain
            b6 = white * 0.115926;
        }
    }
    return node;
}

function generateWhiteNoise() {
    var node = context.createScriptProcessor(bufferSize, 1, 1);
    node.onaudioprocess = function(e) {
        var output = e.outputBuffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            var white = Math.random() * 2 - 1;           
            output[i] = white;
        }
    }
    return node;
}


function setup() {
  // misc
  print = console.log;

  noCursor();

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

  for (var i = 0; i < 11; i++)
  {
    moonsOn[i] = 0;
    ticksOn[i] = 0;
    ringsOn[i] = 0;
    planetsOn[i] = 0;
    previousTickPos[i] = [];
    for (var j = 0; j < 64; j++)
    {
      previousTickPos[i][j] = 0;
    }
  }
      
}

function initSound(){

  context = new AudioContext;

  convolver = context.createConvolver();
  var reverbGain = context.createGain();
  // grab audio track via XHR for convolver node
  reverbGain.gain.value = myReverbGain;
  var soundSource, SpringReverbBuffer;

  //get that REVERBZ
  ajaxRequest = new XMLHttpRequest();
  ajaxRequest.open('GET', reverbSoundFile, true);
  ajaxRequest.responseType = 'arraybuffer';
  ajaxRequest.onload = function() {
    var audioData = ajaxRequest.response;
    context.decodeAudioData(audioData, function(buffer) {
        SpringReverbBuffer = buffer;
        convolver.buffer = SpringReverbBuffer;
        convolver.connect(reverbGain);
        reverbGain.connect(context.destination);
        console.log("reverb Loaded");
      }, function(e){"Error with decoding audio data" + e.err;});
  }
  
  ajaxRequest.send();

  pinkNoise = generatePinkNoise();
  whiteNoise = generateWhiteNoise();

  //pitches for planet sphere line crossings
  for (var j = 0; j < howManyPlanets; j++)
  {
    oscs[j] = [];
    gains[j] = [];
    pitchFilters[j] = context.createBiquadFilter();

    pitchPanners[j] = context.createStereoPanner();
    pitchFilters[j].connect(pitchPanners[j]);
    pitchFilters[j].connect(convolver);
    pitchPanners[j].connect(context.destination);
    pitchPanners[j].pan.value = (Math.random() * 2.0) - 1.0;
    print(scales[j]);

    pitchIndex[j] = j % scales[0].length;
    print(pitchIndex[j]);
    var fundamental = midiToFreq(scales[0][pitchIndex[j]]);

    pitchFilters[j].frequency.value = random(fundamental, fundamental+random(500,6000));
    pitchFilters[j].Q.value = 1.0;
 
    fundamentals[j] = fundamental;

    for (var i = 0; i < numOsc; i++) 
    {
      var o = context.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = fundamental * (i % 3);
      o.detune.value = random(-detune, detune); // random detuning
  
      var g = context.createGain();

      o.connect(g);
      g.gain.value = 0.0;
      g.connect(pitchFilters[j]);
      o.start(0);
      oscs[j].push(o);
      gains[j].push(g);
    }
  }

  //dark noise sounds for planet sphere collisions
  for (var j = 0; j < howManyPlanets; j++)
  {
    noiseFilters[j] = context.createBiquadFilter();

    noisePanners[j] = context.createStereoPanner();
    noiseFilters[j].connect(convolver);
    noiseFilters[j].connect(noisePanners[j]);
    noisePanners[j].connect(context.destination);
    noisePanners[j].pan.value = (Math.random() * 2.0) - 1.0;
    var myIndex = (Math.round(Math.random() * (myScale.length - 1)));
    var myOctave = pow(2, (Math.round(Math.random() * 6.0)));
    var fundamental = midiToFreq(myScale[myIndex] - 36) * (myOctave + 1);
    noiseFilters[j].frequency.value = random(fundamental, fundamental+random(500,6000));
    noiseFilters[j].Q.value = 1.0;
  
    var o = context.createBiquadFilter();
    o.frequency.value = fundamental;
    o.Q.value = 40.0;
    var g = context.createGain();

    pinkNoise.connect(o);
    o.connect(g);
    g.gain.value = 0.0;
    g.connect(noiseFilters[j]);
    noises[j] = o;
    noiseGains[j] = g;
    
  }

  //white noise sounds for tick line crossings
  for (var j = 0; j < howManyPlanets; j++)
  {  
    tickFilters[j] = context.createBiquadFilter();
    tickFilters[j].type = "highpass";

    tickPanners[j] = context.createStereoPanner();
    tickFilters[j].connect(convolver);
    tickFilters[j].connect(tickPanners[j]);
    tickPanners[j].connect(context.destination);
    tickPanners[j].pan.value = (Math.random() * 2.0) - 1.0;
    var myIndex = (Math.round(Math.random() * (myScale.length - 1)));
    var myOctave = pow(2, (Math.round(Math.random() * 6.0)));
    var fundamental = midiToFreq(myScale[myIndex] - 36) * (myOctave + 1);
    tickFilters[j].frequency.value = random(fundamental, fundamental+random(400,10000));
    tickFilters[j].Q.value = 1.0;
  
    var o = context.createBiquadFilter();
    o.type = "bandpass";
    o.frequency.value = (tickFilters[j].frequency.value + 700);
    o.Q.value = 1.0;
    var g = context.createGain();

    whiteNoise.connect(o);
    o.connect(g);
    g.gain.value = 0.0;
    g.connect(tickFilters[j]);
    ticks[j] = o;
    tickGains[j] = g;
    
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

function ring(whichPlanet, planet, linecolor)
{
  //print(pitchIndex[whichPlanet]);
  var fundamental = midiToFreq(scales[linecolor-1][pitchIndex[whichPlanet]]);
  if (planet.moon)
  {
    var myOctave = (pow(2, (Math.round(Math.random() * 6.0)))) / 4.0;
    fundamental = fundamental * (myOctave); 
    print(myOctave);
  } 
  fundamentals[whichPlanet] = fundamental;

  pitchFilters[whichPlanet].frequency.setValueAtTime(random(fundamentals[whichPlanet], fundamentals[whichPlanet]+(toneBrightness * 5000.0)), context.currentTime);
  for (var i = 0; i < numOsc; i++) 
  {
    oscs[whichPlanet][i].frequency.setValueAtTime(fundamentals[whichPlanet] * (i % 3), context.currentTime);
    //ramp up to the amplitude of the harmonic quickly (within 7ms)
    gains[whichPlanet][i].gain.cancelScheduledValues(0);

    gains[whichPlanet][i].gain.setTargetAtTime((random(0.0000001,(4.0/(howManyPlanets*numOsc)))), context.currentTime, 0.005);

    //ramp down to almost zero (non-zero to avoid divide by zero in exponential function) over the decay time for the harmonic
    gains[whichPlanet][i].gain.setTargetAtTime(0.0000001, (context.currentTime+0.015),random(0.001, (planetScalar - .2) * 3.0));
  }
}

function collide(whichPlanet)
{
  //print(whichPlanet);
  noises[whichPlanet].Q.value = map(mouseY, height, 0, 7.0, 40.0);
  noiseGains[whichPlanet].gain.cancelScheduledValues(0);
  noiseGains[whichPlanet].gain.setTargetAtTime(random(0.000001,0.1), context.currentTime, 0.005);
  //ramp down to almost zero (non-zero to avoid divide by zero in exponential function) over the decay time for the harmonic
  noiseGains[whichPlanet].gain.setTargetAtTime(0.0000001, (context.currentTime+0.015),random(0.001, map(mouseX, 0, width, .05, 1.7)));
}

function tickCrossSound(whichPlanet)
{
  //print(whichPlanet);
  tickGains[whichPlanet].gain.cancelScheduledValues(0);
  tickGains[whichPlanet].gain.setTargetAtTime(random(0.000001,0.1), context.currentTime, 0.005);
  //ramp down to almost zero (non-zero to avoid divide by zero in exponential function) over the decay time for the harmonic
  tickGains[whichPlanet].gain.setTargetAtTime(0.0000001, (context.currentTime+0.015),random(0.01, 0.02));
}


// gets called whenever a planet crosses a line
function onPlanetCrossedLine(planetName, planet, linecolor) {
  if (planetsOn[planetName] && ((planet.moon == false) || (moonsOn[planetName] == true)))
  {
    ring(planet.idx, planet, linecolor);
  }
  //console.log("planet crossed line: " + planetName + "  planet " + planet.moon + "  linecolor " + linecolor);
}

// gets called whenever a tick crosses a line
function onTickCrossedLine(planetName, planet, linecolor) {
  if (ticksOn[planetName])
  {
    tickCrossSound(planet.idx, planet, linecolor);
  }
  //console.log("tick crossed line: " + planetName + "  planet " + planet.moon + "  linecolor " + linecolor);
}

// gets called _once_ each frame for each pair of overlapping planets
function onPlanetTouchingPlanetPerFrame(planetName1, planet1, planetName2, planet2, centerDist) {
  // print("planets " + planetName1 + " and " + planetName2 + " are touching with center dist " + centerDist + "!");
}

// called once whenever a pair starts touching
function onPlanetTouchingPlanetEnter(planetName1, planet1, planetName2, planet2) {
  print("planets " + planetName1 + " and " + planetName2 + " are now touching");

  if ((planetsOn[planetName1] || planetsOn[planetName2]) && (moonsOn[planetName1] || moonsOn[planetName2]))
  {
    if (planetName1 != "sun")
    {
      collide(planetName1);
    }
    else
    {
      collide(0);
    }
    print(planet1.idx + "   " + planet2.idx);
  }
    

}

// called once whenever a pair stops touching
function onPlanetTouchingPlanetExit(planetName1, planet1, planetName2, planet2) {
  //print("planets " + planetName1 + " and " + planetName2 + " are no longer touching");
}

function arePlanetsTouching(p1, p2) {
  return p1.state.touching[p2];
}

var planetDatas = [];
var planetsList = [];

var trailDatas = [];

function keyPressed() 
{
  if (keyCode === LEFT_ARROW) {
    leftline = leftline > 0 ? 0 : currentColor;
  }
  if (keyCode === RIGHT_ARROW) {
    rightline = rightline > 0 ? 0 : currentColor;
  }
  if (keyCode === UP_ARROW) {
    topline = topline > 0 ? 0 : currentColor;
  }
  if (keyCode === DOWN_ARROW) {
    bottomline = bottomline > 0 ? 0 : currentColor;
  }
 
  if (planetNum > -1) {
    if (keyCode === 48) { // 0 - toggle moons
      if (planetNum == 10) // all planets
      {
        if (moonsOn[10] == 1)
        {
          moonsOn[10] = 0;
          for (var i = 0; i < 9; i++)
          {
            moonsOn[i] = 0;
          }
        }
        else
        {
          moonsOn[10] = 1;
          for (var i = 0; i < 9; i++)
          {
            moonsOn[i] = 1;
          }
        }
      }
      else
      {
        if (moonsOn[planetNum] == 1)
        {
          moonsOn[planetNum] = 0;
        }
        else
        {
          moonsOn[planetNum] = 1;
        }
      }
    }
    if (keyCode === 189) // - - toggle ticks
    {
      if (planetNum == 10) // all planets
      {
        if (ticksOn[10] == 1)
        {
          ticksOn[10] = 0;
          for (var i = 0; i < 9; i++)
          {
            ticksOn[i] = 0;
          }
        }
        else
        {
          ticksOn[10] = 1;
          for (var i = 0; i < 9; i++)
          {
            ticksOn[i] = 1;
          }
        }
      }
      else
      {
        if (ticksOn[planetNum] == 1)
        {
          ticksOn[planetNum] = 0;
        }
        else
        {
          ticksOn[planetNum] = 1;
        }
      }
    }
    if (keyCode === 57) // 9 - toggle rings
    {
      if (planetNum == 10) // all planets
      {
        if (ringsOn[10] == 1)
        {
          ringsOn[10] = 0;
          for (var i = 0; i < 9; i++)
          {
            ringsOn[i] = 0;
          }
        }
        else
        {
          ringsOn[10] = 1;
          for (var i = 0; i < 9; i++)
          {
            ringsOn[i] = 1;
          }
        }
      }
      else
      {
        if (ringsOn[planetNum] == 1)
        {
          ringsOn[planetNum] = 0;
        }
        else
        {
          ringsOn[planetNum] = 1;
        }
      }
    }
    if (keyCode === 80) // p - toggle planets
    {
      if (planetNum == 10) // all planets
      {
        if (planetsOn[10] == 1)
        {
          planetsOn[10] = 0;
          for (var i = 0; i < 9; i++)
          {
            planetsOn[i] = 0;
          }
        }
        else
        {
          planetsOn[10] = 1;
          for (var i = 0; i < 9; i++)
          {
            planetsOn[i] = 1;
          }
        }
      }
      else
      {
        if (planetsOn[planetNum] == 1)
        {
          planetsOn[planetNum] = 0;
        }
        else
        {
          planetsOn[planetNum] = 1;
        }
      }
    }
    if (keyCode === 79) // O - toggle planets and rings
    {
      if (planetNum == 10) // all planets
      {
        if (planetsOn[10] == 1)
        {
          planetsOn[10] = 0;
          for (var i = 0; i < 9; i++)
          {
            planetsOn[i] = 0;
            ringsOn[i] = 0;
          }
        }
        else
        {
          planetsOn[10] = 1;
          for (var i = 0; i < 9; i++)
          {
            planetsOn[i] = 1;
            ringsOn[i] = 1;
          }
        }
      }
      else
      {
        if (planetsOn[planetNum] == 1)
        {
          planetsOn[planetNum] = 0;
          ringsOn[planetNum] = 0;
        }
        else
        {
          planetsOn[planetNum] = 1;
          ringsOn[planetNum] = 1;
        }
      }
    }
  }
  //colors (symbolizing which chord)

  // ASDFGH: set color (applied to lines when they're turned on)
  // if (keyCode === 65) 
  // {
  //   currentColor = 0;
  // }
  if (keyCode === 83) 
  {
    currentColor = 1;
  }
  if (keyCode === 68) 
  {
    currentColor = 2;
  }
  if (keyCode === 70) 
  {
    currentColor = 3;
  }
  if (keyCode === 71) 
  {
    currentColor = 4;
  }
  if (keyCode === 72) 
  {
    currentColor = 5;
  }


  //ticks Scalar
  if (keyCode === 90) 
  {
    ticksScalar = 2;
  }
    if (keyCode === 88) 
  {
    ticksScalar = 3;
  }
    if (keyCode === 67) 
  {
    ticksScalar = 4;
  }
    if (keyCode === 86) 
  {
    ticksScalar = 5;
  }
    if (keyCode === 66) 
  {
    ticksScalar = 6;
  }
  if (keyCode === 78) 
  {
    ticksScalar = 7;
  }
  if (keyCode === 77) 
  {
    ticksScalar = 8;
  }
  if (keyCode === 188) 
  {
    ticksScalar = 9;
  }
  if (keyCode === 190) 
  {
    ticksScalar = 10;
  }
  if (keyCode === 191) 
  {
    ticksScalar = 11;
  }

  //planet selection
  if (keyCode === 49) 
  {
    planetNum = 1;
  }
  if (keyCode === 50) 
  {
    planetNum = 2;
  }
  if (keyCode === 51) 
  {
    planetNum = 3;
  }
  if (keyCode === 52) 
  {
    planetNum = 4;
  }
  if (keyCode === 53) 
  {
    planetNum = 5;
  }
  if (keyCode === 54) 
  {
    planetNum = 6;
  }
  if (keyCode === 55) 
  {
    planetNum = 7;
  }
  if (keyCode === 56) 
  {
    planetNum = 8;
  }
  if (keyCode === 192) // `
  {
    planetNum = 10;
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
  planetsList[p.idx] = planet;
  
  var planetState = planetDatas[p.idx];
  planetState.def = planet;
  planet.state = planetState;
  
  var orbitTheta = 360 * t / p.period;

  push();
  rotate(orbitTheta);
  {
    // draw ring
    if (drawRings && p.orbitR > 0) 
    {
        if ((p.moon == false) || moonsOn[p.name])
        { 
          // ring
          noFill();
          if (ringsOn[p.name])
          {
            ellipse(0, 0, p.orbitR);
          }
          // ring ticks

          if (ticksOn[p.name])
          {
              var numTicks = p.numTicks * ticksScalar;

              for (var j = 0; j < numTicks; j++) 
              {
                // HACK: start at >0 degrees because 0-degree subpixel line renders more opaque in chrome
                var theta = map(j, 0, numTicks, 0.05, 360);
                // theta += sin(theta*3) * 6;
                var v = createVector(cos(theta), sin(theta));
                var v0 = p5.Vector.mult(v, p.orbitR - p.tickInner);
                var v1 = p5.Vector.mult(v, p.orbitR + p.tickOuter);
                line(v0.x, v0.y, v1.x, v1.y);
              }
          }
        }
    }

    // draw planet
    if (drawPlanets) {
      if ((((p.moon == false) || moonsOn[p.name]) && planetsOn[p.name]) || (p.name == "sun"))
      { 
        noStroke();
        // if (planet.color) fill(planet.color);
        // else              fill(0, 0, 0);

        toneBrightness = 1.0 - (mouseY / height);
        var topColor = [1, 1, 1];
        var bottomColor = [1, 1, 1];
        fill(
          bottomColor[0]*toneBrightness + topColor[0]*(1-toneBrightness), 
          bottomColor[1]*toneBrightness + topColor[1]*(1-toneBrightness), 
          bottomColor[2]*toneBrightness + topColor[2]*(1-toneBrightness)
        );

        if (planet.state.numPlanetsTouching > 0) {
          fill(255, 0, 0);
        }
        ellipse(p.orbitR, 0, p.r * planetScalar);
      }
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
      screenPos.x = screenPos.x * vpR + centerX;
      screenPos.y = screenPos.y * vpR + centerY;


      // initialize prevScreenPos
      if (typeof planetState.prevScreenPos === "undefined") {
        planetState.prevScreenPos = screenPos;
      }

      planetState.screenPos = screenPos;
      


      // line crossing checks
      if (p.name !== "sun") 
      {
        
        if (topline > 0)
        {
          if ( (screenPos.y < sunPos.y) && ((screenPos.x > sunPos.x) != (planetState.prevScreenPos.x > sunPos.x)) ) 
          {
            onPlanetCrossedLine(p.name || p.idx, p, topline);
          }
        }
        
        if (bottomline > 0)
        {
          if ( (screenPos.y > sunPos.y) && ((screenPos.x > sunPos.x) != (planetState.prevScreenPos.x > sunPos.x)) ) 
          {
            onPlanetCrossedLine(p.name || p.idx, p, bottomline);
          }
        }
        
        if (leftline > 0)
        { 
          
          if ( (screenPos.x < sunPos.x) && ((screenPos.y > sunPos.y) != (planetState.prevScreenPos.y > sunPos.y)) ) 
          {
            onPlanetCrossedLine(p.name || p.idx, p, leftline);
          }
        }
        
        if (rightline > 0)
        {
          if ( (screenPos.x > sunPos.x) && ((screenPos.y < sunPos.y) != (planetState.prevScreenPos.y < sunPos.y)) ) 
          {
            onPlanetCrossedLine(p.name || p.idx, p, rightline);
          }
        }
      }

      planetState.prevScreenPos = screenPos;


      //now check ticks

      var numTicks = p.numTicks * ticksScalar;
      for (var j = 0; j < numTicks; j++) 
      {
        // HACK: start at >0 degrees because 0-degree subpixel line renders more opaque in chrome
        var theta = map(j, 0, numTicks, 0.05, 360);
        // theta += sin(theta*3) * 6;
        var v = createVector(cos(theta), sin(theta));
        x = v.x;
        y = v.y;
        screenPos = {
          x: x * invMat.a + y * invMat.c + invMat.e,
          y: x * invMat.b + y * invMat.d + invMat.f
        };
        screenPos.x = screenPos.x * 30 + centerX;
        screenPos.y = screenPos.y * 30 + centerY;

        if (ticksOn[p.name])
        {
          if (p.name !== "sun") 
          {
            if (topline > 0)
            {
              if ( (screenPos.y < sunPos.y) && ((screenPos.x > sunPos.x) != (previousTickPos[p.name][j].x > sunPos.x)) ) 
              {
                onTickCrossedLine(p.name || p.idx, p, topline);
              }
            }

            if (bottomline > 0)
            {
              if ( (screenPos.y > sunPos.y) && ((screenPos.x > sunPos.x) != (previousTickPos[p.name][j].x > sunPos.x)) ) 
              {
                onTickCrossedLine(p.name || p.idx, p, bottomline);
              }
            }
            
            if (leftline > 0)
            { 
              if ( (screenPos.x < sunPos.x) && ((screenPos.y > sunPos.y) != (previousTickPos[p.name][j].y > sunPos.y)) ) 
              {
                onTickCrossedLine(p.name || p.idx, p, leftline);
              }
            }
            
            if (rightline > 0)
            {
              if ( (screenPos.x > sunPos.x) && ((screenPos.y < sunPos.y) != (previousTickPos[p.name][j].y < sunPos.y)) ) 
              {
                onTickCrossedLine(p.name || p.idx, p, rightline);
              }
            }
          }
        }
        previousTickPos[p.name][j] = screenPos;
        
      }
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

    if ((p1.moon == false) || (moonsOn[p1.name] == true))
    {
      for (var j = i+1; j < planetsList.length; j++) {
        var p2 = planetsList[j];
        
        if ((p2.moon == false) || (moonsOn[p2.name] == true))
        {

          var dx = p1.state.screenPos.x - p2.state.screenPos.x;
          var dy = p1.state.screenPos.y - p2.state.screenPos.y;
          var dist = sqrt(dx*dx + dy*dy);
          if (dist <= ((p1.r * planetScalar) + (p2.r * planetScalar)) * vpR) 
          {
            onPlanetTouchingPlanetPerFrame(p1.name || p1.idx, p1, p2.name || p2.idx, p2, dist);
            
            if (!touchingPairs.has(p1.state)) 
            {
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

var planetSystem;

function getPlanetSystem() {

  // defines the solar system
  // refreshed every frame for live reloading purposes - can be made static without other changes
  planetSystem = planetSystem || {
    name: "sun",
    orbitR: 0,
    r: 0.025,
    period: 1,
    numTicks: 0,
    noTrail: true,
    moon: false,
    orbiters: [
      {
        name: 1,
        orbitR: 0.15,
        r: 0.02,
        period: 6,
        numTicks: 1,
        numCurrentTicks: 0,
        tickInner: .01,
        tickOuter: .01,
        moon: false,
        orbiters: [
          {
            name: 1,
            orbitR: 0.15,
            r: 0.02,
            period: 9,
            moon: true,

          },
          {
            name: 1,
            orbitR: 0.25,
            r: 0.02,
            period: 10,
            moon: true,
          },
        ],
      },
      {
        name: 2,
        orbitR: 0.25,
        r: 0.03,
        period: 7,
        numTicks: 1,
        numCurrentTicks: 0,
        tickInner: .01,
        tickOuter: .01,
        moon: false,
        orbiters: [
          {
            name: 2,
            orbitR: 0.15,
            r: 0.02,
            period: 8,
            moon: true,

          },
          {
            name: 2,
            orbitR: 0.25,
            r: 0.02,
            period: 2,
            moon: true,
          },
        ],

      },
      {
        name: 3,
        orbitR: 0.35,
        r: 0.03,
        period: 11,
        numTicks: 1,
        numCurrentTicks: 0,
        tickInner: .01,
        tickOuter: .01,
        moon: false,
        orbiters: [
          {
            name: 3,
            orbitR: 0.1,
            r: 0.02,
            period: 7,
            moon: true,

          },
          {
            name: 3,
            orbitR: 0.2,
            r: 0.02,
            period: 6,
            moon: true,
          },
        ],

      },
      {
        name: 4,
        orbitR: 0.45,
        r: 0.03,
        period: 5,
        moon: false,
        noTrail: false,
        numTicks: 2,
        numCurrentTicks: 0,
        tickInner: .01,
        tickOuter: .01,
        orbiters: [

           { 
             name: 4,
             orbitR: 0.1,
             r: 0.02,
             period: 2.4,
             numTicks: 0,
            noTrail: true,
            moon: true,
            
           },
        ],
      },
      {
        name: 5,
        orbitR: .55,
        r: 0.02,
        period: 10,
        moon: false,
        numTicks: 1,
        numCurrentTicks: 0,
        tickInner: .01,
        tickOuter: .01,
        orbiters: [
          {
            name: 5,
            orbitR: 0.1,
            r: 0.02,
            period: 5,
            moon: true,

          },
          {
            name: 5,
            orbitR: 0.2,
            r: 0.02,
            period: 3,
            moon: true,
          },
        ],
      },
      {
        name: 6,
        orbitR: .65,
        r: 0.02,
        period: 12,
        numTicks: 1,
        numCurrentTicks: 0,
        tickInner: .01,
        tickOuter: .01,
        moon: false,
        orbiters: [
          {
            name: 6,
            orbitR: 0.1,
            r: 0.02,
            period: 13,
            moon: true,

          },
          {
            name: 6,
            orbitR: 0.2,
            r: 0.02,
            period: 2,
            moon: true,
          },
        ],
      },
      {
        name: 7,
        orbitR: .75,
        r: 0.02,
        period: 15,
        numTicks: 1,
        numCurrentTicks: 0,
        tickInner: .01,
        tickOuter: .01,
        moon: false,
        orbiters: [
          {
            name: 7,
            orbitR: 0.1,
            r: 0.02,
            period: 12,
            moon: true,

          },
          {
            name: 7,
            orbitR: 0.2,
            r: 0.02,
            period: 1,
            moon: true,
          },
        ],
      },
      {
        name: 8,
        orbitR: .85,
        r: 0.02,
        period: 8,
        numTicks: 1,
        numCurrentTicks: 0,
        tickInner: .01,
        tickOuter: .01,
        moon: false,
        orbiters: [
          {
            name: 8,
            orbitR: 0.1,
            r: 0.01,
            period: 5,
            moon: true,

          },
          {
            name: 8,
            orbitR: 0.25,
            r: 0.05,
            period: 2,
            moon: true,
          },

        ],
      },
    ],
  };
  return planetSystem;
}

function getNumPlanets() {
  var count = 0;

  var recurse = function(p) {
    count++;
    if (p.orbiters) {
      for (var i = 0; i < p.orbiters.length; i++) {
        recurse(p.orbiters[i]);
      }
    }
  };

  recurse(getPlanetSystem());

  return count;
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
  
  var systemRoot = getPlanetSystem();


  // background(245, 245, 255);

  // background
  var a = mouseY / height;
  var topColor = [245, 245, 255];
  var bottomColor = [245, 245, 255];
  background(
    bottomColor[0]*a + topColor[0]*(1-a), 
    bottomColor[1]*a + topColor[1]*(1-a), 
    bottomColor[2]*a + topColor[2]*(1-a)
  );

  // t = frameCount / fps;
  t = (new Date().getTime() - startTime) / 1000;

  fill(50,50,0);
  rect(0, 0, 20, mouseY/8);
  strokeWeight(20);
  line(0, 0, 0, height/8);
  noStroke();
  
  planetScalar = mouseX/width + .3;


  // UPDATE PLANET DATA STUFF
  updateAndDrawPlanets(systemRoot, false, false, true);
  updatePlanetOverlaps(systemRoot);

  // DRAW PLANETS
  push();
  translate(centerX, centerY);
  scale(vpR);
  {
    updateAndDrawPlanets(systemRoot, false, true, false);
  }
  pop();

  // DRAW RINGS AND LINES
  // stroke(226 * 0.6, 226 * 0.6, 224 * 0.6, 255 * 0.5);
  // ring colors based on mouseY
  var a = mouseY / height;
  var topColor = [150, 80, 80];
  var bottomColor = [80, 80, 150];
  stroke(
    bottomColor[0]*a + topColor[0]*(1-a), 
    bottomColor[1]*a + topColor[1]*(1-a), 
    bottomColor[2]*a + topColor[2]*(1-a),
    255 * 0.75
  );
  strokeWeight(1/vpR);
  push();
  translate(centerX, centerY);
  scale(vpR);
  {

    // RINGS
    updateAndDrawPlanets(systemRoot, true, false, false);

    // LINES
    if (topline > 0)
    {
      // topline
      strokeWeight(3/vpR);
      stroke(getMyColor(topline));
      line(0, 0, 0, -vpR);
    }
    
    if (bottomline > 0)
    {
      // bottomline
      strokeWeight(3/vpR);
      stroke(getMyColor(bottomline));
      line(0, 0, 0, vpR);
    }
    if (leftline > 0)
    {
      // vertical line
      strokeWeight(3/vpR);
      stroke(getMyColor(leftline));
      line(0, 0, -vpR,0);
    }
    if (rightline > 0)
    {
      // vertical line
      strokeWeight(3/vpR);
      stroke(getMyColor(rightline));
      line(0, 0,vpR, 0);
    }


  }
  pop();
}



function getMyColor(whichColor)
{
  if (whichColor == 1)
  {
    return color('#FFB300'); // yellow
  }
  if (whichColor == 2)
  {
    return color('#27A64C'); // green
  }
  if (whichColor == 3)
  {
    return color('#0067A5'); // blue
  }
  if (whichColor == 4)
  {
    return color('#D5265B'); // red
  }
    if (whichColor == 5)
  {
    return color('#8F817F'); // gray
  }
}

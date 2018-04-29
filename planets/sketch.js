
// IMPORTANT NOTE: requires chrome with experimental canvas features enabled in chrome://flags (for canvas transform matrix retrieval - can be replaced with external transform system if necessary)

/*
//
TODO:

create new tick shape (triangle?)

create adjustable tick length

connect tick length to keys on keyboard

adjust control for color

numbers (or symbols?) on circles

*/

var soundsOn = 0;
var reverbSoundFile = './reverbs/BX20E103.wav';
var convolver;
var myReverbGain = 0.10;

var globalMIDI;

var fps = 30;
var centerX, centerY;
var renderer;
var vpR; // radius of biggest circle that fits in viewport
var t = 0;
var startTime = new Date().getTime();
var sunPos; // screen pixels
var fadeSpeed = 2;
var lineThickness = 4;
var tickThickness = 4;
var ringThickness = 2;
var differentPerc = true;
var planetText = false;
var useSymbols = false;
var useNumbers = true;
var useShapes = false;
var tickLength = [];

var theLines = [0,0,0,0];
var theLinesPrev = [0,0,0,0];
var lineFades = [0,0,0,0];
var lineFadeDirection = [0,0,0,0];
var lineColors = [0,0,0,0];

var fontLookup = ["F", "B", "g", "E", "H", "N", "P", "h", "i", "j", "k"];

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
var tickType = [];
var tickGains = [];
var noises = [];
var noiseGains = [];
var pitchIndex = [];
var fundamentals = [];
var howManyPlanets = getNumPlanets();
var moonsOn = [];
var ticksOn = [];
var ticksOnPrev = [];
var ringsOn = [];
var ringsOnPrev = [];
var planetsOn = [];
var planetsOnPrev = [];
var moonsOnPrev = [];
var currentColor = 1;
var planetScalar = 1;
var ticksScalar = [];
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

var symbolFont;
var numberFont;
var shapeFont;
function preload() {
  symbolFont = loadFont('fonts/AGATHODA.ttf');
  numberFont = loadFont('fonts/braille.ttf');
  shapeFont = loadFont('fonts/geo.ttf');
}

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

  for (var i = 0; i < 20; i++)
  {
    moonsOn[i] = 0;
    ticksOn[i] = 0;
    ticksOnPrev[i] = 0;
    ringsOn[i] = 0;
    ringsOnPrev[i] = 0;
    planetsOn[i] = 0;
    planetsOnPrev[i] = 0;
    moonsOnPrev[i] = 0;
    previousTickPos[i] = [];
    moonFades[i] = 0;
    moonFadeDirs[i] = 0;
    ticksScalar[i] = 4;
    tickLength[i] = 1;
    tickType[i] = 0;
    for (var j = 0; j < 64; j++)
    {
      previousTickPos[i][j] = 0;
    }
  }

WebMidi.enable();

      
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
    //print(scales[j]);

    pitchIndex[j] = j % scales[0].length;
    //print(pitchIndex[j]);
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
    //print(myOctave);
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
  WebMidi.outputs[0].playNote("C3");
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
    if (soundsOn)
    {
      ring(planet.idx, planet, linecolor);
    }
  }
  //console.log("planet crossed line: " + planetName + "  planet " + planet.moon + "  linecolor " + linecolor);
}

// gets called whenever a tick crosses a line
function onTickCrossedLine(planetName, planet, linecolor) {
  if (ticksOn[planetName])
  {
    if (soundsOn)
    {
      tickCrossSound(planet.idx, planet, linecolor);
    }
  }
  //console.log("tick crossed line: " + planetName + "  planet " + planet.moon + "  linecolor " + linecolor);
}

// gets called _once_ each frame for each pair of overlapping planets
function onPlanetTouchingPlanetPerFrame(planetName1, planet1, planetName2, planet2, centerDist) {
  // print("planets " + planetName1 + " and " + planetName2 + " are touching with center dist " + centerDist + "!");
}

// called once whenever a pair starts touching
function onPlanetTouchingPlanetEnter(planetName1, planet1, planetName2, planet2) {
  //print("planets " + planetName1 + " and " + planetName2 + " are now touching");

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
    //print(planet1.idx + "   " + planet2.idx);
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
    theLines[0] = theLines[0] > 0 ? 0 : currentColor;
  }
  if (keyCode === RIGHT_ARROW) {
    theLines[1] = theLines[1] > 0 ? 0 : currentColor;
  }
  if (keyCode === UP_ARROW) {
    theLines[2] = theLines[2] > 0 ? 0 : currentColor;
  }
  if (keyCode === DOWN_ARROW) {
    theLines[3] = theLines[3] > 0 ? 0 : currentColor;
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
          console.log("moonsOn[10] was 0");
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
    if (planetNum == 10)
    {
      for (var i = 0; i < 10; i++)
      {
        ticksScalar[i] = 2;
      }
    }
    else
    {
      ticksScalar[planetNum] = 2;
    }
  }
  if (keyCode === 88) 
  {
        if (planetNum == 10)
    {
      for (var i = 0; i < 10; i++)
      {
        ticksScalar[i] = 3;
      }
    }
    else
    {
      ticksScalar[planetNum] = 3;
    }
  }
  if (keyCode === 67) 
  {
    if (planetNum == 10)
    {
      for (var i = 0; i < 10; i++)
      {
        ticksScalar[i] = 4;
      }
    }
    else
    {
      ticksScalar[planetNum] = 4;
    }
  }
  if (keyCode === 86) 
  {
    if (planetNum == 10)
    {
      for (var i = 0; i < 10; i++)
      {
        ticksScalar[i] = 5;
      }
    }
    else
    {
      ticksScalar[planetNum] = 5;
    }
  }
  if (keyCode === 66) 
  {
    if (planetNum == 10)
    {
      for (var i = 0; i < 10; i++)
      {
        ticksScalar[i] = 6;
      }
    }
    else
    {
      ticksScalar[planetNum] = 6;
    }
  }
  if (keyCode === 78) 
  {
    if (planetNum == 10)
    {
      for (var i = 0; i < 10; i++)
      {
        ticksScalar[i] = 7;
      }
    }
    else
    {
      ticksScalar[planetNum] = 7;
    }
  }
  if (keyCode === 77) 
  {
    if (planetNum == 10)
    {
      for (var i = 0; i < 10; i++)
      {
        ticksScalar[i] = 8;
      }
    }
    else
    {
      ticksScalar[planetNum] = 8;
    }
  }
  if (keyCode === 188) 
  {
    if (planetNum == 10)
    {
      for (var i = 0; i < 10; i++)
      {
        ticksScalar[i] = 9;
      }
    }
    else
    {
      ticksScalar[planetNum] = 8;
    }
  }
  if (keyCode === 190) 
  {
    if (planetNum == 10)
    {
      for (var i = 0; i < 10; i++)
      {
        ticksScalar[i] = 10;
      }
    }
    else
    {
      ticksScalar[planetNum] = 10;
    }
  }
  if (keyCode === 191) 
  {
    if (planetNum == 10)
    {
      for (var i = 0; i < 10; i++)
      {
        ticksScalar[i] = 11;
      }
    }
    else
    {
      ticksScalar[planetNum] = 11;
    }
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

  
  if (keyCode === 8) // `
  {
    if (planetNum == 10)
    {
      for (var i = 0; i < 10; i++)
      {
          tickType[i] = 0;
      }
    }
    else
    {
      tickType[planetNum] = 0;
    }
  }
  if (keyCode === 220) // 
  {
    if (planetNum == 10)
    {
      for (var i = 0; i < 10; i++)
      {
          tickType[i] = 1;
      }
    }
    else
    {
      tickType[planetNum] = 1;
    }
  }

  //tick length
  if (keyCode === 81) 
  {
    if (planetNum == 10)
    {
      for (var i = 0; i < 10; i++)
      {
        tickLength[i] = .5;
      }
    }
    else
    {
      tickLength[planetNum] = .5;
    }
  }
  if (keyCode === 87) 
  {
    if (planetNum == 10)
    {
      for (var i = 0; i < 10; i++)
      {
        tickLength[i] = 1;
      }
    }
    else
    {
      tickLength[planetNum] = 1;
    }

  }
  if (keyCode === 69) 
  {
    if (planetNum == 10)
    {
      for (var i = 0; i < 10; i++)
      {
        tickLength[i] = 2;
      }
    }
    else
    {
      tickLength[planetNum] = 2;
    }
  }
  if (keyCode === 82) 
  {
    if (planetNum == 10)
    {
      for (var i = 0; i < 10; i++)
      {
        tickLength[i] = 4;
      }
    }
    else
    {
      tickLength[planetNum] = 4;
    }
  }
  if (keyCode === 84) 
  {
    if (planetNum == 10)
    {
      for (var i = 0; i < 10; i++)
      {
        tickLength[i] = 5;
      }
    }
    else
    {
      tickLength[planetNum] = 5;
    }
  }
  if (keyCode === 89) 
  {
    if (planetNum == 10)
    {
      for (var i = 0; i < 10; i++)
      {
        tickLength[i] = 7;
      }
    }
    else
    {
      tickLength[planetNum] = 7;
    }
  }
  if (keyCode === 85) 
  {
    if (planetNum == 10)
    {
      for (var i = 0; i < 10; i++)
      {
        tickLength[i] = 10;
      }
    }
    else
    {
      tickLength[planetNum] = 10;
    }
  }

}



var myCounter = 0;
var moonFades = [];
var moonFadeDirs = [];

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

    if (drawRings)
    {
      //print("in drawRings");
      //print(ringsOn[p.name] +  " + " + ringsOnPrev[p.name]);
      //print("hey!!");
        if ((ringsOn[p.name] == 1) && (ringsOnPrev[p.name] == 0))
        {
          p.rFadeDir = 1;
        }
        else if ((ringsOn[p.name] == 0) && (ringsOnPrev[p.name] == 1))
        {
          p.rFadeDir = -1;
        }
        ringsOnPrev[p.name] = ringsOn[p.name];
      
    }



    p.rFade = p.rFade + p.rFadeDir * fadeSpeed;
    if (p.rFade > 255)
    {
      p.rFade = 255;
      p.rFadeDir = 0;
    }
    else if (p.rFade < 0)
    {
      p.rFade = 0;
      p.rFadeDir = 0;
    }
    noFill();
    strokeWeight(ringThickness/vpR);
    stroke(255,255,255,p.rFade);
    ellipse(0, 0, p.orbitR);

    if (p.moon == true)
    {
          if (ringsOn[p.name] == true)
          {
            stroke(255,255,255,moonFades[p.name]);
            ellipse(0, 0, p.orbitR);
          }
    }


    if (drawRings && p.orbitR > 0) 
    {
        if ((p.moon == false) || moonsOn[p.name])
        { 
          
          // ring ticks


          if ((ticksOn[p.name] == 1) && (ticksOnPrev[p.name] == 0))
          {
            p.tFadeDir = 1;
          }
          else if ((ticksOn[p.name] == 0) && (ticksOnPrev[p.name] == 1))
          {
            p.tFadeDir = -1;
          }
          ticksOnPrev[p.name] = ticksOn[p.name];
          
          p.tFade = p.tFade + p.tFadeDir * fadeSpeed;
          if (p.tFade > 255)
          {
            p.tFade = 255;
            p.tFadeDir = 0;
          }
          else if (p.tFade < 0)
          {
            p.tFade = 0;
            p.tFadeDir = 0;
          }


          var numTicks = p.numTicks * ticksScalar[p.name];

          for (var j = 0; j < numTicks; j++) 
          {
            // HACK: start at >0 degrees because 0-degree subpixel line renders more opaque in chrome
            var theta = map(j, 0, numTicks, 0.05, 360);
            // theta += sin(theta*3) * 6;
            var v = createVector(cos(theta), sin(theta));
            var v0 = p5.Vector.mult(v, p.orbitR - (p.tickInner * tickLength[p.name]));
            var v1 = p5.Vector.mult(v, p.orbitR + (p.tickOuter * tickLength[p.name]));
            strokeWeight(tickThickness/vpR);
            stroke(255,255,255,p.tFade);
            line(v0.x, v0.y, v1.x, v1.y);

            if (tickType[p.name] == 1)
            {
              //print("hello");
              //var v2 = p5.Vector.mult(v.add(.1), p.orbitR - (p.tickInner * tickLength[p.name]));
              //var v3 = p5.Vector.mult(v.add(-.1), p.orbitR + (p.tickOuter * tickLength[p.name]));
              //line(v2.x, v2.y, v3.x, v3.y);
              var v2 = p5.Vector.mult(v, p.orbitR);
              ellipse(v2.x, v2.y, p.tickInner * tickLength[p.name]);
              //draw triangles! How does do dis?
            }

            //line(v2.x, v2.y,v3.x, v3.y); 
            //line(0,300,400,200);

          }
          
        }
    }


    // draw planet
    if (drawPlanets) {

      noStroke();

      if (p.moon == false)
      {
        if ((planetsOn[p.name] == 1) && (planetsOnPrev[p.name] == 0))
        {
          p.fadeDir = 1;
        }
        else if ((planetsOn[p.name] == 0) && (planetsOnPrev[p.name] == 1))
        {
          p.fadeDir = -1;
        }
        p.fade = p.fade + p.fadeDir * fadeSpeed;
        if (p.fade > 255)
        {
          p.fade = 255;
          p.fadeDir = 0;
        }
        else if (p.fade < 0)
        {
          p.fade = 0;
          p.fadeDir = 0;
        }
        planetsOnPrev[p.name] = planetsOn[p.name];
        fill(0,0,0,p.fade);

        if (planet.state.numPlanetsTouching > 0) {
          fill(255, 0, 0, p.fade);
        }
        ellipse(p.orbitR, 0, p.r * planetScalar);

        if (p.name != "sun")
        {
          if (planetText)
          {
            textSize(.07 * planetScalar * p.r * 30);
            if (useSymbols)
            {
              textFont(symbolFont);
            }
            else if (useNumbers)
            {
              textFont(numberFont);
            }
            else if (useShapes)
            {
              textFont(shapeFont);
            }
            fill(255, 255, 255, p.fade);
            text(fontLookup[p.name], p.orbitR-(.028*planetScalar * p.r * 30), .028 * planetScalar * p.r * 30);
          }
        }
      }
      if (p.moon == true)
      {
        if ((moonsOn[p.name] == 1) && (moonsOnPrev[p.name] == 0))
        {
          moonFadeDirs[p.name] = 1;

          //console.log("moon fade dir 1 for " + p.name);
        }
        else if ((moonsOn[p.name] == 0) && (moonsOnPrev[p.name] == 1))
        {
          moonFadeDirs[p.name] = -1;
          //console.log("moon fade dir -1 for " + p.name);
        }
        moonsOnPrev[p.name] = moonsOn[p.name];

        moonFades[p.name] = moonFades[p.name] + moonFadeDirs[p.name]* fadeSpeed;
        //console.log("moon fades " + p.name + "    = " + moonFades[p.name]);
        if (moonFades[p.name] > 255)
        {
          moonFades[p.name] = 255;
          moonFadeDirs[p.name] = 0;
        }
        else if (moonFades[p.name] < 0)
        {
          //console.log("negative!! " + moonFades[p.name]);
          moonFades[p.name] = 0;
          moonFadeDirs[p.name] = 0;
        }
        //toneBrightness = 1.0 - (mouseY / height);
        fill(0,0,0,moonFades[p.name]);

        if (planet.state.numPlanetsTouching > 0) {
          fill(255, 0, 0, moonFades[p.name]);
        }
        ellipse(p.orbitR, 0, p.r * planetScalar);

        if (p.name != "sun")
        {
          if (planetText)
          {
            textSize(.07 * planetScalar * p.r * 30);
            if (useSymbols)
            {
              textFont(symbolFont);
            }
            else if (useNumbers)
            {
              textFont(numberFont);
            }
            else if (useShapes)
            {
              textFont(shapeFont);
            }
            fill(255, 255, 255, moonFades[p.name]);
            text(fontLookup[p.name], p.orbitR-(.028*planetScalar * p.r * 30), .028 * planetScalar * p.r * 30);
          }
        }
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
      

/*
      // line crossing checks
      if (p.name !== "sun") 
      {
        

        
        if (theLines[0] > 0)
        { 
          
          if ( (screenPos.x < sunPos.x) && ((screenPos.y > sunPos.y) != (planetState.prevScreenPos.y > sunPos.y)) ) 
          {
            onPlanetCrossedLine(p.name || p.idx, p, theLines[0]);
          }
        }
        
        if (theLines[1] > 0)
        {
          if ( (screenPos.x > sunPos.x) && ((screenPos.y < sunPos.y) != (planetState.prevScreenPos.y < sunPos.y)) ) 
          {
            onPlanetCrossedLine(p.name || p.idx, p, theLines[1]);
          }
        }
        if (theLines[2] > 0)
        {
          if ( (screenPos.y < sunPos.y) && ((screenPos.x > sunPos.x) != (planetState.prevScreenPos.x > sunPos.x)) ) 
          {
            onPlanetCrossedLine(p.name || p.idx, p, theLines[2]);
          }
        }
        
        if (theLines[3] > 0)
        {
          if ( (screenPos.y > sunPos.y) && ((screenPos.x > sunPos.x) != (planetState.prevScreenPos.x > sunPos.x)) ) 
          {
            onPlanetCrossedLine(p.name || p.idx, p, theLines[3]);
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
            if (theLines[0] > 0)
            { 
              if ( (screenPos.x < sunPos.x) && ((screenPos.y > sunPos.y) != (previousTickPos[p.name][j].y > sunPos.y)) ) 
              {
                onTickCrossedLine(p.name || p.idx, p, theLines[0]);
              }
            }
            if (theLines[1] > 0)
            {
              if ( (screenPos.x > sunPos.x) && ((screenPos.y < sunPos.y) != (previousTickPos[p.name][j].y < sunPos.y)) ) 
              {
                onTickCrossedLine(p.name || p.idx, p, theLines[1]);
              }
            }
            if (theLines[2] > 0)
            {
              if ( (screenPos.y < sunPos.y) && ((screenPos.x > sunPos.x) != (previousTickPos[p.name][j].x > sunPos.x)) ) 
              {
                onTickCrossedLine(p.name || p.idx, p, theLines[2]);
              }
            }

            if (theLines[3] > 0)
            {
              if ( (screenPos.y > sunPos.y) && ((screenPos.x > sunPos.x) != (previousTickPos[p.name][j].x > sunPos.x)) ) 
              {
                onTickCrossedLine(p.name || p.idx, p, theLines[3]);
              }
            }
          }
        }
        previousTickPos[p.name][j] = screenPos;
        
      }
      */

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
        //print("drawing orbiter " + i + " of p.name = " + p.name);
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



  // t = frameCount / fps;
  t = (new Date().getTime() - startTime) / 1000;

  
  planetScalar = mouseX/width + .7;


  // UPDATE PLANET DATA STUFF
  updateAndDrawPlanets(systemRoot, false, false, true);
  updatePlanetOverlaps(systemRoot);



  // DRAW RINGS AND LINES
  // stroke(226 * 0.6, 226 * 0.6, 224 * 0.6, 255 * 0.5);
  // ring colors based on mouseY
  var a = mouseY / height;
  if (a < .25)
  {
    a = .25;
  }
  else if (a > .75)
  {
    a = .75;
  }
  var topColor = [255, 0, 0];
  var bottomColor = [0, 0, 255];
  var white_offset = 100;

  // background
  var myR = bottomColor[0]*a + topColor[0]*(1-a) + white_offset;
  if (myR > 255)
  {
    myR = 255;
  }
  var myG = bottomColor[1]*a + topColor[1]*(1-a) + white_offset;
  if (myG > 255)
  {
    myG = 255;
  }
  var myB = bottomColor[2]*a + topColor[2]*(1-a) + white_offset;
  if (myB > 255)
  {
    myB = 255;
  }
  background(myR, myG, myB);


  push();
  translate(centerX, centerY);
  scale(vpR);
  {

    // RINGS
    updateAndDrawPlanets(systemRoot, true, false, false);


    // LINES

    for (var i = 0; i < 4; i++)
    {
      

      //do the fading for the line

      if ((theLines[i] > 0) && (theLinesPrev[i] === 0)) //new line starts appearing
      {
        lineFades[i] = 0;
        lineFadeDirection[i] = 1;
      }
      if ((theLines[i] === 0) && (theLinesPrev[i] > 0)) //line should start disappearing
      {
        lineFadeDirection[i] = -1;
      }
      theLinesPrev[i] = theLines[i];


      //print("lineFades[i] = " + lineFades[i]);
      if (lineFadeDirection[i] != 0)
      {
        lineFades[i] = lineFades[i] + (lineFadeDirection[i] * fadeSpeed);
        if (lineFades[i] > 255)
        {
          lineFades[i] = 255;
          lineFadeDirection[i] = 0;
        }
        else if (lineFades[i] < 0)
        {
          lineFades[i] = 0;
          lineFadeDirection[i] = 0;
        }
      }

      //now draw the line
      if (theLines[i] > 0)
      {
        //print("theLines[i] = " + theLines[i]);
        strokeWeight(lineThickness/vpR);
        lineColors[i] = theLines[i];
        stroke(getMyColor(theLines[i], lineFades[i]));
        if (i == 0)
        {
          line(0, 0, -vpR,0);
        }
        else if (i == 1)
        {
          line(0, 0,vpR, 0);
        }
        else if (i == 2)
        {
          line(0, 0, 0, -vpR);
        }
        else if (i == 3)
        {
          line(0, 0, 0, vpR);
        }
      }
      else if ((theLines[i] == 0) && (lineFades[i] > 0))
      {
        strokeWeight(lineThickness/vpR);
        stroke(getMyColor(lineColors[i], lineFades[i]));
        if (i == 0)
        {
          line(0, 0, -vpR,0);
        }
        else if (i == 1)
        {
          line(0, 0,vpR, 0);
        }
        else if (i == 2)
        {
          line(0, 0, 0, -vpR);
        }
        else if (i == 3)
        {
          line(0, 0, 0, vpR);
        }
      }

    }

  }
  pop();
    // DRAW PLANETS
  push();
  translate(centerX, centerY);
  scale(vpR);
  {
    updateAndDrawPlanets(systemRoot, false, true, false);
  }
  pop();
}


function getMyColor(whichColor, lineFade)
{
  if (whichColor == 1)
  {
    //return color('#FFB300'); // yellow
    return color(255,255,0,lineFade); // yellow
  }
  if (whichColor == 2)
  {
    //return color('#27A64C'); // green
    return color(0,255,0,lineFade); // green
  }
  if (whichColor == 3)
  {
    //return color('#0067A5'); // blue
    return color(0,0,255,lineFade);
  }
  if (whichColor == 4)
  {
    //return color('#D5265B'); // red
    return color(255,0,0,lineFade);
  }
    if (whichColor == 5)
  {
    //return color('#8F817F'); // gray
    return color(127,127,127,lineFade);
  }
}


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
    fade: 255,
    fadeDir: 0,
    rFade: 0,
    rFadeDir:0,
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
        fade: 0,
        fadeDir: 0,
        rFade: 0,
        rFadeDir:0,
        tFade: 0,
        tFadeDir:0,
        orbiters: [
          {
            name: 1,
            orbitR: 0.15,
            r: 0.02,
            period: 9,
            moon: true,
            fade: 0,
            fadeDir: 0,
            rFade: 0,
            rFadeDir:0,

          },
          {
            name: 1,
            orbitR: 0.25,
            r: 0.02,
            period: 10,
            moon: true,
            fade: 0,
            fadeDir: 0,
            rFade: 0,
            rFadeDir:0,
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
        fade: 0,
        fadeDir: 0,
        rFade: 0,
        rFadeDir:0,
        tFade: 0,
        tFadeDir:0,
        orbiters: [
          {
            name: 2,
            orbitR: 0.15,
            r: 0.02,
            period: 8,
            moon: true,
            fade: 0,
            fadeDir: 0,
            rFade: 0,
            rFadeDir:0,

          },
          {
            name: 2,
            orbitR: 0.25,
            r: 0.02,
            period: 2,
            moon: true,
            fade: 0,
            fadeDir: 0,
            rFade: 0,
            rFadeDir:0,
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
        fade: 0,
        fadeDir: 0,
        rFade: 0,
        rFadeDir:0,
        tFade: 0,
        tFadeDir:0,
        orbiters: [
          {
            name: 3,
            orbitR: 0.1,
            r: 0.02,
            period: 7,
            moon: true,
            fade: 0,
            fadeDir: 0,
            rFade: 0,
            rFadeDir:0,

          },
          {
            name: 3,
            orbitR: 0.2,
            r: 0.02,
            period: 6,
            moon: true,
            fade: 0,
            fadeDir: 0,
            rFade: 0,
            rFadeDir:0,
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
        fade: 0,
        fadeDir: 0,
        rFade: 0,
        rFadeDir:0,
        tFade: 0,
        tFadeDir:0,
        orbiters: [

           { 
             name: 4,
             orbitR: 0.1,
             r: 0.02,
             period: 2.4,
             numTicks: 0,
            noTrail: true,
            moon: true,
            fade: 0,
            fadeDir: 0,
            rFade: 0,
            rFadeDir:0,
            
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
        fade: 0,
        fadeDir: 0,
        rFade: 0,
        rFadeDir:0,
        tFade: 0,
        tFadeDir:0,
        orbiters: [
          {
            name: 5,
            orbitR: 0.1,
            r: 0.02,
            period: 5,
            moon: true,
            fade: 0,
            fadeDir: 0,
            rFade: 0,
            rFadeDir:0,

          },
          {
            name: 5,
            orbitR: 0.2,
            r: 0.02,
            period: 3,
            moon: true,
            fade: 0,
            fadeDir: 0,
            rFade: 0,
            rFadeDir:0,
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
        fade: 0,
        fadeDir: 0,
        rFade: 0,
        rFadeDir:0,
        tFade: 0,
        tFadeDir:0,
        orbiters: [
          {
            name: 6,
            orbitR: 0.1,
            r: 0.02,
            period: 13,
            moon: true,
            fade: 0,
            fadeDir: 0,
            rFade: 0,
            rFadeDir:0,

          },
          {
            name: 6,
            orbitR: 0.2,
            r: 0.02,
            period: 2,
            moon: true,
            fade: 0,
            fadeDir: 0,
            rFade: 0,
            rFadeDir:0,
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
        fade: 0,
        fadeDir: 0,
        rFade: 0,
        rFadeDir:0,
        tFade: 0,
        tFadeDir:0,
        orbiters: [
          {
            name: 7,
            orbitR: 0.1,
            r: 0.02,
            period: 12,
            moon: true,
            fade: 0,
            fadeDir: 0,
            rFade: 0,
            rFadeDir:0,

          },
          {
            name: 7,
            orbitR: 0.2,
            r: 0.02,
            period: 1,
            moon: true,
            fade: 0,
            fadeDir: 0,
            rFade: 0,
            rFadeDir:0,
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
        fade: 0,
        fadeDir: 0,
        rFade: 0,
        rFadeDir:0,
        tFade: 0,
        tFadeDir:0,
        orbiters: [
          {
            name: 8,
            orbitR: 0.1,
            r: 0.01,
            period: 5,
            moon: true,
            fade: 0,
            fadeDir: 0,
            rFade: 0,
            rFadeDir:0,

          },
          {
            name: 8,
            orbitR: 0.25,
            r: 0.05,
            period: 2,
            moon: true,
            fade: 0,
            fadeDir: 0,
            rFade: 0,
            rFadeDir:0,
          },

        ],
      },
    ],
  };
  return planetSystem;
}


function success (midi) {
    console.log('Got midi!', midi);
    globalMIDI = midi;
    listInputsAndOutputs( midi);
}
 
function failure () {
    console.error('No access to your midi devices.')
}

function listInputsAndOutputs( midiAccess ) {
  for (var input in midiAccess.inputs) {
    console.log( "Input port [type:'" + input.type + "'] id:'" + input.id +
      "' manufacturer:'" + input.manufacturer + "' name:'" + input.name +
      "' version:'" + input.version + "'" );
  }

  for (var output in midiAccess.outputs) {
    console.log( "Output port [type:'" + output.type + "'] id:'" + output.id +
      "' manufacturer:'" + output.manufacturer + "' name:'" + output.name +
      "' version:'" + output.version + "'" );
  }
}


function sendMiddleC( midiAccess, portID ) {
  var noteOnMessage = [0x90, 60, 0x7f];    // note on, middle C, full velocity
  var output = midiAccess.outputs.get(portID);
  console.log("note!");
  output.send( noteOnMessage );  //omitting the timestamp means send immediately.
  output.send( [0x80, 60, 0x40], window.performance.now() + 1000.0 ); // Inlined array creation- note off, middle C,  
                                                                      // release velocity = 64, timestamp = now + 1000ms.
}
var connect_to_this_ip = '127.0.0.1'
var incomingPort = 3333;
var outgoingPort = 3334;


function setup() {
    createCanvas(400, 400);
    setupOsc(incomingPort, outgoingPort);
}

function draw() {
  background(0);
  ellipse(mouseX, mouseY, 100, 100);
  //sendOsc('/mousePos', [mouseX/width, mouseY/height]);
}


function receiveOsc(address, value) {
    console.log("received OSC: " + address + ", " + value);
/*
    if (address == '/myColor')
  {
   mydot = [255 - value, value, 0];
  }
*/
}



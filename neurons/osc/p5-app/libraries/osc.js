function sendOsc(address, value) {
  if (isConnected == true)
  {
    socket.emit('message', [address].concat(value));
  }
}

var socket;
var isConnected = false;

function setupOsc(oscPortIn, oscPortOut) {
    socket = io.connect('http://127.0.0.1', { port: 8085, rememberTransport: false });
    socket.on('connect', function() {
        socket.emit('config', {    
            server: { port: oscPortIn,  host: connect_to_this_ip},
            client: { port: oscPortOut, host: connect_to_this_ip}
        });
        isConnected = true;
    });
    socket.on('message', function(msg) {
        if (msg[0] == '#bundle') {
            for (var i=2; i<msg.length; i++) {
                receiveOsc(msg[i][0], msg[i].splice(1));
            }
        } else {
            receiveOsc(msg[0], msg.splice(1));
        }
    });
}

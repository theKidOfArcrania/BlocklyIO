//TODO: rename as "blockly.io".
var hostname = process.argv[2] || "0.0.0.0";
var port = parseInt(process.argv[3]) || 80;

var finalhandler = require('finalhandler');
var http = require('http');
var serveStatic = require('serve-static');

// Serve up public/ftp folder
var serve = serveStatic('public/', {'setHeaders': setHeaders});

function setHeaders(res, path) {
  res.setHeader('Cache-Control', 'public, max-age=0');
}

// Create server
var server = http.createServer(function onRequest (req, res) {
  serve(req, res, finalhandler(req, res));
});

// Listen
server.listen(port, hostname);

server = http.createServer();
var io = require('socket.io')(server);
io.set('transports', ['websocket']);

var Game = require('./game-server.js');
var games = [new Game()];
io.on('connection', function(socket){
  socket.on("hello", function(data, fn) {
    //TODO: error checking.
    if (data.name && data.name.length > 32)
      fn(false, "Your name is too long!");
    else if (!games[0].addPlayer(socket, data.name))
      fn(false, "Game is too full!");
    else
      fn(true);
  });
  socket.on("checkConn", function(fn) { fn(); });
});
server.listen(8081);

function tick() {
  games[0].tickFrame();
  setTimeout(tick, 1000 / 60);
}
tick();
//setTimeout(tick, 1000 / 60);
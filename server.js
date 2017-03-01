var finalhandler = require('finalhandler');
var http = require('http');
var serveStatic = require('serve-static');

// Serve up public/ftp folder
var serve = serveStatic('public/', {'setHeaders': setHeaders});

function setHeaders(res, path) {
  res.setHeader("Access-Control-Allow-Origin", "http://paper-io-thekidofarcrania.c9users.io:8081");
  res.setHeader('Cache-Control', 'public, max-age=0');
}

// Create server
var server = http.createServer(function onRequest (req, res) {
  serve(req, res, finalhandler(req, res));
});

// Listen
server.listen(8080);

server = http.createServer();
var io = require('socket.io')(server);
//io.set('transports', ['websocket']);

var Game = require('./game-server.js');
var games = [new Game()];
io.on('connection', function(socket){
  socket.on("hello", function(data, fn) {
    //TODO: error checking.
    fn(true);
    games[0].addPlayer(socket, data.name);
  });
});
server.listen(8081);

function tick() {
  games[0].tickFrame();
  setTimeout(tick, 1000 / 60);
}
tick();
//setTimeout(tick, 1000 / 60);

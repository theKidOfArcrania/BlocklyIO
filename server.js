var finalhandler = require('finalhandler');
var http = require('http');
var serveStatic = require('serve-static');

// Serve up public/ftp folder
var serve = serveStatic('public/', {'cacheControl': false});

// Create server
var server = http.createServer(function onRequest (req, res) {
  serve(req, res, finalhandler(req, res))
});

// Listen
server.listen(8080);

server = http.createServer();
var io = require('socket.io')(server);
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

setInterval(function() {
  games[0].tickFrame();
}, 1000 / 60);
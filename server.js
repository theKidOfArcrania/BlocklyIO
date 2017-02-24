var finalhandler = require('finalhandler');
var http = require('http');
var serveStatic = require('serve-static');

// Serve up public/ftp folder
var serve = serveStatic('public/', {'cacheControl': false});

// Create server
var server = http.createServer(function onRequest (req, res) {
  serve(req, res, finalhandler(req, res))
})

// Listen
server.listen(8080);

var server = http.createServer();
var io = require('socket.io')(server);
var games = [];
io.on('connection', function(socket){
  socket.emit('message', 'hello.'); // emit an event to the socket
  io.emit('message', 'new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.new person.'); // emit an event to all connected sockets
  socket.on('reply', function(){ /* */ }); // listen to the event
});
server.listen(8081);
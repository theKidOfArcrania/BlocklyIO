var socket = io("http://localhost:8081");
socket.on('connect', document.write.bind(document, "<p>Connected!"));
socket.on('message', function(data) {document.write("<p>Message: " + data)});
socket.on('disconnect', document.write.bind(this, "<p>Disconnected!"));
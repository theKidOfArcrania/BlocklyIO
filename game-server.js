var Player = require("./player-server.js");
function Game(id)
{
  var players = [];
  var newPlayers = [];
  var frame = 0;
  
  
  this.id = id;
  
  this.addPlayer = function(client) {
    var p = {num: players.length, client: client};
    players.push(p);
    newPlayers.push(p);
    
    client.emit("game", {players, })
  }
}

module.exports = Game;
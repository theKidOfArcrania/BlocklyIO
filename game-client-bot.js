if (process.argv.length < 3) {
  console.log("Usage: node game-client-bot.js <socket-url> [<name>]")
  process.exit(1);
}

var client = require("./player-client.js");
var consts = require("./game-consts.js");
var user;

var GRID_SIZE = consts.GRID_SIZE;
var CELL_WIDTH = consts.CELL_WIDTH;

function connect() {
  client.connectGame(process.argv[2], process.argv[3] || '[BOT]', function(success, msg) {
  });
}

client.allowAnimation = false;
client.renderer = {
  disconnect: function() {
    console.log("I died...");
    connect();
  },
  
  setUser: function(u) {
    user = u;
  },
  
  update: function(frame) {
    if (frame % 6 == 1)
    {
      //TODO: decide move.
      client.changeHeading(Math.floor(Math.random() * 4));
    }
  }
};

connect();

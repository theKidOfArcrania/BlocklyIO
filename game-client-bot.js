if (process.argv.length < 3) {
  console.log("Usage: node game-client-bot.js <socket-url> [<name>]")
  process.exit(1);
}

var client = require("./player-client.js");
var consts = require("./game-consts.js");
var user;

var GRID_SIZE = consts.GRID_SIZE;
var CELL_WIDTH = consts.CELL_WIDTH;

client.allowAnimation = false;

client.renderer = {
  disconnect: function() {
    console.log("I died...");
    process.exit(0);
  },
  
  setUser: function(u) {
    user = u;
  },
  
  update: function(frame) {
    if (frame % 6 == 1)
    {
      //TODO: decide move.
    }
  }
};

client.connectGame(process.argv[2], process.argv[3] || '[BOT]', function(success, msg) {
});
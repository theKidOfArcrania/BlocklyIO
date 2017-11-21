if (process.argv.length < 3) {
  console.log("Usage: node game-client-bot.js <socket-url> [<name>]")
  process.exit(1);
}

var oldlog = console.log;
console.log = function(msg) {
  return oldlog('[' + new Date() + '] ' + msg);
}


var core = require("../game-core");
var client = require("../client");

var GRID_SIZE = core.GRID_SIZE;
var CELL_WIDTH = core.CELL_WIDTH;
var MOVES = [[-1, 0], [0, 1], [1, 0], [0, -1]]

var startFrame = -1;
var endFrame = -1;
var grid, others, user, playerPortion = {}, claim = [];

function mod(x) {
  x %= 4;
  if (x < 0) {
    x += 4;
  }
  return x;
}

function connect() {
  client.connectGame(process.argv[2], process.argv[3] || '[PAPER-IO-BOT]', function(success, msg) {
    if (!success) {
      setTimeout(connect, 1000);
    }
  });
}

function Loc(row, col) {
  if (this.constructor != Loc) {
    return new Loc(row, col);
  }

  this.row = row;
  this.col = col;
}

function update(frame) {
  if (startFrame == -1) {
    startFrame = frame;
  }
  endFrame = frame;

  if (frame % 6 == (startFrame + 1) % 6) {
    grid = client.grid;
    others = client.getOthers();

    //Note: the code below isn't really my own code. This code is in fact the
    //approximate algorithm used by the paper.io game. It has been modified from
    //the original code (i.e. deobfuscating) and made more efficient in some
    //areas (and some tweaks), otherwise, the original logic is about the same.
    var row = user.row, col = user.col, dir = user.currentHeading;
    var thres = (.05 + .1 * Math.random()) * GRID_SIZE * GRID_SIZE;

    if (row < 0 || col < 0 || row >= GRID_SIZE || col >= GRID_SIZE) {
      return;
    }

    if (grid.get(row, col) === user) {
      //When we are inside our territory
      claim = [];
      weights = [25, 25, 25, 25];
      weights[dir] = 100;
      weights[mod(dir + 2)] = -9999;

      for (var nd = 0; nd < 4; nd++) {
        for (var S = 1; S < 20; S++) {
          var nr = MOVES[nd][0] * S + row;
          var nc = MOVES[nd][1] * S + col;

          if (nr < 0 || nc < 0 || nr >= GRID_SIZE || nc >= GRID_SIZE) {
            if (S > 1) {
              weights[nd]--;
            } else {
              weights[nd] = -9999;
            }
          } else {
            if (grid.get(nr, nc) !== user) {
              weights[nd]--;
            }

            var tailed = undefined;
            for (var o of others) {
              if (o.tail.hitsTail(new Loc(nr, nc))) {
                tailed = o;
                break;
              }
            }

            if (tailed) {
              if (o.name.indexOf("PAPER") != -1) { //Don't really try to kill our own kind
                weights[nd] += 3 * (30 - S);
              } else {
                weights[nd] += 30 * (30 - S);
              }
            }
          }
        }
      }

      //View a selection of choices based on the weights we computed
      var choices = [];
      for (var d = 0; d < 4; d++) {
        for (var S = 1; S < weights[d]; S++) {
          choices.push(d);
        }
      }

      if (choices.length === 0) {
        choices.push(dir);
      }
      
      dir = choices[Math.floor(Math.random() * choices.length)];
    } else if (playerPortion[user.num] < thres) {
      //Claim some land if we are relatively tiny and have little to risk.
      if (claim.length === 0) {
        var breadth = 4 * Math.random() + 2;
        var length = 4 * Math.random() + 2;
        var ccw = 2 * Math.floor(2 * Math.random()) - 1;

        turns = [dir, mod(dir + ccw), mod(dir + ccw * 2), mod(dir + ccw * 3)];
        lengths = [breadth, length, breadth + 2 * Math.random() + 1, length];

        for (var i = 0; i < turns.length; i++) { 
          for (var j = 0; j < lengths[i]; j++) { 
            claim.push(turns[i]);
          } 
        } 
      }

      if (claim.length !== 0) {
        dir = claim.shift();
      }
    } else { 
      claim = [];
      //We are playing a little bit more cautious when we are outside and have a
      //lot of land
      weights = [5, 5, 5, 5];
      weights[dir] = 50;
      weights[mod(dir + 2)] = -9999;

      for (var nd = 0; nd < 4; nd++) {
        for (var S = 1; S < 20; S++) {
          var nr = MOVES[nd][0] * S + row;
          var nc = MOVES[nd][1] * S + col;

          if (nr < 0 || nc < 0 || nr >= GRID_SIZE || nc >= GRID_SIZE) {
            if (S > 1) {
              weights[nd]--;
            } else {
              weights[nd] = -9999;
            }
          } else {
            if (user.tail.hitsTail(new Loc(nr, nc))) {
              if (S > 1) {
                weights[nd] -= 50 - S;
              } else {
                weights[nd] = -9999;
              }
            }

            if (grid.get(nr, nc) === user) {
              weights[nd] += 10 + S;
            }

            var tailed = undefined;
            for (var o of others) {
              if (o.tail.hitsTail(new Loc(nr, nc))) {
                tailed = o;
                break;
              }
            }

            if (tailed) {
              if (o.name.indexOf("PAPER") != -1) { //Don't really try to kill our own kind
                weights[nd] += 3 * (30 - S);
              } else {
                weights[nd] += 30 * (30 - S);
              }
            }
          }
        }
      }

      //View a selection of choices based on the weights we computed
      var choices = [];
      for (var d = 0; d < 4; d++) {
        for (var S = 1; S < weights[d]; S++) {
          choices.push(d);
        }
      }

      if (choices.length === 0) {
        choices.push(dir);
      }
      
      dir = choices[Math.floor(Math.random() * choices.length)];
    }
    client.changeHeading(dir);
  }
}

function calcFavorability(params) {
  return params.portion + params.kills * 50 + params.survival / 100;
}

client.allowAnimation = false;
client.renderer = {
  addPlayer: function(player) {
    playerPortion[player.num] = 0;
  },
  disconnect: function() {
    var dt = (endFrame - startFrame);
    startFrame = -1;
     
    console.log("I died... (survived for " + dt + " frames.)");
    console.log("I killed " + client.kills + " player(s).");
    connect();
  },
  removePlayer: function(player) {
    delete playerPortion[player.num];
  },
  setUser: function(u) {
    user = u;
  },
  update: update, 
  updateGrid: function(row, col, before, after) {
    before && playerPortion[before.num]--;
    after && playerPortion[after.num]++;
  }
};

connect();

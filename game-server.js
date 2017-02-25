var GRID_SIZE = 80;
var CELL_WIDTH = 40;
var Player = require("./player.js");

function Game(id)
{
  
  var players = [];
  var newPlayers = [];
  var frame = 0;
  
  var filled = 0;
  var grid = new Grid(GRID_SIZE, function(row, col, before, after) {
    if (!!after ^ !!before)
    {
      if (after)
        filled++;
      else
        filled--;
    }
  });
  
  
  this.id = id;
  
  this.addPlayer = function(client, name) {
    var start = findEmpty(grid);
    if (!start)
      return false;
    
    var params = {
      posX: start.col * CELL_WIDTH,
      posY: start.row * CELL_WIDTH,
      currentHeading: getRandomInt(0, 4),
      name: name,
      num: players.length
    }
    
    var p = new Player(false, grid, params);
    p.client = client;
    player.push(p);
    newPlayer.push(p);
    
    
    client.emit("game", {players, })
    return true;
  }
}

function findEmpty(grid)
{
  var available = [];
  
  for (var r = 1; r < grid.size - 1; r++)
    for (var c = 1; c < grid.size - 1; c++)
    {
      var cluttered = false;
      checkclutter: for (var dr = -1; dr <= 1; dr++)
      {
        for (var dc = -1; dc <= 1; dc++)
        {
          if (grid.get(r + dr, c + dc))
          {
            cluttered = true;
            break checkclutter;
          }
        }
      }
      if (!cluttered)
        available.push({row: r, col: c});
    }
  
  if (available.length === 0)
    return null;
  else
    return available[Math.floor(available.length * Math.random())];
}

module.exports = Game;
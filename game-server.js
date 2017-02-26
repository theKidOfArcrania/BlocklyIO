
var Grid = require("./grid.js");
var Player = require("./player.js");
var core = require("./game-core.js");
var consts = require("./game-consts.js");

var GRID_SIZE = consts.GRID_SIZE;
var CELL_WIDTH = consts.CELL_WIDTH;
var MAX_PLAYERS = consts.MAX_PLAYERS;

function Game(id)
{
  var nextInd = 0;
  var players = [];
  var newPlayers = [];
  var newPlayerFrames = [];
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
    if (players.length >= MAX_PLAYERS)
      return false;
    
    var start = findEmpty(grid);
    if (!start)
      return false;
    
    var params = {
      posX: start.col * CELL_WIDTH,
      posY: start.row * CELL_WIDTH,
      currentHeading: Math.floor(Math.random() * 4),
      name: name,
      num: nextInd
    };
    
    var p = new Player(false, grid, params);
    p.client = client;
    players.push(p);
    newPlayers.push(p);
    newPlayerFrames.push(p);
    nextInd++;
    core.initPlayer(grid, p);
    
    var splayers = players.map(function(val) {return val.serialData();});
    client.emit("game", {
      "num": p.num,
      "gameid": id,
      "frame": frame,
      "players": splayers,
      "grid": gridSerialData(grid, players)
    });
    console.log(p.name + " joined.");
    
    //TODO: limit number of requests per frame.
    client.on("requestFrame", function () {
      var splayers = players.map(function(val) {return val.serialData();});
      client.emit("game", {
        "num": p.num,
        "gameid": id,
        "frame": frame,
        "players": splayers,
        "grid": gridSerialData(grid, players)
      });
    });
    
    client.on("frame", function(data, errorHan){
      if (typeof data === "function")
      {
        errorHan(false, "No data supplied.");
        return;
      }
      
      if (typeof errorHan !== "function")
        errorHan = function() {};
      
      if (!data)
        errorHan(false, "No data supplied.");
      else if (!checkInt(data.frame, 0, Infinity))
        errorHan(false, "Requires a valid non-negative frame integer.");
      //else if (data.frame < frame)
      //  errorHan(false, "Late frame received.");
      else if (data.frame > frame)
        errorHan(false, "Invalid frame received.");
      else
      {
        if (data.heading)
        {
          if (checkInt(data.heading, 0, 4))
          {
            p.heading = data.heading;
            errorHan(true);
          }
          else
            errorHan(false, "New heading must be an integer of range [0, 4).");
        }
      }
    });
    return true;
  };
  
  
  this.tickFrame = function() {
    //TODO: notify those that drop out.
    var snews = newPlayers.map(function(val) {return val.serialData();});
    var moves = players.map(function(val) {return {heading: val.heading};});
    
    var data = {frame: frame + 1, moves: moves};
    if (snews.length > 0)
    {
      data.newPlayers = snews;
      newPlayers = [];
    }
    
    players.forEach(function(val) {val.client.emit("notifyFrame", data)});
    
    frame++;
    update();
  };
  
  function update()
  {
    var dead = [];
    core.updateFrame(grid, players, newPlayerFrames, dead);
    dead.forEach(function(val) { 
      console.log(val.name + " died.");
      val.client.disconnect(true); 
    });
  }
}

function checkInt(value, min, max)
{
  if (typeof value !== "number")
    return false;
  if (value < min || value >= max)
    return false;
  if (Math.floor(value) !== value)
    return false;
  
  return true;
}

function gridSerialData(grid, players)
{
  var buff = Buffer.alloc(grid.size * grid.size);
  
  var numToIndex = new Array(players[players.length - 1].num + 1);
  for (var i = 0; i < players.length; i++)
    numToIndex[players[i].num] = i + 1;
  
  for (var r = 0; r < grid.size; r++)
    for (var c = 0; c < grid.size; c++)
    {
      var ele = grid.get(r, c);
      buff[r * grid.size + c] = ele ? numToIndex[ele.num] : 0;
    }
  return buff;
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
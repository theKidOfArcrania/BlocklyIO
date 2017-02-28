
var Color = require("./color");
var Grid = require("./grid");
var Player = require("./player");
var Gate = require("./gate");
var core = require("./game-core");
var consts = require("./game-consts");

var GRID_SIZE = consts.GRID_SIZE;
var CELL_WIDTH = consts.CELL_WIDTH;
var MAX_PLAYERS = consts.MAX_PLAYERS;

var HUES = [0, 10, 20, 25, 30, 35, 40, 45, 50, 60, 70, 100, 110, 120, 125, 130, 135, 140, 145, 150, 160, 170, 180, 190, 200, 210, 220].map(function(val) {return val / 240});
var SATS = [192, 150, 100].map(function(val) {return val / 240});



function Game(id)
{
  //Shuffle the hues.
  for (var i = 0; i < HUES.length * 50; i++)
  {
    var a = Math.floor(Math.random() * HUES.length); 
    var b = Math.floor(Math.random() * HUES.length); 
    var tmp = HUES[a];
    HUES[a] = HUES[b];
    HUES[b] = tmp;
  }
  
  var colors = new Array(SATS.length * HUES.length);
  i = 0;
  for (var s = 0; s < SATS.length; s++)
    for (var h = 0; h < HUES.length; h++)
      colors[i++] = new Color(HUES[h], SATS[s], .5, 1);
  
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
  
  //var frameGate = new Gate(1);
  //var timeout = undefined;
  
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
    p.tmpHeading = params.currentHeading;
    p.client = client;
    players.push(p);
    newPlayers.push(p);
    newPlayerFrames.push(0);
    nextInd++;
    core.initPlayer(grid, p);
    
    var splayers = players.map(function(val) {return val.serialData();});
    client.emit("game", {
      "num": p.num,
      "gameid": id,
      "frame": frame,
      "players": splayers,
      "grid": gridSerialData(grid, players),
      "colors": colors
    });
    //playerReady(p, frame);
    console.log(p.name + " joined.");
    
    //TODO: kick off any clients that take too long.
    //TODO: limit number of requests per frame.
    client.on("requestFrame", function () {
      //if (p.frame === frame)
      //  return;
      var splayers = players.map(function(val) {return val.serialData();});
      client.emit("game", {
        "num": p.num,
        "gameid": id,
        "frame": frame,
        "players": splayers,
        "grid": gridSerialData(grid, players),
        "colors": colors
      });
      //playerReady(p, frame);
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
        if (data.heading !== undefined)
        {
          if (checkInt(data.heading, 0, 4))
          {
            p.tmpHeading = data.heading;
            errorHan(true);
          }
          else
            errorHan(false, "New heading must be an integer of range [0, 4).");
        }
      }
    });
    
    client.on('disconnect', function() {
      p.disconnected = true;
      console.log(p.name + " left.");
    });
    return true;
  };
  
  /*
  var ready = 0;
  var readyTick = false;
  
  function playerReady(player, waitFrame)
  {
    if (player.frame < waitFrame)
    {
      ready++;
      player.frame = waitFrame;
    }
    tick();
  }
  */
  function tick() {
    //if (readyTick && ready === players.length)
    //{
    //  ready = 0;
    //  readyTick = false;
    //}else
    //  return;
    
    //TODO: notify those players that this server automatically drops out.
    var snews = newPlayers.map(function(val) {return val.serialData();});
    var moves = players.map(function(val) {
      //Account for race condition (when heading is set after emitting frames, and before updating).
      val.heading = val.tmpHeading;
      return {num: val.num, left: !!val.disconnected, heading: val.heading};
    });
    
    var data = {frame: frame + 1, moves: moves};
    if (snews.length > 0)
    {
      data.newPlayers = snews;
      newPlayers = [];
    }
    
    //TODO: send a "good-bye" frame to the dead players. Just in case.
    players.forEach(function(val) {
      if (val.num === 1) //GHOST PLAYER
      {
        var splayers = players.map(function(val) {return val.serialData();});
        val.client.emit("game", {
          "num": val.num,
          "gameid": id,
          "frame": frame,
          "players": splayers,
          "grid": gridSerialData(grid, players),
          "colors": colors
        });
      }
      else
      {
        val.client.emit("notifyFrame", data, function() {
          //playerReady(val, waitFrame);
        });
      }
    });
    
    frame++;
    setTimeout(update, 1);
  }
  
  this.tickFrame = function() {
    //readyTick = true;
    tick();
  };
  
  function update()
  {
    var dead = [];
    core.updateFrame(grid, players, newPlayerFrames, dead, undefined, frame);
    dead.forEach(function(val) { 
      console.log(val.name + " died.");
      //val.client.disconnect(true); 
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
  
  var numToIndex = new Array(players.length > 0 ? players[players.length - 1].num + 1 : 0);
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
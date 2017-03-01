
var Color = require("./color");
var Grid = require("./grid");
var Player = require("./player");
//var Gate = require("./gate");
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
  var frameLocs = [];
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
    nextInd++;
    core.initPlayer(grid, p);
    
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
    
    client.on("verify", function(data, resp) {
      if (typeof resp !== "function")
        return;
      
      if (!data.frame)
        resp(false, "No frame supplied");
      else if (!checkInt(data.frame, 0, frame + 1))
        resp(false, "Must be a valid frame number");
      else
      {
        verifyPlayerLocations(data.frame, data.locs, resp);
      }
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
  
  function pushPlayerLocations()
  {
    var locs = [];
    for (var p of players)
      locs[p.num] = [p.posX, p.posY, p.waitLag];
    locs.frame = frame;
    
    if (frameLocs.length >= 100)
      frameLocs.shift();
    frameLocs.push(locs);
  }
  
  function verifyPlayerLocations(fr, verify, resp)
  {
    var minFrame = frame - frameLocs.length + 1;
    if (fr < minFrame || fr > frame)
    {
      resp(false, "Frames out of reference");
      return;
    }
    
    function string(loc)
    {
      return '(' + loc[0] + ', ' + loc[1] + ') [' + loc[2] + ']';
    }
    
    var locs = frameLocs[fr - minFrame];
    if (locs.frame !== fr)
    {
      resp(false, locs.frame + " != " + fr);
      return;
    }
    for (var num in verify)
    {
      if (locs[num][0] !== verify[num][0] || locs[num][1] !== verify[num][1] || locs[num][2] !== verify[num][2])
      {
        resp(false, 'P' + num +  ' ' + string(locs[num]) + ' !== ' + string(verify[num]));
        return;
      }
    }
    
    resp(true);
  }
  
  function tick() {
    
    //TODO: notify those players that this server automatically drops out.
    var splayers = players.map(function(val) {return val.serialData();});
    var snews = newPlayers.map(function(val) {
      //Emit game stats.
      val.client.emit("game", {
        "num": val.num,
        "gameid": id,
        "frame": frame,
        "players": splayers,
        "grid": gridSerialData(grid, players),
        "colors": colors
      });
      return val.serialData();
    });
    var moves = players.map(function(val) {
      //Account for race condition (when heading is set after emitting frames, and before updating).
      val.heading = val.tmpHeading;
      return {num: val.num, left: !!val.disconnected, heading: val.heading};
    });
    
    update();
    
    var data = {frame: frame + 1, moves: moves};
    if (snews.length > 0)
    {
      data.newPlayers = snews;
      newPlayers = [];
    }
    
    for (var pl of players)
      pl.client.emit("notifyFrame", data);
    
    frame++;
    pushPlayerLocations();
  }
  
  this.tickFrame = tick;
  
  function update()
  {
    var dead = [];
    core.updateFrame(grid, players, dead);
    for (var pl of dead)
    {
      //TODO: send a "good-bye" frame to the dead players. Just in case.
      console.log(pl.name + " died.");
      pl.client.disconnect(true); 
    }
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
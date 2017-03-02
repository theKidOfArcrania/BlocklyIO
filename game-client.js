/* global $ */
var Player = require("./player.js");
var renderer = require("./game-renderer.js");
var consts = require("./game-consts.js");
var core = require("./game-core.js");
var io = require('socket.io-client');

var GRID_SIZE = consts.GRID_SIZE;
var CELL_WIDTH = consts.CELL_WIDTH;

renderer.allowAnimation = true;
  
/**
 * Provides requestAnimationFrame in a cross browser way.
 * @author paulirish / http://paulirish.com/
 */
// window.requestAnimationFrame = function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
//       window.setTimeout( callback, 1000 / 60 );
//     };
if ( !window.requestAnimationFrame ) {
  window.requestAnimationFrame = ( function() {
    return window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
      window.setTimeout( callback, 1000 / 60 );
    };
  })();
}

var user, socket, frame;

//Event listeners
$(document).keydown(function(e) {
  if (!user || user.dead)
    return;
  var newHeading = -1;
  switch (e.which)
  {
    case 37: newHeading = 3; break; //LEFT
    case 38: newHeading = 0; break; //UP
    case 39: newHeading = 1; break; //RIGHT
    case 40: newHeading = 2; break; //DOWN
    default: return; //exit handler for other keys.
  }
  
  if (newHeading === user.currentHeading || ((newHeading % 2 === 0) ^ 
    (user.currentHeading % 2 === 0)))
  {
    //user.heading = newHeading;
    if (socket)
      socket.emit("frame", {
        frame: frame,
        heading: newHeading
      }, function(success, msg) {
        if (!success)
          console.error(msg);
      });
  }
  e.preventDefault();
});

var norun = false;
window.run = run;
function run() {
  if (norun)
    return; //Prevent multiple clicks.
  norun = true;
  $("#begin").css("display: none");
  $("#begin").animate({
      opacity: 0
  }, 1000);
  
  user = null;
  deadFrames = 0;
  
  //Socket connection.
  //, {transports: ['websocket'], upgrade: false}
  connectServer();
  socket.emit('hello', {
    name: $("#name").val(),
    type: 0, //Free-for-all
    gameid: -1 //Requested game-id, or -1 for anyone.
  }, function(success) {
    if (success) console.info("Connected to game!");
    else console.error("Unable to connect to game.");
  });
}

var grid = renderer.grid; 
var timeout = undefined;
var dirty = false;
var deadFrames = 0;
var requesting = -1; //frame that we are requesting at.
var frameCache = []; //Frames after our request.

//TODO: check if we can connect to server.
function connectServer() {
  io.j = [];
  io.sockets = [];
  socket = io('http://paper-io-thekidofarcrania.c9users.io:8081', {'forceNew': true});
  socket.on('connect', function(){
    console.info("Connected to server.");
  });
  socket.on('game', function(data) {
    if (timeout != undefined)
      clearTimeout(timeout);
    
    //Initialize game.
    //TODO: display data.gameid --- game id #
    frame = data.frame;
    renderer.reset();
    
    //Load players.
    data.players.forEach(function(p) {
      var pl = new Player(grid, p);
      renderer.addPlayer(pl);
    });
    user = renderer.getPlayerFromNum(data.num);
    if (!user) throw new Error();
    renderer.setUser(user);
    
    //Load grid.
    var gridData = new Uint8Array(data.grid);
    for (var r = 0; r < grid.size; r++)
      for (var c = 0; c < grid.size; c++)
      {
        var ind = gridData[r * grid.size + c] - 1;
        grid.set(r, c, ind === -1 ? null : renderer.getPlayer(ind));
      }
    
    renderer.paint();
    frame = data.frame;
    
    if (requesting !== -1)
    {
      //Update those cache frames after we updated game.
      var minFrame = requesting;
      requesting = -1;
      while (frameCache.length > frame - minFrame)
        processFrame(frameCache[frame - minFrame]);
      frameCache = [];
    }
  });
  
  socket.on('notifyFrame', processFrame);
  
  socket.on('dead', function() {
    socket.disconnect(); //In case we didn't get the disconnect call.
  });
  
  socket.on('disconnect', function(){
    if (!user)
      return;
    console.info("Server has disconnected. Creating new game.");
    socket.disconnect();
    user.die();
    dirty = true;
    paintLoop();
    
    $("#begin").css("display: block");
    $("#begin").animate({
      opacity: .9999
    }, 1000, function() {
      norun = false;
    });
  });
}

function processFrame(data)
{
  if (timeout != undefined)
      clearTimeout(timeout);
    
  if (requesting !== -1 && requesting < data.frame)
  {
    frameCache.push(data);
    return;
  }
  
  if (data.frame - 1 !== frame)
  {
    console.error("Frames don't match up!");
    socket.emit('requestFrame'); //Restore data.
    requesting = data.frame;
    frameCache.push(data);
    return;
  }
  
  frame++;
  if (data.newPlayers)
  {
    data.newPlayers.forEach(function(p) {
      if (p.num === user.num)
        return;
      var pl = new Player(grid, p);
      renderer.addPlayer(pl);
      core.initPlayer(grid, pl);
    });
  }
  
  var found = new Array(renderer.playerSize());
  data.moves.forEach(function(val, i) {
    var player = renderer.getPlayerFromNum(val.num);
    if (!player) return;
    if (val.left) player.die();
    found[i] = true;
    player.heading = val.heading;
  });
  for (var i = 0; i < renderer.playerSize(); i++)
  {
    //Implicitly leaving game.
    if (!found[i])
    {
      var player = renderer.getPlayer();
      player && player.die();
    }
  }
  
  renderer.update();
  
  var locs = {};
  for (var i = 0; i < renderer.playerSize(); i++)
  {
    var p = renderer.getPlayer(i);
    locs[p.num] = [p.posX, p.posY, p.waitLag];
  }

  socket.emit("verify", {
    frame: frame,
    locs: locs
  }, function(frame, success, adviceFix, msg) {
    if (!success && requesting === -1) 
    {
      console.error(frame + ": " + msg);
      if (adviceFix)
        socket.emit('requestFrame');
    }
  }.bind(this, frame));
  
  dirty = true;
  requestAnimationFrame(function() {
    paintLoop();
  });
  timeout = setTimeout(function() {
    console.warn("Server has timed-out. Disconnecting.");
    socket.disconnect();
  }, 3000);
}

function paintLoop()
{
  if (!dirty)
    return;
  renderer.paint();
  dirty = false;
  
  if (user.dead)
  {
    if (timeout)
      clearTimeout(timeout);
    if (deadFrames === 60) //One second of frame
    {
      var before = renderer.allowAnimation;
      renderer.allowAnimation = false;
      renderer.update();
      renderer.paint();
      renderer.allowAnimation = before;
      user = null;
      deadFrames = 0;
      return;
    }
    
    socket.disconnect();
    deadFrames++;
    dirty = true;
    renderer.update();
    requestAnimationFrame(paintLoop);
  }
}

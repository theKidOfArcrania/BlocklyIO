/* global $ */
var Player = require("./player.js");
var renderer = require("./game-renderer.js");
var consts = require("./game-consts.js");
var core = require("./game-core.js");

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
  if (user.dead)
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
        {
          //TODO: restore frames.
          console.error(msg);
        }
      });
  }
  e.preventDefault();
});


$(function() {
  var grid = renderer.grid; 
  var timeout = undefined;
  
  //Socket connection.
  socket = require('socket.io-client')('http://paper-io-thekidofarcrania.c9users.io:8081');
  socket.on('connect', function(){
    console.info("Connected to server.");
    socket.emit('hello', {
      name: 'Test player',
      type: 0, //Free-for-all
      gameid: -1 //Requested game-id, or -1 for anyone.
    }, function(success) {
      if (success) console.info("Connected to game!");
      else console.error("Unable to connect to game.");
    });
  });
  socket.on('game', function(data) {
    if (timeout != undefined)
      clearTimeout(timeout);
    //Initialize game.
    //TODO: display data.gameid --- game id #
    frame = data.frame;
    renderer.reset();
    
    
    //Load colors.
    var colors = data.colors || [];
    
    //Load players.
    data.players.forEach(function(p) {
      p.base = colors[p.num];
      var pl = new Player(true, grid, p);
      renderer.addPlayer(pl);
    });
    user = renderer.getPlayerFromNum(data.num);
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
  });
  
  socket.on('notifyFrame', function(data, fn) {
    if (timeout != undefined)
      clearTimeout(timeout);
    
    if (data.frame - 1 !== frame)
    {
      console.error("Frames don't match up!");
      socket.emit('requestFrame'); //Restore data.
      return;
    }
    
    frame++;
    requestAnimationFrame(function() {
      if (data.newPlayers)
      {
        data.newPlayers.forEach(function(p) {
          if (p.num === user.num)
            return;
          var pl = new Player(true, grid, p);
          renderer.addPlayer(pl);
          core.initPlayer(grid, pl);
        });
      }
      
      data.moves.forEach(function(val, i) {
        var player = renderer.getPlayer(i);
        if (!player) return;
        if (val.left) player.die();
        player.heading = val.heading;
      });
      
      paintLoop();
    });
    timeout = setTimeout(function() {
      console.warn("Server has timed-out. Disconnecting.");
      socket.disconnect();
    }, 5000);
    fn();
  });
  
  socket.on('disconnect', function(){
    console.info("Server has disconnected. Creating new game.");
    socket.disconnect();
    user.die();
    paintLoop();
  });
  
  var deadFrames = 0;
  function paintLoop()
  {
    renderer.paint();
    renderer.update();
    if (user.dead)
    {
      if (timeout)
        clearTimeout(timeout);
      if (deadFrames === 120) //Two second of frames
      {
        var before = renderer.allowAnimation;
        renderer.allowAnimation = false;
        renderer.update();
        renderer.paint();
        renderer.allowAnimation = before;
        deadFrames = 0;
        return;
      }
      
      socket.disconnect();
      deadFrames++;
      requestAnimationFrame(paintLoop);
    }
  }
});
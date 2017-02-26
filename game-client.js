/* global $ */
var Player = require("./player.js");
var renderer = require("./game-renderer.js");
var consts = require("./game-consts.js");

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
    user.heading = newHeading;
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
  socket.on('game', function(data){
    //Initialize game.
    //TODO: display data.gameid --- game id #
    renderer.reset();
    
    //Load players.
    data.players.forEach(function(p) {
      renderer.addPlayer(new Player(true, grid, p));
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
    
    frame = data.frame;
  });
  
  socket.on('notifyFrame', function(data) {
    if (data.frame - 1 !== frame)
    {
      console.error("Frames don't match up!");
      socket.emit('requestFrame'); //Restore data.
      return;
    }
    
    frame++;
    if (data.newPlayers)
    {
      data.newPlayers.forEach(function(p) {
        renderer.addPlayer(new Player(true, grid, p));
      });
    }
    
    data.moves.forEach(function(val, i) {
      if (renderer.getPlayer(val) !== user)
        renderer.getPlayer(i).heading = val.heading;
    });
    
    paintLoop();
  });
  
  socket.on('disconnect', function(){
    console.info("Server has disconnected. Creating new game.");
  });
  
  var deadFrames = 0;
  function paintLoop()
  {
    renderer.paint();
    if (user.dead && deadFrames === 60) //One second of frames
    {
      //TODO: Show welcome screen.
      deadFrames = 0;
      return;
    }
    
    renderer.update();
    if (user.dead)
    {
      socket.disconnect();
      deadFrames++;
      requestAnimationFrame(paintLoop);
    }
  }
});
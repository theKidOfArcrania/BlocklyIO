/* global $ */
var Player = require("./player.js");
var renderer = require("./game-renderer.js");
var consts = require("./game-consts.js");

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


$(function() {
  var GRID_SIZE = consts.GRID_SIZE;
  var CELL_WIDTH = consts.CELL_WIDTH;
  
  
  var canvas = $("#main-ui")[0];
  var ctx2 = canvas.getContext('2d');
  
  var grid = renderer.grid; 
  renderer.allowAnimation = true;
  
  //Load players.
  for (var p = 0; p < 9; p++)
  {
    //TODO: socket loading.
    var pRow = getRandomInt(0, GRID_SIZE);
    var pCol = getRandomInt(0, GRID_SIZE);
    var sdata = {
      posX: pCol * CELL_WIDTH,
      posY: pRow * CELL_WIDTH,
      currentHeading: getRandomInt(0, 4),
      //name: ...,
      num: p
    };
    
    renderer.addPlayer(new Player(true, grid, sdata));
    
    for (var dr = -1; dr <= 1; dr++)
      for (var dc = -1; dc <= 1; dc++)
        if (!grid.isOutOfBounds(dr + pRow, dc + pCol))
          grid.set(dr + pRow, dc + pCol, renderer.getPlayer(p));
  }
  
  //Load grid.
  for (var r = 0; r < grid.size; r++)
  {
    for (var c = 0; c < grid.size; c++)
    {
      //TODO: load data.
      //if (Math.random() > .9)
      //  grid.set(r, c, players[getRandomInt(0, players.length)]);
    }
  }

  var frameCount = 0;
  
  //TODO: current player index
  var user = renderer.getPlayer(0);
  renderer.initUser(user);
  
  function update()
  {
    renderer.update();
  }
  
  //Thanks to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  }
  
  function paintLoop(ctx)
  {
    renderer.paint(ctx); //TODO: pre-rendering.
    
    //TODO: sync each loop with server. (server will give frame count.)
    frameCount++;
    update();
    requestAnimationFrame(paintLoop);
  }
  
  paintLoop(ctx2);
  
  
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
      //TODO: notify server.
      user.heading = newHeading;
    }
    e.preventDefault();
  });
});

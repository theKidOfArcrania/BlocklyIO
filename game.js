var Player;

if (!Player)
  throw new Error("Requires player.js");

//Thanks to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Provides requestAnimationFrame in a cross browser way.
 * @author paulirish / http://paulirish.com/
 */
window.requestAnimationFrame = function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
      window.setTimeout( callback, 1000 / 60 );
    };
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
  var GRID_SIZE = 200;
  var CELL_WIDTH = 30;
  var SPEED = 5;
  var SHADOW_OFFSET = 5;
  
  var canvas = $("#main-ui")[0];
  var ctx = canvas.getContext('2d');

  var width = canvas.width = window.innerWidth - 20;
  var height = canvas.height = window.innerHeight - 20;

  var players = [];
  var grid = []; 
  
  //Load players.
  for (var p = 0; p < 1; p++)
  {
    //TODO: socket loading.
    players[p] = new Player(null, grid, p);
  }
  
  //Load grid.
  for (var r = 0; r < GRID_SIZE; r++)
  {
    grid[r] = [];
    for (var c = 0; c < GRID_SIZE; c++)
    {
      //TODO: load data.
      if (Math.random() < .9)
        grid[r][c] = -1;
      else
        grid[r][c] = players[getRandomInt(0, players.length)];
    }
  }

  var frameCount = 0;
  var animateTo = [0, 0];
  var offset = [0, 0];
  
  //TODO: current player index
  var user = players[0];
  
  function update()
  {
    //Change grid offsets.
    for (var i = 0; i <= 1; i++)
    {
      if (animateTo[i] !== offset[i])
      {
        var delta = animateTo[i] - offset[i];
        var dir = Math.sign(delta);
        var mag = Math.min(SPEED, Math.abs(delta));
        offset[i] += dir * mag;
      }
    }
    
    
    //Move players.
    var dead = [];
    players = players.filter(function(val) {
      val.move();
      if (val.dead)
        dead.push(val);
      return !val.dead;
    });
    
    //Remove players with collisions.
    var removing = [];
    for (var i = 0; i < players.length; i++)
    {
      for (var j = i; j < players.length; j++)
      {
        
        //Remove those players when other players have hit their tail.
        if (!removing[j] && players[j].tail.hitsTail(players[i]))
          removing[j] = true;
        if (!removing[i] && players[i].tail.hitsTail(players[j]))
          removing[i] = true;
        
        //Remove players with collisons...
        if (i !== j && squaresIntersect(players[i].startX, players[j].startX) &&
          squaresIntersect(players[i].startY, players[j].startY))
        {
          //...if one player is own his own territory, the other is out.
          if (grid[players[i].row][players[i].col] === players[i])
            removing[j] = true;
          else if (grid[players[j].row][players[j].col] === players[j])
            removing[i] = true;
          else
          {
            //...otherwise, the one that sustains most of the collision will be removed.
            var areaI = area(players[i]);
            var areaJ = area(players[j]);
            
            if (areaI === areaJ)
              removing[i] = removing[j] = true;
            else if (areaI > areaJ)
              removing[i] = true;
            else
              removing[j] = true;
          }
        }
      }
    }
    
    players = players.filter(function(val, i) {
      if (removing[i])
      {
        dead.push(val);
        val.die();
      }
      return !removing[i];
    });
    
    dead.forEach(function(val) {
      console.log(val.name + " is dead");
    });
    
    //TODO: animate dead, and if this player is dead.
    var xOff = Math.floor(user.posX - (width - CELL_WIDTH) / 2);
    var yOff = Math.floor(user.posY - (height - CELL_WIDTH) / 2);
    
    animateTo[0] = Math.min(Math.max(xOff, 0), GRID_SIZE * CELL_WIDTH);
    animateTo[1] = Math.min(Math.max(yOff, 0), GRID_SIZE * CELL_WIDTH);
  }
  
  function area(player)
  {
    var xDest = player.col * CELL_WIDTH;
    var yDest = player.row * CELL_WIDTH;
    
    if (player.startX === xDest)
      return Math.abs(player.startY - yDest);
    else
      return Math.abs(player.startX - xDest);
  }
  
  function squaresIntersect(a, b)
  {
    if (a < b)
      return b < a + CELL_WIDTH;
    else
      return a < b + CELL_WIDTH;
  }
  
  function paintGrid()
  {
    //Paint bottom grid lines.
    //ctx.fillStyle = 'lightgray';
    //ctx.beginPath();
    //for (var x = modRotate(-offset[0], CELL_WIDTH); x < width; x += CELL_WIDTH)
    //{
    //  ctx.moveTo(x, 0);
    //  ctx.lineTo(x, height);
    //}
    //for (var y = modRotate(-offset[1], CELL_WIDTH); y < height; y+= CELL_WIDTH)
    //{
    //  ctx.moveTo(0, y);
    //  ctx.lineTo(width, y);
    //}
    //ctx.stroke();
    
    //Paint occupied areas.
    for (var r = Math.floor(offset[1] / CELL_WIDTH); r * CELL_WIDTH - offset[1] < height; r++)
    {
      for (var c = Math.floor(offset[0] / CELL_WIDTH); c * CELL_WIDTH - offset[0] < width; c++)
      {
        if (grid[r][c] !== -1)
        {
          var x = c * CELL_WIDTH, 
                y = r * CELL_WIDTH,
                p = grid[r][c];
          ctx.fillStyle = p.shadowColor;
          ctx.fillRect(x, y + SHADOW_OFFSET, CELL_WIDTH, CELL_WIDTH);
          ctx.fillStyle = p.baseColor;
          ctx.fillRect(x, y, CELL_WIDTH, CELL_WIDTH);
        }
      }
    }
  }
  
  
  
  function paintLoop()
  {
    ctx.fillStyle = 'whitesmoke';
    ctx.fillRect(0, 0, width, height);
    
    ctx.translate(-offset[0], -offset[1]);
    paintGrid();
    players.forEach(function (p) {
      p.render(ctx);
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0); //Reset transform.
    
    if (user.dead)
    {
      console.log("You died!");
      return;
    }
    
    //TODO: sync each loop with server. (server will give frame count.)
    frameCount++;
    update();
    requestAnimationFrame(paintLoop);
  }
  paintLoop();
  
  
  //Event listeners
  $(document).keydown(function(e) {
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

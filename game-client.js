var Player = require("./player.js");
var Grid = require("./grid.js");
 
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
  var BORDER_WIDTH = 20;
  var GRID_SIZE = 80;
  var CELL_WIDTH = 40;
  var SPEED = 5;
  var SHADOW_OFFSET = 5;
  var ANIMATE_FRAMES = 24;
  var BOUNCE_FRAMES = [8, 4];
  var DROP_HEIGHT = 24;
  var DROP_SPEED = 2;
  var MIN_BAR_WIDTH = 65;
  var BAR_HEIGHT = SHADOW_OFFSET + CELL_WIDTH;
  var BAR_WIDTH = 400;
  var canvas = $("#main-ui")[0];
  var ctx = canvas.getContext('2d');

  var canvasWidth = canvas.width = window.innerWidth;
  var canvasHeight = canvas.height = window.innerHeight - 20;
  canvas.style.marginTop = 20 / 2;
  
  var gameWidth = canvasWidth;
  var gameHeight = canvasHeight - BAR_HEIGHT;
  
  var newPlayerFrames = [];
  var playerPortion = [];
  var allPlayers = [];
  var players = [];
  var animateOff = false;
  var animateGrid = new Grid(GRID_SIZE);
  var grid = new Grid(GRID_SIZE, function(row, col, before, after) {
    //Keep track of areas.
    if (before)
      playerPortion[before.num]--;
    if (after)
      playerPortion[after.num]++;
      
    //Queue animation
    if (before === after || animateOff)
      return;
    animateGrid.set(row, col, {
      before: before,
      after: after,
      frame: 0
    });
  }); 
  
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
    }
    
    playerPortion[p] = 0;
    allPlayers[p] = players[p] = new Player(true, grid, sdata);
    
    for (var dr = -1; dr <= 1; dr++)
      for (var dc = -1; dc <= 1; dc++)
        if (!grid.isOutOfBounds(dr + pRow, dc + pCol))
          grid.set(dr + pRow, dc + pCol, players[p]);
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
  animateOff = false;

  var frameCount = 0;
  var animateTo = [0, 0];
  var offset = [0, 0];
  
  var userPortion = 0;
  var lagPortion = 0;
  var portionSpeed = 0;
  
  //TODO: current player index
  var user = players[0];
  
  centerOnPlayer(user, offset);
  
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
    
    //Change area percentage
    if (lagPortion !== userPortion)
    {
      delta = userPortion - lagPortion;
      dir = Math.sign(delta);
      mag = Math.min(Math.abs(portionSpeed), Math.abs(delta));
      lagPortion += dir * mag;
    }
    
    //Move players.
    var dead = [];
    players = players.filter(function(val) {
      if (!newPlayerFrames[val.num])
        newPlayerFrames[val.num] = 0;
      
      if (newPlayerFrames[val.num] < ANIMATE_FRAMES)
        newPlayerFrames[val.num]++;
      else
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
          if (grid.get(players[i].row, players[i].col) === players[i])
            removing[j] = true;
          else if (grid.get(players[j].row, players[j].col) === players[j])
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
      allPlayers[val.num] = undefined;
    });
    for (var r = 0; r < grid.size; r++)
    {
      for (var c = 0; c < grid.size; c++)
      {
        if (dead.indexOf(grid.get(r, c)) !== -1)
          grid.set(r, c, null);
      }
    }
    
    //Update user's portions and top ranks.
    userPortion = playerPortion[user.num] / (GRID_SIZE * GRID_SIZE);
    portionSpeed = Math.abs(userPortion - lagPortion) / ANIMATE_FRAMES;
    
    //TODO: animate player is dead. (maybe explosion?)
    //TODO: show when this player is dead
    centerOnPlayer(user, animateTo);
  }
  
  function centerOnPlayer(player, pos)
  {
    var xOff = Math.floor(player.posX - (gameWidth - CELL_WIDTH) / 2);
    var yOff = Math.floor(player.posY - (gameHeight - CELL_WIDTH) / 2);
    pos[0] = Math.max(Math.min(xOff, grid.size * CELL_WIDTH + BORDER_WIDTH * 2 - gameWidth), 0);
    pos[1] = Math.max(Math.min(yOff, grid.size * CELL_WIDTH + BORDER_WIDTH * 2 - gameHeight), 0);
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
  
  //Thanks to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  }
  
  function squaresIntersect(a, b)
  {
    if (a < b)
      return b < a + CELL_WIDTH;
    else
      return a < b + CELL_WIDTH;
  }
  
  function paintGridBorder() 
  {
    ctx.fillStyle = 'lightgray';
    var gridWidth = CELL_WIDTH * GRID_SIZE;
    
    ctx.fillRect(-BORDER_WIDTH, 0, BORDER_WIDTH, gridWidth);
    ctx.fillRect(-BORDER_WIDTH, -BORDER_WIDTH, gridWidth + BORDER_WIDTH * 2, BORDER_WIDTH);
    ctx.fillRect(gridWidth, 0, BORDER_WIDTH, gridWidth);
    ctx.fillRect(-BORDER_WIDTH, gridWidth, gridWidth + BORDER_WIDTH * 2, BORDER_WIDTH);
  }
  
  function paintGridLines()
  {
    ctx.fillStyle = 'lightgray';
    ctx.beginPath();
    for (var x = modRotate(-offset[0], CELL_WIDTH); x < gameWidth; x += CELL_WIDTH)
    {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, gameHeight);
    }
    for (var y = modRotate(-offset[1], CELL_WIDTH); y < gameHeight; y+= CELL_WIDTH)
    {
      ctx.moveTo(0, y);
      ctx.lineTo(gameWidth, y);
    }
    ctx.stroke();
  }
  
  function modRotate(val, mod)
  {
    var res = val % mod;
    if (res >= 0)
      return res;
    else
      return mod + res;
  }
  
  function paintGrid()
  {
    //Paint background.
    ctx.fillStyle = "#e2ebf3";
    ctx.fillRect(0, 0, CELL_WIDTH * GRID_SIZE, CELL_WIDTH * GRID_SIZE);
    
    paintGridBorder();
    //paintGridLines();
    
    //Get viewing limits
    var minRow = Math.max(Math.floor((offset[1] - BORDER_WIDTH) / CELL_WIDTH), 0); 
    var minCol = Math.max(Math.floor((offset[0] - BORDER_WIDTH) / CELL_WIDTH), 0); 
    var maxRow = Math.min(Math.ceil((offset[1] + gameHeight) / CELL_WIDTH), grid.size); 
    var maxCol = Math.min(Math.ceil((offset[0] + gameWidth) / CELL_WIDTH), grid.size); 
      
    //Paint occupied areas. (and fading ones).
    for (var r = minRow; r < maxRow; r++)
    {
      for (var c = minCol; c < maxCol; c++)
      {
        var p = grid.get(r, c);
        var x = c * CELL_WIDTH, y = r * CELL_WIDTH, baseColor, shadowColor;
        
        var animateSpec = animateGrid.get(r, c);
        if (!animateOff && animateSpec)
        {
          if (animateSpec.before) //fading animation
          {
            var alpha = 1 - (animateSpec.frame / ANIMATE_FRAMES);
            baseColor = animateSpec.before.baseColor.deriveAlpha(alpha);
            shadowColor = animateSpec.before.shadowColor.deriveAlpha(alpha);
          }
          else
            continue;
        } 
        else if (p)
        {
          baseColor = p.baseColor;
          shadowColor = p.shadowColor;
        }
        else //No animation nor is this player owned. 
          continue;
        
        var hasBottom = !grid.isOutOfBounds(r + 1, c);
        var bottomAnimate = hasBottom && animateGrid.get(r + 1, c);
        var bottomEmpty = !bottomAnimate || (bottomAnimate.after && bottomAnimate.before);
        if (hasBottom && ((!!bottomAnimate ^ !!animateSpec) || bottomEmpty))
        {
          ctx.fillStyle = shadowColor.rgbString();
          ctx.fillRect(x, y + CELL_WIDTH, CELL_WIDTH, SHADOW_OFFSET);
        }
        ctx.fillStyle = baseColor.rgbString();
        ctx.fillRect(x, y, CELL_WIDTH, CELL_WIDTH);
      }
    }
    
    if (animateOff)
      return;
    
    //Paint squares with drop in animation.
    for (var r = 0; r < grid.size; r++)
    {
      for (var c = 0; c < grid.size; c++)
      {
        animateSpec = animateGrid.get(r, c);
        x = c * CELL_WIDTH, y = r * CELL_WIDTH;
        
        if (animateSpec && !animateOff) 
        {
          var viewable = r >= minRow && r < maxRow && c >= minCol && c < maxCol;
          if (animateSpec.after && viewable)
          {
            //Bouncing the squares.
            var offsetBounce = getBounceOffset(animateSpec.frame);
            y -= offsetBounce;
            
            shadowColor = animateSpec.after.shadowColor;
            baseColor = animateSpec.after.baseColor.deriveLumination(-(offsetBounce / DROP_HEIGHT) * .1);
            
            ctx.fillStyle = shadowColor.rgbString();
            ctx.fillRect(x, y + SHADOW_OFFSET, CELL_WIDTH, CELL_WIDTH);
            ctx.fillStyle = baseColor.rgbString();
            ctx.fillRect(x, y, CELL_WIDTH, CELL_WIDTH);
          }
          
          animateSpec.frame++;
          if (animateSpec.frame >= ANIMATE_FRAMES)
            animateGrid.set(r, c, null);
        }
      }
    }
  }
  
  function getBounceOffset(frame)
  {
    var offsetBounce = ANIMATE_FRAMES;
    var bounceNum = BOUNCE_FRAMES.length - 1;
    while (bounceNum >= 0 && frame < offsetBounce - BOUNCE_FRAMES[bounceNum])
    {
      offsetBounce -= BOUNCE_FRAMES[bounceNum];
      bounceNum--;
    }
    
    if (bounceNum === -1)
    {
      return (offsetBounce - frame) * DROP_SPEED;
    }
    else
    {
      offsetBounce -= BOUNCE_FRAMES[bounceNum];
      frame = frame - offsetBounce;
      var midFrame = BOUNCE_FRAMES[bounceNum] / 2;
      if (frame >= midFrame)
        return (BOUNCE_FRAMES[bounceNum] - frame) * DROP_SPEED;
      else
        return frame * DROP_SPEED;
    }
  }
  
  var showedDead = false;
  function paintLoop()
  {
    ctx.fillStyle = 'whitesmoke';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    //Draw the grid items.
    ctx.save();
    ctx.beginPath();
    ctx.translate(-offset[0] + BORDER_WIDTH, -offset[1] + BORDER_WIDTH + BAR_HEIGHT);
    ctx.rect(offset[0] - BORDER_WIDTH, offset[1] - BORDER_WIDTH, canvasWidth, canvasHeight);
    ctx.clip();
    paintGrid();
    players.forEach(function (p) {
      var fr = newPlayerFrames[p.num] || 0;
      if (fr < ANIMATE_FRAMES)
        p.render(ctx, fr / ANIMATE_FRAMES);
      else
        p.render(ctx);
    });
    
    
    
    //Reset transform to paint fixed UI elements
    ctx.restore();
    
    //UI Bar background
    ctx.fillStyle = "#24422c";
    ctx.fillRect(0, 0, canvasWidth, BAR_HEIGHT);
    
    var barOffset;
    ctx.fillStyle = "white";
    ctx.font = "24px Changa";
    barOffset = ctx.measureText(user.name).width + 10;
    ctx.fillText(user.name, 5, CELL_WIDTH - 5);
    
    //Draw filled bar.
    ctx.fillStyle = "rgba(180, 180, 180, .3)";
    ctx.fillRect(barOffset, 0, BAR_WIDTH, BAR_HEIGHT);
    
    var barSize = Math.ceil((BAR_WIDTH - MIN_BAR_WIDTH) * lagPortion + MIN_BAR_WIDTH);
    ctx.fillStyle = user.baseColor.rgbString();
    ctx.fillRect(barOffset, 0, barSize, CELL_WIDTH);
    ctx.fillStyle = user.shadowColor.rgbString();
    ctx.fillRect(barOffset, CELL_WIDTH, barSize, SHADOW_OFFSET);
    
    //Percentage
    ctx.fillStyle = "white";
    ctx.font = "18px Changa";
    ctx.fillText((lagPortion * 100).toFixed(3) + "%", 5 + barOffset, CELL_WIDTH - 5);
    
    if (user.dead && !showedDead)
    {
      showedDead = true;
      console.log("You died!");
      //return;
    }
    
    //TODO: sync each loop with server. (server will give frame count.)
    frameCount++;
    update();
    requestAnimationFrame(paintLoop);
  }
  paintLoop();
  
  
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

/* global $ */

var core = require("../game-core");
var client = require("../client");
var Rolling = require("./rolling");

var GRID_SIZE = core.GRID_SIZE;
var CELL_WIDTH = core.CELL_WIDTH;
var SPEED = core.SPEED;
var BORDER_WIDTH = core.BORDER_WIDTH;
var SHADOW_OFFSET = 5;
var ANIMATE_FRAMES = 24;
var BOUNCE_FRAMES = [8, 4];
var DROP_HEIGHT = 24;
var DROP_SPEED = 2;
var MIN_BAR_WIDTH = 65;
var BAR_HEIGHT = SHADOW_OFFSET + CELL_WIDTH;
var BAR_WIDTH = 400;

var canvas, canvasWidth, canvasHeight, gameWidth, gameHeight, ctx, offctx, offscreenCanvas;

$(function () {
  canvas = $("#main-ui")[0];
  ctx = canvas.getContext('2d');
  
  offscreenCanvas = document.createElement("canvas");
  offctx = offscreenCanvas.getContext('2d');
  
  canvas.style.marginTop = 10;
  updateSize();
});


var animateGrid, playerPortion, portionsRolling, 
  barProportionRolling,  animateTo, offset, user, zoom, showedDead;
var grid = client.grid;

function updateSize()
{
  var changed = false;
  if (canvasWidth != window.innerWidth)
  {
    gameWidth = canvasWidth = offscreenCanvas.width = canvas.width = window.innerWidth;
    changed = true;
  }
  
  if (canvasHeight != window.innerHeight - 20)
  {
    canvasHeight = offscreenCanvas.height = canvas.height = window.innerHeight - 20;
    gameHeight = canvasHeight - BAR_HEIGHT;
    changed = true;
  }
  
  if (changed && user)
    centerOnPlayer(user, offset);
}

function reset() {
  animateGrid = new core.Grid(GRID_SIZE);
  
  playerPortion = [];
  portionsRolling = [];
  barProportionRolling = [];
  
  animateTo = [0, 0];
  offset = [0, 0];
  
  user = null;
  zoom = 1;
  
  showedDead = false;
}

reset();

//Paint methods.
function paintGridBorder(ctx) 
{
  ctx.fillStyle = 'lightgray';
  var gridWidth = CELL_WIDTH * GRID_SIZE;

  ctx.fillRect(-BORDER_WIDTH, 0, BORDER_WIDTH, gridWidth);
  ctx.fillRect(-BORDER_WIDTH, -BORDER_WIDTH, gridWidth + BORDER_WIDTH * 2, BORDER_WIDTH);
  ctx.fillRect(gridWidth, 0, BORDER_WIDTH, gridWidth);
  ctx.fillRect(-BORDER_WIDTH, gridWidth, gridWidth + BORDER_WIDTH * 2, BORDER_WIDTH);
}

function paintGrid(ctx)
{
  //Paint background.
  ctx.fillStyle = "rgb(211, 225, 237)";
  ctx.fillRect(0, 0, CELL_WIDTH * GRID_SIZE, CELL_WIDTH * GRID_SIZE);
  
  paintGridBorder(ctx);
  //paintGridLines(ctx);
  
  //Get viewing limits
  var offsetX = (offset[0] - BORDER_WIDTH);
  var offsetY = (offset[1] - BORDER_WIDTH);
  
  var minRow = Math.max(Math.floor(offsetY / CELL_WIDTH), 0); 
  var minCol = Math.max(Math.floor(offsetX / CELL_WIDTH), 0); 
  var maxRow = Math.min(Math.ceil((offsetY + gameHeight / zoom) / CELL_WIDTH), grid.size); 
  var maxCol = Math.min(Math.ceil((offsetX + gameWidth / zoom) / CELL_WIDTH), grid.size); 
    
  //Paint occupied areas. (and fading ones).
  for (var r = minRow; r < maxRow; r++)
  {
    for (var c = minCol; c < maxCol; c++)
    {
      var p = grid.get(r, c);
      var x = c * CELL_WIDTH, y = r * CELL_WIDTH, baseColor, shadowColor;
      
      var animateSpec = animateGrid.get(r, c);
      if (client.allowAnimation && animateSpec)
      {
        if (animateSpec.before) //fading animation
        {
          var frac = (animateSpec.frame / ANIMATE_FRAMES);
          var back = new core.Color(.58, .41, .92, 1);
          baseColor = animateSpec.before.lightBaseColor.interpolateToString(back, frac);
          shadowColor = animateSpec.before.shadowColor.interpolateToString(back, frac);
        }
        else
          continue;
      } 
      else if (p)
      {
        baseColor = p.lightBaseColor;
        shadowColor = p.shadowColor;
      }
      else //No animation nor is this player owned. 
        continue;
      
      var hasBottom = !grid.isOutOfBounds(r + 1, c);
      var bottomAnimate = hasBottom && animateGrid.get(r + 1, c);
      var totalStatic = !bottomAnimate && !animateSpec;
      var bottomEmpty = totalStatic ? (hasBottom && !grid.get(r + 1, c)) :
        (!bottomAnimate || (bottomAnimate.after && bottomAnimate.before));
      if (hasBottom && ((!!bottomAnimate ^ !!animateSpec) || bottomEmpty))
      {
        
        ctx.fillStyle = shadowColor.rgbString();
        ctx.fillRect(x, y + CELL_WIDTH, CELL_WIDTH + 1, SHADOW_OFFSET);
      }
      ctx.fillStyle = baseColor.rgbString();
      ctx.fillRect(x, y, CELL_WIDTH + 1, CELL_WIDTH + 1);
    }
  }
  
  if (!client.allowAnimation)
    return;
  
  //Paint squares with drop in animation.
  for (var r = 0; r < grid.size; r++)
  {
    for (var c = 0; c < grid.size; c++)
    {
      animateSpec = animateGrid.get(r, c);
      x = c * CELL_WIDTH, y = r * CELL_WIDTH;
      
      if (animateSpec && client.allowAnimation) 
      {
        var viewable = r >= minRow && r < maxRow && c >= minCol && c < maxCol;
        if (animateSpec.after && viewable)
        {
          //Bouncing the squares.
          var offsetBounce = getBounceOffset(animateSpec.frame);
          y -= offsetBounce;
          
          shadowColor = animateSpec.after.shadowColor;
          baseColor = animateSpec.after.lightBaseColor.deriveLumination(-(offsetBounce / DROP_HEIGHT) * .1);
          
          ctx.fillStyle = shadowColor.rgbString();
          ctx.fillRect(x, y + CELL_WIDTH, CELL_WIDTH, SHADOW_OFFSET);
          ctx.fillStyle = baseColor.rgbString();
          ctx.fillRect(x, y, CELL_WIDTH + 1, CELL_WIDTH + 1);
        }
        
        animateSpec.frame++;
        if (animateSpec.frame >= ANIMATE_FRAMES)
          animateGrid.set(r, c, null);
      }
    }
  }
}


function paintUIBar(ctx)
{
  
  //UI Bar background
  ctx.fillStyle = "#24422c";
  ctx.fillRect(0, 0, canvasWidth, BAR_HEIGHT);
  
  var barOffset;
  ctx.fillStyle = "white";
  ctx.font = "24px Changa";
  barOffset = (user && user.name) ? (ctx.measureText(user.name).width + 20) : 0;
  ctx.fillText(user ? user.name : "", 5, CELL_WIDTH - 5);
  
  //Draw filled bar.
  ctx.fillStyle = "rgba(180, 180, 180, .3)";
  ctx.fillRect(barOffset, 0, BAR_WIDTH, BAR_HEIGHT);
  
  var userPortions = portionsRolling[user.num] ? portionsRolling[user.num].lag : 0;
  var barSize = Math.ceil((BAR_WIDTH - MIN_BAR_WIDTH) * userPortions + MIN_BAR_WIDTH);
  ctx.fillStyle = user ? user.baseColor.rgbString() : "";
  ctx.fillRect(barOffset, 0, barSize, CELL_WIDTH);
  ctx.fillStyle = user ? user.shadowColor.rgbString() : "";
  ctx.fillRect(barOffset, CELL_WIDTH, barSize, SHADOW_OFFSET);
  
  //TODO: dont reset kill count and zoom when we request frames.
  //Percentage
  ctx.fillStyle = "white";
  ctx.font = "18px Changa";
  ctx.fillText((userPortions * 100).toFixed(3) + "%", 5 + barOffset, CELL_WIDTH - 5);
  
  //Number of kills
  var killsText = "Kills: " + client.kills;
  var killsOffset = 20 + BAR_WIDTH + barOffset;
  ctx.fillText(killsText, killsOffset, CELL_WIDTH - 5);
  
  //Calcuate rank
  var sorted = [];
  client.getPlayers().forEach(function(val) {
    sorted.push({player: val, portion: playerPortion[val.num]});
  });
  sorted.sort(function(a, b) {
    if (a.portion === b.portion) return a.player.num - b.player.num;
    else return b.portion - a.portion;
  });
 
  var rank = sorted.findIndex(function(val) {return val.player === user});
  ctx.fillText("Rank: " + (rank === -1 ? "--" : rank + 1) + " of " + sorted.length, 
  ctx.measureText(killsText).width + killsOffset + 20, CELL_WIDTH - 5);
  
  //Rolling the leaderboard bars.
  if (sorted.length > 0)
  {
    var maxPortion = sorted[0].portion;
    client.getPlayers().forEach(function(player) {
      var rolling = barProportionRolling[player.num];
      rolling.value = playerPortion[player.num] / maxPortion;
      rolling.update();
    });
  }
  
  //Show leaderboard.
  var leaderboardNum = Math.min(5, sorted.length);
  for (var i = 0; i < leaderboardNum; i++)
  {
    var player = sorted[i].player;
    var name = player.name || "Unnamed";
    var portion = barProportionRolling[player.num].lag;
    
    var nameWidth = ctx.measureText(name).width;
    barSize = Math.ceil((BAR_WIDTH - MIN_BAR_WIDTH) * portion + MIN_BAR_WIDTH);
    var barX = canvasWidth - barSize;
    var barY = BAR_HEIGHT * (i + 1);
    var offset = i == 0 ? 10 : 0;
    
    ctx.fillStyle = 'rgba(10, 10, 10, .3)';
    ctx.fillRect(barX - 10, barY + 10 - offset, barSize + 10, BAR_HEIGHT + offset);
    ctx.fillStyle = player.baseColor.rgbString();
    ctx.fillRect(barX, barY, barSize, CELL_WIDTH);
    ctx.fillStyle = player.shadowColor.rgbString();
    ctx.fillRect(barX, barY + CELL_WIDTH, barSize, SHADOW_OFFSET);
    
    ctx.fillStyle = "black";
    ctx.fillText(name, barX - nameWidth - 15, barY + 27);
    
    var percentage = (portionsRolling[player.num].lag * 100).toFixed(3) + "%";
    ctx.fillStyle = "white";
    ctx.fillText(percentage, barX + 5, barY + CELL_WIDTH - 5);
  }
  
}

function paint(ctx)
{
  
  ctx.fillStyle = '#e2ebf3';  //'whitesmoke';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  //Move grid to viewport as said with the offsets, below the stats
  ctx.save();
  ctx.translate(0, BAR_HEIGHT);
  ctx.beginPath();
  ctx.rect(0, 0, gameWidth, gameHeight);
  ctx.clip();
  
  //Zoom in/out based on player stats.
  ctx.scale(zoom, zoom);
  ctx.translate(-offset[0] + BORDER_WIDTH, -offset[1] + BORDER_WIDTH);
  
  paintGrid(ctx);
  client.getPlayers().forEach(function (p) {
    var fr = p.waitLag;
    if (fr < ANIMATE_FRAMES)
      p.render(ctx, fr / ANIMATE_FRAMES);
    else
      p.render(ctx);
  });
  
  //Reset transform to paint fixed UI elements
  ctx.restore();
  paintUIBar(ctx);
  
  if ((!user || user.dead) && !showedDead)
  {
    showedDead = true;
    console.log("You died!");
    //return;
  }
}

function paintDoubleBuff()
{
  paint(offctx);
  ctx.drawImage(offscreenCanvas, 0, 0);
}

function update() {
  updateSize();
  
  //Change grid offsets.
  for (var i = 0; i <= 1; i++)
  {
    if (animateTo[i] !== offset[i])
    {
      if (client.allowAnimation)
      {
        var delta = animateTo[i] - offset[i];
        var dir = Math.sign(delta);
        var mag = Math.min(SPEED, Math.abs(delta));
        offset[i] += dir * mag;
      }
      else
        offset[i] = animateTo[i];
    }
  }
  
  //Calculate player portions.
  client.getPlayers().forEach(function(player) {
    var roll = portionsRolling[player.num];
    roll.value = playerPortion[player.num] / GRID_SIZE / GRID_SIZE;
    roll.update();
  });
  
  //Zoom goes from 1 to .5, decreasing as portion goes up. TODO: maybe can modify this?
  if (portionsRolling[user.num])
    zoom = 1 / (portionsRolling[user.num].lag + 1); 
  
  //TODO: animate player is dead. (maybe explosion?), and tail rewinds itself.
  if (user) centerOnPlayer(user, animateTo);
}

//Helper methods.
function centerOnPlayer(player, pos)
{
  var xOff = Math.floor(player.posX - (gameWidth / zoom - CELL_WIDTH) / 2);
  var yOff = Math.floor(player.posY - (gameHeight / zoom - CELL_WIDTH) / 2);
  var gridWidth = grid.size * CELL_WIDTH + BORDER_WIDTH * 2;
  pos[0] = xOff; //Math.max(Math.min(xOff, gridWidth + (BAR_WIDTH + 100) / zoom - gameWidth / zoom), 0);
  pos[1] = yOff; //Math.max(Math.min(yOff, gridWidth - gameHeight / zoom), 0);
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

function showStats() {
  //TODO: Show score stats.
  $("#begin").removeClass("hidden");
  $("#begin").animate({
    opacity: .9999
  }, 1000, function() {
    $("#stats").addClass("hidden").css("opacity", 0);
  });
}

module.exports = exports = {
  addPlayer: function(player) {
    playerPortion[player.num] = 0;
    portionsRolling[player.num] = new Rolling(9 / GRID_SIZE / GRID_SIZE, ANIMATE_FRAMES);
    barProportionRolling[player.num] = new Rolling(0, ANIMATE_FRAMES);
  },
  disconnect: function() {
    //Show score stats.
    $("#stats").removeClass("hidden");
    $("#stats").animate({
      opacity: .9999
    }, 3000, function() {
      showStats();
      //Then fade back into the login screen.
    });
  },
  removePlayer: function(player) {
    delete playerPortion[player.num];
    delete portionsRolling[player.num];
    delete barProportionRolling[player.num];
  },
  
  setUser: function(player) {
    user = player;
    centerOnPlayer(user, offset);
  },
  reset: reset,
  updateGrid: function(row, col, before, after) {
    //Keep track of areas.
    if (before)
      playerPortion[before.num]--;
    if (after)
      playerPortion[after.num]++;
      
    //Queue animation
    if (before === after || !client.allowAnimation)
      return;
    animateGrid.set(row, col, {
      before: before,
      after: after,
      frame: 0
    });
  },
  paint: paintDoubleBuff,
  update: update
};

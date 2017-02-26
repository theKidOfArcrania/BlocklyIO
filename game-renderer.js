/* global $ */
var Color = require("./color.js");
var Grid = require("./grid.js");
var consts = require("./game-consts.js");
var core = require("./game-core.js");

var GRID_SIZE = consts.GRID_SIZE;
var CELL_WIDTH = consts.CELL_WIDTH;
var SPEED = consts.SPEED;
var BORDER_WIDTH = consts.BORDER_WIDTH;
var SHADOW_OFFSET = 5;
var ANIMATE_FRAMES = 24;
var BOUNCE_FRAMES = [8, 4];
var DROP_HEIGHT = 24;
var DROP_SPEED = 2;
var MIN_BAR_WIDTH = 65;
var BAR_HEIGHT = SHADOW_OFFSET + CELL_WIDTH;
var BAR_WIDTH = 400;


var canvasWidth, canvasHeight, gameWidth, gameHeight, ctx, offctx, offscreenCanvas;

$(function () {
  var canvas = $("#main-ui")[0];
  ctx = canvas.getContext('2d');
  
  offscreenCanvas = document.createElement("canvas");
  offctx = offscreenCanvas.getContext('2d');

  canvasWidth = offscreenCanvas.width = canvas.width = window.innerWidth;
  canvasHeight = offscreenCanvas.height = canvas.height = window.innerHeight - 20;
  canvas.style.marginTop = 20 / 2;
  
  gameWidth = canvasWidth;
  gameHeight = canvasHeight - BAR_HEIGHT;
});


var allowAnimation = true;
var animateGrid, players, allPlayers, newPlayerFrames, playerPortion, grid, 
  animateTo, offset, user, lagPortion, portionSpeed, zoom, kills, showedDead;

grid = new Grid(GRID_SIZE, function(row, col, before, after) {
  //Keep track of areas.
  if (before)
    playerPortion[before.num]--;
  if (after)
    playerPortion[after.num]++;
    
  //Queue animation
  if (before === after || !allowAnimation)
    return;
  animateGrid.set(row, col, {
    before: before,
    after: after,
    frame: 0
  });
});

function init() {
  animateGrid = new Grid(GRID_SIZE);
  grid.reset();
  
  players = [];
  allPlayers = [];
  newPlayerFrames = [];
  playerPortion = [];
  
  animateTo = [0, 0];
  offset = [0, 0];
  
  user = null;
  lagPortion = 0;
  portionSpeed = 0;
  zoom = 1;
  kills = 0;
  showedDead = false;
}

init();

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

function paintGridLines(ctx)
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

function paintGrid(ctx)
{
  //Paint background.
  ctx.fillStyle = "#e2ebf3";
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
      if (allowAnimation && animateSpec)
      {
        if (animateSpec.before) //fading animation
        {
          var frac = (animateSpec.frame / ANIMATE_FRAMES);
          var back = new Color(.58, .41, .92, 1);
          baseColor = animateSpec.before.baseColor.interpolateToString(back, frac);
          shadowColor = animateSpec.before.shadowColor.interpolateToString(back, frac);
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
  
  if (!allowAnimation)
    return;
  
  //Paint squares with drop in animation.
  for (var r = 0; r < grid.size; r++)
  {
    for (var c = 0; c < grid.size; c++)
    {
      animateSpec = animateGrid.get(r, c);
      x = c * CELL_WIDTH, y = r * CELL_WIDTH;
      
      if (animateSpec && allowAnimation) 
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
  barOffset = ctx.measureText(user ? user.name : "").width + 20;
  ctx.fillText(user ? user.name : "", 5, CELL_WIDTH - 5);
  
  //Draw filled bar.
  ctx.fillStyle = "rgba(180, 180, 180, .3)";
  ctx.fillRect(barOffset, 0, BAR_WIDTH, BAR_HEIGHT);
  
  var barSize = Math.ceil((BAR_WIDTH - MIN_BAR_WIDTH) * lagPortion + MIN_BAR_WIDTH);
  ctx.fillStyle = user ? user.baseColor.rgbString() : "";
  ctx.fillRect(barOffset, 0, barSize, CELL_WIDTH);
  ctx.fillStyle = user ? user.shadowColor.rgbString() : "";
  ctx.fillRect(barOffset, CELL_WIDTH, barSize, SHADOW_OFFSET);
  
  //Percentage
  ctx.fillStyle = "white";
  ctx.font = "18px Changa";
  ctx.fillText((lagPortion * 100).toFixed(3) + "%", 5 + barOffset, CELL_WIDTH - 5);
  
  //Number of kills
  var killsText = "Kills: " + kills;
  var killsOffset = 20 + BAR_WIDTH + barOffset;
  ctx.fillText(killsText, killsOffset, CELL_WIDTH - 5);
  
  //Calcuate rank
  var sorted = [];
  players.forEach(function(val) {
    sorted.push({player: val, portion: playerPortion[val.num]});
  });
  sorted.sort(function(a, b) {
    if (a.portion === b.portion) return a.player.num - b.player.num;
    else return b.portion - a.portion;
  });
  
  var rank = sorted.findIndex(function(val) {return val.player === user});
  ctx.fillText("Rank: " + (rank === -1 ? "--" : rank + 1) + " of " + sorted.length, 
  ctx.measureText(killsText).width + killsOffset + 20, CELL_WIDTH - 5);
}

function paint(ctx)
{
  ctx.fillStyle = 'whitesmoke';
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
  players.forEach(function (p) {
    var fr = newPlayerFrames[p.num] || 0;
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
  var userPortion;
  if (user) userPortion = playerPortion[user.num] / (GRID_SIZE * GRID_SIZE);
  else userPortion = 0;
  
  if (lagPortion !== userPortion)
  {
    delta = userPortion - lagPortion;
    dir = Math.sign(delta);
    mag = Math.min(Math.abs(portionSpeed), Math.abs(delta));
    lagPortion += dir * mag;
  }
  
  //Zoom goes from 1 to .5, decreasing as portion goes up. TODO: maybe can modify this?
  zoom = 1 / (lagPortion + 1); 
  
  //Update user's portions and top ranks.
  portionSpeed = Math.abs(userPortion - lagPortion) / ANIMATE_FRAMES;
  
  var dead = [];
  core.updateFrame(grid, players, newPlayerFrames, dead, function addKill(killer, other)
  {
    if (players[killer] === user && killer !== other)
      kills++;
  });
  dead.forEach(function(val) {
    console.log(val.name + " is dead");
    allPlayers[val.num] = undefined;
  });
  
  //TODO: animate player is dead. (maybe explosion?), and tail rewinds itself.
  //TODO: show when this player is dead
  if (user) centerOnPlayer(user, animateTo);
}

//Helper methods.
function modRotate(val, mod)
{
  var res = val % mod;
  if (res >= 0)
    return res;
  else
    return mod + res;
}

function centerOnPlayer(player, pos)
{
  var xOff = Math.floor(player.posX - (gameWidth / zoom - CELL_WIDTH) / 2);
  var yOff = Math.floor(player.posY - (gameHeight / zoom - CELL_WIDTH) / 2);
  pos[0] = Math.max(Math.min(xOff, grid.size * CELL_WIDTH + BORDER_WIDTH * 2 - gameWidth / zoom), 0);
  pos[1] = Math.max(Math.min(yOff, grid.size * CELL_WIDTH + BORDER_WIDTH * 2 - gameHeight / zoom), 0);
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



module.exports = exports = {
  addPlayer: function(player) {
    if (allPlayers[player.num])
      return; //Already added.
    allPlayers[player.num] = players[players.length] = player;
    newPlayerFrames[player.num] = 0;
    playerPortion[player.num] = 0;
    core.initPlayer(grid, player);
    return players.length - 1;
  },
  getPlayer: function(ind) {
    return players[ind];
  },
  getPlayerFromNum: function(num) {
    return allPlayers[num];
  },
  playerSize: function() {
    return players.length;
  },
  setUser: function(player) {
    user = player;
    centerOnPlayer(user, offset);
  },
  incrementKill: function() {
    kills++;
  },
  reset: function() {
    init();
  },
  paint: paintDoubleBuff,
  update: update
};

Object.defineProperties(exports, {
  allowAnimation: {
    get: function() { return allowAnimation; },
    set: function(val) { allowAnimation = !!val; },
    enumerable: true
  },
  grid: {
    get: function() { return grid; },
    enumerable: true
  }
});
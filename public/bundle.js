(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){


function Color(h, s, l, a)
{
  verifyRange(h, s, l);
  if (a === undefined) a = 1;
  else verifyRange(a);
  
  Object.defineProperties(this, {
    "hue": {value: h, enumerable: true},
    "sat": {value: s, enumerable: true},
    "lum": {value: l, enumerable: true},
    "alpha": {value: a, enumerable: true},
  });
}

function verifyRange()
{
  for (var i = 0; i < arguments.length; i++)
  {
    if (arguments[i] < 0 || arguments[i] > 1)
      throw new RangeError("H, S, L, and A parameters must be between the range [0, 1]");
  }
}

Color.prototype.deriveLumination = function(amount)
{
  var lum = this.lum + amount;
  lum = Math.min(Math.max(lum, 0), 1);
  return new Color(this.hue, this.sat, lum, this.alpha);
};

Color.prototype.deriveHue = function(amount)
{
  var hue = this.hue - amount;
  return new Color(hue - Math.floor(hue), this.sat, this.lum, this.alpha);
};

Color.prototype.deriveSaturation = function(amount)
{
  var sat = this.sat + amount;
  sat = Math.min(Math.max(sat, 0), 1);
  return new Color(this.hue, sat, this.lum, this.alpha);
};

Color.prototype.deriveAlpha = function(newAlpha)
{
  verifyRange(newAlpha);
  return new Color(this.hue, this.sat, this.lum, newAlpha);
};

Color.prototype.rgbString = function() {
  var rgb = hslToRgb(this.hue, this.sat, this.lum);
  rgb[3] = this.a;
  return 'rgba(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ', ' + this.alpha + ')';
};


//http://stackoverflow.com/a/9493060/7344257
function hslToRgb(h, s, l){
  var r, g, b;

  if(s == 0){
    r = g = b = l; // achromatic
  }else{
    var hue2rgb = function hue2rgb(p, q, t){
      if(t < 0) t += 1;
      if(t > 1) t -= 1;
      if(t < 1/6) return p + (q - p) * 6 * t;
      if(t < 1/2) return q;
      if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

module.exports = Color;
},{}],2:[function(require,module,exports){
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
    ctx.font = "24px Arial";
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
    ctx.font = "18px Arial";
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

},{"./grid.js":3,"./player.js":4}],3:[function(require,module,exports){
function Grid(size, changeCallback)
{
  var grid = new Array(size);
  
  var data = {
    grid: grid,
    size: size
  };
  
  this.get = function(row, col)
  {
    if (isOutOfBounds(data, row, col))
      throw new RangeError("Row or Column value out of bounds");
    return grid[row] && grid[row][col];
  }
  this.set = function(row, col, value)
  {
    if (isOutOfBounds(data, row, col))
      throw new RangeError("Row or Column value out of bounds");
      
    if (!grid[row])
      grid[row] = new Array(size);
    var before = grid[row][col];
    grid[row][col] = value;
    
    if (typeof changeCallback === "function")
      changeCallback(row, col, before, value);
    
    return before;
  }
  
  this.isOutOfBounds = isOutOfBounds.bind(this, data);
  
  Object.defineProperty(this, "size", {
    get: function() {return size; },
    enumerable: true
  });
  
}

function isOutOfBounds(data, row, col)
{
  return row < 0 || row >= data.size || col < 0 || col >= data.size;
}

module.exports = Grid;
},{}],4:[function(require,module,exports){
var Stack = require("./stack.js");
var Color = require("./color.js");
var Grid = require("./grid.js");

function defineGetter(getter) {
  return {
    get: getter,
    enumerable: true
  };
}

function defineInstanceMethods(thisobj, data /*, methods...*/)
{
  for (var i = 2; i < arguments.length; i++)
    thisobj[arguments[i].name] = arguments[i].bind(this, data);
}



function defineAccessorProperties(thisobj, data /*, names...*/)
{
  var descript = {};
  function getAt(name) { return function() {return data[name] } }
  for (var i = 2; i < arguments.length; i++)
    descript[arguments[i]] = defineGetter(getAt(arguments[i]));
  Object.defineProperties(thisobj, descript);
}

var CELL_WIDTH = 40;
var GRID_SIZE = 80;

function TailMove(orientation)
{
  this.move = 1;
  Object.defineProperty(this, "orientation", {
    value: orientation,
    enumerable: true
  });
}

function Tail(player, sdata)
{
  var data = {
    tail: [],
    tailGrid: [],
    prev: null,
    startRow: 0,
    startCol: 0,
    prevRow: 0, 
    prevCol: 0,
    player: player
  };
  
  if (sdata)
  {
    data.startRow = data.prevRow = sdata.startRow || 0;
    data.startCol = data.prevCol = sdata.startCol || 0;
    sdata.forEach(function(val) {
      addTail(data, val.orientation, val.move);
    });
  }
  data.grid = player.grid;
  
  defineInstanceMethods(this, data, addTail, hitsTail, fillTail, renderTail, reposition, serialData);
  Object.defineProperty(this, "moves", {
    get: function() {return data.tail.slice(0);},
    enumerable: true
  });
}

//Instance methods.
function serialData(data) {
  return JSON.serialize({
    tail: data.tail,
    startRow: data.startRow,
    startCol: data.startCol
  });
}

function setTailGrid(data, tailGrid, r, c)
{
  if (!tailGrid[r])
    tailGrid[r] = [];
  tailGrid[r][c] = true;
}

function addTail(data, orientation, count)
{
  if (count === undefined)
    count = 1;
  if (!count || count < 0)
    return;
  
  var prev = data.prev;
  var r = data.prevRow, c = data.prevCol;
  if (data.tail.length === 0)
    setTailGrid(data, data.tailGrid, r, c);
  
  if (!prev || prev.orientation !== orientation)
  {
    prev = data.prev = new TailMove(orientation);
    data.tail.push(prev);
  }
  else
    prev.move += count;

  for (var i = 0; i < count; i++)
  {
    var pos = walk([data.prevRow, data.prevCol], null, orientation, 1);
    data.prevRow = pos[0];
    data.prevCol = pos[1];
    setTailGrid(data, data.tailGrid, pos[0], pos[1]);
  }
  
}

function reposition(data, row, col)
{
  data.prevRow = data.startRow = row;
  data.prevCol = data.startCol = col;
  data.prev = null;
  if (data.tail.length === 0)
    return;
  else 
  {
    var ret = data.tail;
    data.tail = [];
    data.tailGrid = [];
    return ret;
  }
}

/*
function render2(data, ctx)
{
  ctx.fillStyle = data.player.tailColor.rgbString();
  for (var r = 0; r < data.tailGrid.length; r++)
  {
    if (!data.tailGrid[r])
      continue;
    for (var c = 0; c < data.tailGrid[r].length; c++)
      if (data.tailGrid[r][c])
        ctx.fillRect(c * CELL_WIDTH, r * CELL_WIDTH, CELL_WIDTH, CELL_WIDTH);
  }
}
*/

//Helper methods.
function renderTail(data, ctx)
{
  if (data.tail.length === 0)
    return;
  
  ctx.fillStyle = data.player.tailColor.rgbString();
  
  var prevOrient = -1;
  var start = [data.startRow, data.startCol];
  
  //fillTailRect(ctx, start, start);
  data.tail.forEach(function(tail) {
    var negDir = tail.orientation === 0 || tail.orientation === 3;

    var back = start;
    if (!negDir)
      start = walk(start, null, tail.orientation, 1);
    var finish = walk(start, null, tail.orientation, tail.move - 1);
    
    if (tail.move > 1)
      fillTailRect(ctx, start, finish);
    if (prevOrient !== -1)
      //Draw folding triangle.
      renderCorner(ctx, back, prevOrient, tail.orientation);
    
    start = finish;
    if (negDir)
      walk(start, start, tail.orientation, 1);
    prevOrient = tail.orientation;
  });
  
  var curOrient = data.player.currentHeading;
  if (prevOrient === curOrient)
  {
    fillTailRect(ctx, start, start);
  }
  else
    renderCorner(ctx, start, prevOrient, curOrient);
}

function renderCorner(ctx, cornerStart, dir1, dir2)
{
  if (dir1 === 0 || dir2 === 0)
    walk(cornerStart, cornerStart, 2, 1);
  if (dir1 === 3 || dir2 === 3)
    walk(cornerStart, cornerStart, 1, 1);
  
  var a = walk(cornerStart, null, dir2, 1);
  var b = walk(a, null, dir1, 1);
  
  var triangle = new Path2D();
  triangle.moveTo(cornerStart[1] * CELL_WIDTH, cornerStart[0] * CELL_WIDTH);
  triangle.lineTo(a[1] * CELL_WIDTH, a[0] * CELL_WIDTH);
  triangle.lineTo(b[1] * CELL_WIDTH, b[0] * CELL_WIDTH);
  triangle.closePath();
  for (var i = 0; i < 2; i++)
    ctx.fill(triangle);
}

function walk(from, ret, orient, dist)
{
  ret = ret || [];
  ret[0] = from[0];
  ret[1] = from[1];
  switch (orient)
  {
    case 0: ret[0] -= dist; break; //UP
    case 1: ret[1] += dist; break; //RIGHT
    case 2: ret[0] += dist; break; //DOWN
    case 3: ret[1] -= dist; break; //LEFT
  }
  return ret;
}

function fillTailRect(ctx, start, end)
{
  var x = start[1] * CELL_WIDTH;
  var y = start[0] * CELL_WIDTH;
  var width = (end[1] - start[1]) * CELL_WIDTH;
  var height = (end[0] - start[0]) * CELL_WIDTH;
  
  if (width === 0)
    width += CELL_WIDTH;
  if (height === 0)
    height += CELL_WIDTH;
  
  if (width < 0)
  {
    x += width;
    width = -width;
  }
  if (height < 0)
  {
    y += height;
    height = -height;
  }
  ctx.fillRect(x, y, width, height);
}

//TODO: fade in colors using grid property-getters/setters
function fillTail(data, grid)
{
  if (data.tail.length === 0)
    return;
  
  function onTail(c) { return data.tailGrid[c[0]] && data.tailGrid[c[0]][c[1]]; }
  
  var start = [data.startRow, data.startCol];
  var been = new Grid(grid.size);
  var coords = [];
  
  coords.push(start);
  while (coords.length > 0) //BFS for all tail spaces.
  {
    var coord = coords.shift();
    var r = coord[0];
    var c = coord[1];
    
    if (grid.isOutOfBounds(r, c))
      continue;
    
    if (been.get(r, c))
      continue;
    
    if (onTail(coord)) //on the tail.
    {
      been.set(r, c, true);
      grid.set(r, c, data.player);
      
      //Find all spots that this tail encloses.
      floodFill(data, grid, r + 1, c, been);
      floodFill(data, grid, r - 1, c, been);
      floodFill(data, grid, r, c + 1, been);
      floodFill(data, grid, r, c - 1, been);
      
      coords.push([r + 1, c]);
      coords.push([r - 1, c]);
      coords.push([r, c + 1]);
      coords.push([r, c - 1]);
    }
  }
}

function floodFill(data, grid, row, col, been)
{
  var coords = [];
  var filled = new Stack(40000);
  var surrounded = true;
  
  function onTail(c) { return data.tailGrid[c[0]] && data.tailGrid[c[0]][c[1]]; }
  
  coords.push([row, col]);
  while (coords.length > 0)
  {
    var coord = coords.shift();
    var r = coord[0];
    var c = coord[1];
    
    if (grid.isOutOfBounds(r, c))
    {
      surrounded = false;
      continue;
    }
    
    //End this traverse on boundaries (where we been, on the tail, and when we enter our territory)
    if (been.get(r, c) || onTail(coord) || grid.get(r, c) === data.player)
      continue;
      
    been.set(r, c, true);
    
    if (surrounded)
      filled.push(coord);
    
    coords.push([r + 1, c]);
    coords.push([r - 1, c]);
    coords.push([r, c + 1]);
    coords.push([r, c - 1]);
  }
  if (surrounded)
  {
    while (!filled.isEmpty())
    {
      coord = filled.pop();
      grid.set(coord[0], coord[1], data.player);
    }
  }
  
  return surrounded;
}

function hitsTail(data, other)
{
  return (data.prevRow !== other.row || data.prevCol !== other.col) &&
        (data.startRow !== other.row || data.startCol !== other.col) && 
    !!(data.tailGrid[other.row] && data.tailGrid[other.row][other.col]);
}

var CELL_WIDTH = 40;
var SPEED = 5;
var SHADOW_OFFSET = 10;

function Player(isClient, grid, sdata) {
  var data = {};
  
  //Parameters
  data.num = sdata.num;
  data.name = sdata.name || "Player " + (data.num + 1);
  data.isCient = isClient;
  data.grid = grid;
  data.posX = sdata.posX;
  data.posY = sdata.posY;
  this.heading = data.currentHeading = sdata.currentHeading; //0 is up, 1 is right, 2 is down, 3 is left.
  data.dead = false;
  
  //Only need colors for client side.
  if (isClient)
  {
    var hue = Math.random();
    var base = new Color(hue, .8, .5);
    this.baseColor = base;
    this.shadowColor = base.deriveLumination(-.3);
    this.tailColor = base.deriveLumination(.2).deriveAlpha(.5);
  }
  
  //Tail requires special handling.
  if (sdata.tail) 
    data.tail = new Tail(this, sdata.tail);
  else 
  {
    data.tail = new Tail(this);
    data.tail.reposition(data.row, data.col);
  }
  
  //Gets the next integer in positive or negative direction.
  function nearestInteger(positive, val)
  {
    return positive ? Math.ceil(val) : Math.floor(val);
  }
  
  //Instance methods.
  this.move = move.bind(this, data);
  this.die = function() {data.dead = true;};
  
  //Read-only Properties.
  defineAccessorProperties(this, data, "currentHeading", "dead", "name", "num", "posX", "posY", "tail");
  Object.defineProperties(this, {
    row: defineGetter(function() { return nearestInteger(data.currentHeading === 2 /*DOWN*/, data.posY / CELL_WIDTH); }),
    col: defineGetter(function() { return nearestInteger(data.currentHeading === 1 /*RIGHT*/, data.posX / CELL_WIDTH); })
  });
}

//Instance methods
Player.prototype.render = function(ctx, fade)
{
  //Render tail.
  this.tail.renderTail(ctx);
  
  //Render player.
  fade = fade || 1;
  ctx.fillStyle = this.shadowColor.deriveAlpha(fade).rgbString();
  ctx.fillRect(this.posX, this.posY, CELL_WIDTH, CELL_WIDTH);
  
  var mid = CELL_WIDTH / 2;
  var grd = ctx.createRadialGradient(this.posX + mid, this.posY + mid - SHADOW_OFFSET, 1,
            this.posX + mid, this.posY + mid - SHADOW_OFFSET, CELL_WIDTH);
  grd.addColorStop(0, this.baseColor.deriveAlpha(fade).rgbString());
  grd.addColorStop(1, "white");
  ctx.fillStyle = grd;
  ctx.fillRect(this.posX, this.posY - SHADOW_OFFSET, CELL_WIDTH, CELL_WIDTH);
  
  //Render name
  ctx.fillStyle = this.shadowColor.deriveAlpha(fade).rgbString();
  ctx.textAlign = "center";
  ctx.fillText(this.name, this.posX + CELL_WIDTH / 2, this.posY - SHADOW_OFFSET * 2);
};

function move(data)
{
  //Move to new position.
  var heading = this.heading;
  if (this.posX % CELL_WIDTH !== 0 || this.posY % CELL_WIDTH !== 0)
    heading = data.currentHeading;
  else 
    data.currentHeading = heading;
  switch (heading)
  {
    case 0: data.posY -= SPEED; break; //UP
    case 1: data.posX += SPEED; break; //RIGHT
    case 2: data.posY += SPEED; break; //DOWN
    case 3: data.posX -= SPEED; break; //LEFT
  }
  
  //Check for out of bounds.
  var row = this.row, col = this.col;
  if (data.grid.isOutOfBounds(row, col))
  {
    data.dead = true;
    return;
  }
  
  //Update tail position.
  if (data.grid.get(row, col) === this)
  {
    //Safe zone!
    this.tail.fillTail(data.grid);
    this.tail.reposition(row, col);
  }
  //If we are completely in a new cell (not in our safe zone), we add to the tail.
  else if (this.posX % CELL_WIDTH === 0 && this.posY % CELL_WIDTH === 0)
    this.tail.addTail(heading);
}

module.exports = Player;
},{"./color.js":1,"./grid.js":3,"./stack.js":5}],5:[function(require,module,exports){


function Stack(initSize)
{
  var len = 0;
  var arr = [];
  
  this.ensureCapacity = function(size)
  {
    arr.length = Math.max(arr.length, size || 0);
  };
  
  this.push = function(ele)
  {
    this[len] = ele;
    len++;
  };
  
  this.pop = function()
  {
    if (len === 0)
      return;
    len--;
    var tmp = this[len];
    this[len] = undefined;
    return tmp;
  };
  
  this.isEmpty = function() {
    return len === 0;
  }
  
  this.ensureCapacity(initSize);
  
  
  Object.defineProperty(this, "length", {
    get: function() {return len;}
  });
}

module.exports = Stack;
},{}]},{},[2]);

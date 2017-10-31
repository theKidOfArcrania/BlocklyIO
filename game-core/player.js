var Stack = require("./stack");
var Color = require("./color");
var Grid = require("./grid.js");
var consts = require("./game-consts.js");

var GRID_SIZE = consts.GRID_SIZE;
var CELL_WIDTH = consts.CELL_WIDTH;
var NEW_PLAYER_LAG = 60; //wait for a second at least.

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
    sdata.tail.forEach(function(val) {
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
  return {
    tail: data.tail,
    startRow: data.startRow,
    startCol: data.startCol
  };
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
    prev.move += count - 1;
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

function fillTail(data)
{
  if (data.tail.length === 0)
    return;
  
  function onTail(c) { return data.tailGrid[c[0]] && data.tailGrid[c[0]][c[1]]; }
  
  var grid = data.grid;
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
  function onTail(c) { return data.tailGrid[c[0]] && data.tailGrid[c[0]][c[1]]; }
  
  var start = [row, col];
  if (grid.isOutOfBounds(row, col) || been.get(row, col) || onTail(start) || grid.get(row, col) === data.player)
      return; //Avoid allocating too many resources.
  
  var coords = [];
  var filled = new Stack(GRID_SIZE * GRID_SIZE + 1);
  var surrounded = true;
  
  coords.push(start);
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

var SPEED = 5;
var SHADOW_OFFSET = 10;

function Player(grid, sdata) {
  var data = {};
  
  //Parameters
  data.num = sdata.num;
  data.name = sdata.name || ""; //|| "Player " + (data.num + 1);
  data.grid = grid;
  data.posX = sdata.posX;
  data.posY = sdata.posY;
  this.heading = data.currentHeading = sdata.currentHeading; //0 is up, 1 is right, 2 is down, 3 is left.
  data.waitLag = sdata.waitLag || 0;
  data.dead = false;
  
  //Only need colors for client side.
  var base;
  if (sdata.base)
    base = this.baseColor = sdata.base instanceof Color ? sdata.base : Color.fromData(sdata.base);
  else
  {
    var hue = Math.random();
    this.baseColor = base = new Color(hue, .8, .5);
  }
  this.lightBaseColor = base.deriveLumination(.1);
  this.shadowColor = base.deriveLumination(-.3);
  this.tailColor = base.deriveLumination(.3).deriveAlpha(.5);
  
  //Tail requires special handling.
  this.grid = grid; //Temporary
  if (sdata.tail) 
    data.tail = new Tail(this, sdata.tail);
  else 
  {
    data.tail = new Tail(this);
    data.tail.reposition(calcRow(data), calcCol(data));
  }
  
  //Instance methods.
  this.move = move.bind(this, data);
  this.die = function() { data.dead = true;};
  this.serialData = function() {
    return {
      base: this.baseColor,
      num: data.num,
      name: data.name,
      posX: data.posX,
      posY: data.posY,
      currentHeading: data.currentHeading,
      tail: data.tail.serialData(),
      waitLag: data.waitLag
    };
  };
  
  //Read-only Properties.
  defineAccessorProperties(this, data, "currentHeading", "dead", "name", "num", "posX", "posY", "grid", "tail", "waitLag");
  Object.defineProperties(this, {
    row: defineGetter(function() { return calcRow(data); }),
    col: defineGetter(function() { return calcCol(data); })
  });
}

//Gets the next integer in positive or negative direction.
function nearestInteger(positive, val)
{
  return positive ? Math.ceil(val) : Math.floor(val);
}

function calcRow(data)
{
  return nearestInteger(data.currentHeading === 2 /*DOWN*/, data.posY / CELL_WIDTH);
}

function calcCol(data)
{
  return nearestInteger(data.currentHeading === 1 /*RIGHT*/, data.posX / CELL_WIDTH);
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
  grd.addColorStop(1, new Color(0, 0, 1, fade).rgbString());
  ctx.fillStyle = grd;
  ctx.fillRect(this.posX - 1, this.posY - SHADOW_OFFSET, CELL_WIDTH + 2, CELL_WIDTH);
  
  //Render name
  ctx.fillStyle = this.shadowColor.deriveAlpha(fade).rgbString();
  ctx.textAlign = "center";
  
  var yoff = -SHADOW_OFFSET * 2;
  if (this.row === 0)
    yoff = SHADOW_OFFSET * 2 + CELL_WIDTH;
  ctx.font = "18px Changa";
  ctx.fillText(this.name, this.posX + CELL_WIDTH / 2, this.posY + yoff);
};


function move(data)
{
  if (data.waitLag < NEW_PLAYER_LAG)
  {
    data.waitLag++;
    return;
  }
  
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
    this.tail.fillTail();
    this.tail.reposition(row, col);
  }
  //If we are completely in a new cell (not in our safe zone), we add to the tail.
  else if (this.posX % CELL_WIDTH === 0 && this.posY % CELL_WIDTH === 0)
    this.tail.addTail(heading);
}

module.exports = Player;



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
var Tail = (function() {
  var CELL_WIDTH = 30;
  var GRID_SIZE = 200;
  
  function TailMove(orientation)
  {
    this.move = 1;
    Object.defineProperty(this, "orientation", {
      value: orientation,
      enumerable: true
    });
  }
  
  function Tail(player)
  {
    var _this = this;
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
    this.addTail = addTail.bind(this, data);
    this.hitsTail = hitsTail.bind(this, data);
    this.render = function(ctx) {var prev = []; iterate(data, render.bind(_this, data, prev, ctx), VOID); };
    this.move = move.bind(this, data);
    Object.defineProperty(this, "moves", {
      get: function() {return data.tail.slice(0);},
      enumerable: true
    });
  }
  
  //Instance methods.
  function addTail(data, orientation)
  {
    var prev = data.prev;
    var tail = data.tail;
    if (!prev || prev.orientation !== orientation)
    {
      prev = data.prev = new TailMove(orientation);
      data.tail.push(prev);
    }
    else
      prev.move++;
    
    var r = data.prevRow, c = data.prevCol;
    if (!data.tailGrid[r])
      data.tailGrid[r] = [];
    data.tailGrid[r][c] = true;
    
    switch (orientation)
    {
      case 0: data.prevRow--; break; //UP
      case 1: data.prevCol++; break; //RIGHT
      case 2: data.prevRow++; break; //DOWN
      case 3: data.prevCol--; break; //LEFT
    }
  }
  
  function iterate(data, callback, reducer)
  {
    var r = data.startRow;
    var c = data.startCol; 
    var other;
    
    var val;
    for (var i = 0; i < data.tail.length; i++) {
      var sr = r;
      var sc = c;
      switch (data.tail[i].orientation)
      {
        case 0: r -= data.tail[i].move; break; //UP
        case 1: c += data.tail[i].move; break; //RIGHT
        case 2: r += data.tail[i].move; break; //DOWN
        case 3: c -= data.tail[i].move; break; //LEFT
      }
      
      if (i === 0)
        val = {shortCircuit: false, value: callback(sr, sc, r - sr, c - sc)};
      else
        val = reducer(val, callback(sr, sc, r - sr, c - sc));
      if (val.shortCircuit)
        return val.value;
      else
        val = val.value;
    }
    return val;
  }
  
  function move(data, row, col)
  {
    data.prevRow = data.startRow = row;
    data.prevCol = data.startCol = col;
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
  
  function render(data, prev, ctx, srow, scol, drow, dcol)
  {
    if (drow === 0 && dcol === 0)
      return;
    if (drow !== 0 && dcol !== 0)
      throw new Error("Invalid tail path.");
    
    ctx.fillStyle = data.player.tailColor;
    
    var startPos = [
      {x: scol * CELL_WIDTH, y: srow * CELL_WIDTH},
      {x: scol * CELL_WIDTH, y: srow * CELL_WIDTH}
    ];
    var finishPos = [
      {x: (scol + dcol) * CELL_WIDTH, y: (srow + drow) * CELL_WIDTH},
      {x: (scol + dcol) * CELL_WIDTH, y: (srow + drow) * CELL_WIDTH}
    ];
    
    if (drow === 0)
    {
      startPos[1].y += CELL_WIDTH;
      startPos[0].x += CELL_WIDTH * Math.sign(dcol);
      startPos[1].x += CELL_WIDTH * Math.sign(dcol);
      finishPos[1].y += CELL_WIDTH;
    }
    else
    {
      startPos[1].x += CELL_WIDTH;
      startPos[0].y += CELL_WIDTH * Math.sign(drow);
      startPos[1].y += CELL_WIDTH * Math.sign(drow);
      finishPos[1].x += CELL_WIDTH;
    }
    
    if (prev.length != 0)
    {
      //Draw the fold triangle.
      var coords = [];
      var ind = 0;
      for (var i = 0; i < startPos.length; i++)
        for (var j = 0; j < prev.length; j++)
          if (startPos[i].x === prev[j].x || startPos[i].y === prev[j].y)
            coords = [startPos[i], startPos[(i == 0 ? 1 : 0)], prev[(j == 0 ? 1 : 0)]];
      
      for (i = 0; i < 2; i++)
      {
        ctx.moveTo(coords[0].x, coords[0].y);
        ctx.lineTo(coords[1].x, coords[1].y);
        ctx.lineTo(coords[2].x, coords[2].y);
        ctx.closePath();
        ctx.fill();
      }
    }
    else 
    {
      //Draw starting rectangle.
      fillNegRect(ctx, scol * CELL_WIDTH, srow * CELL_WIDTH, 
        CELL_WIDTH * (dcol >= 0 ? 1 : 0), CELL_WIDTH * (drow >= 0 ? 1 : 0));
    }
    
    //Draw main tail line.
    var x = startPos[0].x, y = startPos[0].y;
    fillNegRect(ctx, x, y, finishPos[1].x - x, finishPos[1].y - y);
    
    prev[0] = finishPos[0];
    prev[1] = finishPos[1];
  }
  
  function fillNegRect(ctx, x, y, width, height)
  {
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
  
  function hitsTail(data, other)
  {
    var r = data.prevRow;
    var c = data.prevCol; 
    return !!(data.tailGrid[other.row] && data.tailGrid[other.row][other.col]);
  }
  
  function VOID()
  {
    return {shortCircuit: false, value: undefined};
  }
  
  //Helper methods.
  function inRange(check, a, b)
  {
    if (a === b)
      return a === check;
    else if (a < b)
      return a <= check && check < b;
    else
      return b <= check && check < a;
  }
  
  return Tail;
}());
var Player = (function() {
  var CELL_WIDTH = 30;
  var SPEED = 5;
  var SHADOW_OFFSET = 10;
  
  function Player(socket, grid, num) {
    var data = {};
    
    //TODO: load player data and color.
    
    var hue = Math.random();
    var base = hslToRgb(hue, .8, .5);
    this.baseColor = rgbString(base);
    this.shadowColor = rgbString(hslToRgb(hue, .8, .2));
    base[3] = .5;
    this.tailColor = rgbaString(base);
    
    this.name = 'Player ' + (num + 1);
    
    data.grid = grid;
    data.curHeading = 0;
    data.row = Math.floor(Math.random() * 20) + 10;
    data.col = num;
    data.dead = false;
    
    data.tail = new Tail(this);
    data.tail.move(data.row, data.col);
    
    //Positions
    this.heading = 0; //0 is up, 1 is right, 2 is down, 3 is left.
    this.posX = data.col * CELL_WIDTH;
    this.posY = data.row * CELL_WIDTH;
    this.move = move.bind(this, data);
    
    //Properties.
    Object.defineProperties(this, {
      currentHeading: defineGetter(function() {return data.curHeading;}),
      dead: defineGetter(function() {return !!data.dead;}),
      row: defineGetter(function() {return data.row;}),
      col: defineGetter(function() {return data.col;}),
      num: defineGetter(function() {return num;}),
      tail:  defineGetter(function() {return data.tail;})
    });
  }
  
  //Instance methods
  Player.prototype.render = function(ctx)
  {
    //Render tail.
    function a() {};
    this.tail.render({
      moveTo: a, lineTo: a, closePath: a, fill: a, stroke: a, fillRect : a
    }/*ctx*/);
    
    //Render player.
    ctx.fillStyle = this.shadowColor;
    ctx.fillRect(this.posX, this.posY, CELL_WIDTH, CELL_WIDTH);
    ctx.fillStyle = this.baseColor;
    ctx.fillRect(this.posX, this.posY - SHADOW_OFFSET, CELL_WIDTH, CELL_WIDTH);
  }
  
  function move(data)
  {
    //Move to new position.
    var heading = this.heading;
    var row = Math.floor(this.posY / CELL_WIDTH);
    var col = Math.floor(this.posX / CELL_WIDTH);
    
    if (this.posX % CELL_WIDTH !== 0 || this.posY % CELL_WIDTH !== 0)
      heading = data.curHeading;
    switch (heading)
    {
      case 0: //UP
        this.posY -= SPEED;
        row = Math.floor(this.posY / CELL_WIDTH);
        break;
      case 1: //RIGHT
        this.posX += SPEED;
        col = Math.floor(this.posX / CELL_WIDTH);
        break;
      case 2: //DOWN
        this.posY += SPEED;
        row = Math.ceil(this.posY / CELL_WIDTH);
        break;
      case 3: //LEFT
        this.posX -= SPEED;
        col = Math.ceil(this.posX / CELL_WIDTH);
    }
    
    //Update front position.
    data.row = row;
    data.col = col;
    
    if (row < 0 || row > data.grid.length || col < 0 || col > data.grid[row].length)
    {
      data.dead = true;
      return;
    }
    
    if (data.grid[row][col] === this)
    {
      //Safe zone!
      var tail = this.tail.move(row, col);
      if (tail)
      {
        //TODO: floodfill area.
      }
    }
    //If we are completely in a new cell (not in our safe zone), we add to the tail.
    else if (this.posX % CELL_WIDTH === 0 && this.posY % CELL_WIDTH === 0)
      this.tail.addTail(heading);
    
    data.curHeading = heading;
  }
  
  //Helper methods.
  function defineGetter(getter) {
    return {
      get: getter,
      enumerable: true
    };
  }
  
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
      }

      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  function rgbString(rgb) {
    return 'rgb(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ')';
  }
  
  function rgbaString(rgb) {
    return 'rgba(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ', ' + rgb[3] + ')';
  }
  
  return Player;
})();

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
  for (var p = 0; p < 9; p++)
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
      if (Math.random() < 1)
        grid[r][c] = -1;
      else
        grid[r][c] = players[getRandomInt(0, players.length)];
    }
  }

  var frameCount = 0;
  var animateTo = [0, 0];
  var offset = [0, 0];
  
  
  function update()
  {
    //Change grid offsets.
    for (var i = 0; i < 1; i++)
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
            areaI = area(players[i]);
            areaJ = area(players[j]);
            
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
        dead.push(val);
      return !removing[i];
    });
    
    dead.forEach(function(val) {
      console.log(val.name + " is dead");
    });
    
    //TODO: animate dead, and if this player is dead.
    //TODO: Center on player.
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
  
  function modRotate(val, mod)
  {
    var res = val % mod;
    if (res >= 0)
      return res;
    else
      return mod + res;
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
    
    //TODO: current player index, and notify server.
    players[0].heading = newHeading;
    e.preventDefault();
  });
});
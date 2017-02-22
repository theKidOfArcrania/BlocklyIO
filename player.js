var Stack;
if (!Stack)
  throw new Error("Require stack.js");

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
    this.fillTail = fillTail.bind(this, data);
    this.render = render.bind(this, data);
    this.move = move.bind(this, data);
    Object.defineProperty(this, "moves", {
      get: function() {return data.tail.slice(0);},
      enumerable: true
    });
  }
  
  //Instance methods.
  function setTailGrid(data, tailGrid, r, c)
  {
    if (!tailGrid[r])
      tailGrid[r] = [];
    tailGrid[r][c] = true;
    
  }
  
  function addTail(data, orientation)
  {
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
      prev.move++;

    var pos = walk([data.prevRow, data.prevCol], null, orientation, 1);
    data.prevRow = pos[0];
    data.prevCol = pos[1];
    setTailGrid(data, data.tailGrid, pos[0], pos[1]);
  }
  
  function move(data, row, col)
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
  
  
  function render2(data, ctx)
  {
    ctx.fillStyle = data.player.tailColor;
    for (var r = 0; r < data.tailGrid.length; r++)
    {
      if (!data.tailGrid[r])
        continue;
      for (var c = 0; c < data.tailGrid[r].length; c++)
        if (data.tailGrid[r][c])
          ctx.fillRect(c * CELL_WIDTH, r * CELL_WIDTH, CELL_WIDTH, CELL_WIDTH);
    }
  }
  
  function render(data, ctx)
  {
    ctx.fillStyle = data.player.tailColor;
    
    var prevOrient = -1;
    var start = [data.startRow, data.startCol];
    
    fillTailRect(ctx, start, start);
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
    var been = new Array(grid.length);
    var coords = [];
    
    coords.push(start);
    while (coords.length > 0) //BFS for all tail spaces.
    {
      var coord = coords.shift();
      var r = coord[0];
      var c = coord[1];
      
      if (r < 0 || c < 0 || r >= grid.length || c >= grid[r].length)
        continue; //Out of bounds!
      
      if (been[r] && been[r][c])
        continue;
      
      if (onTail(coord)) //on the tail.
      {
        if (!been[r])
          been[r] = new Array(grid[r].length);
        been[r][c] = true;
        grid[r][c] = data.player;
        
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
      
      if (r < 0 || c < 0 || r >= grid.length || c >= grid[r].length)
      {
        surrounded = false;
        continue; //Out of bounds!
      }
      
      //End this traverse on boundaries (where we been, on the tail, and when we enter our territory)
      if ((been[r] && been[r][c]) || onTail(coord) || grid[r][c] === data.player)
        continue;
        
      if (!been[r])
        been[r] = new Array(grid[r].length);
      been[r][c] = true;
      
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
        grid[coord[0]][coord[1]] = data.player;
      }
    }
    
    return surrounded;
  }
  
  function hitsTail(data, other)
  {
    return (data.prevRow !== other.row || data.prevCol !== other.col) && 
      !!(data.tailGrid[other.row] && data.tailGrid[other.row][other.col]);
  }
  
  return Tail;
}());
this.Player = (function() {
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
    data.curHeading = 2;
    data.row = Math.floor(Math.random() * 10) + 10;
    data.col = 10;//num;
    data.dead = false;
    
    data.tail = new Tail(this);
    data.tail.move(data.row, data.col);
    
    //Positions
    this.heading = 0; //0 is up, 1 is right, 2 is down, 3 is left.
    this.posX = data.col * CELL_WIDTH;
    this.posY = data.row * CELL_WIDTH;
    this.move = move.bind(this, data);
    this.die = function() {data.dead = true;};
    
    //Properties.
    Object.defineProperties(this, {
      currentHeading: defineGetter(function() {return data.curHeading;}),
      dead: defineGetter(function() {return !!data.dead;}),
      row: defineGetter(function() {return data.row;}),
      col: defineGetter(function() {return data.col;}),
      num: defineGetter(function() {return num;}),
      tail:  defineGetter(function() {return data.tail;}),
    });
  }
  
  //Instance methods
  Player.prototype.render = function(ctx)
  {
    //Render tail.
    this.tail.render(ctx);
    
    //Render player.
    ctx.fillStyle = this.shadowColor;
    ctx.fillRect(this.posX, this.posY, CELL_WIDTH, CELL_WIDTH);
    
    var mid = CELL_WIDTH / 2;
    var grd = ctx.createRadialGradient(this.posX + mid, this.posY + mid - SHADOW_OFFSET, 1,
              this.posX + mid, this.posY + mid - SHADOW_OFFSET, CELL_WIDTH);
    grd.addColorStop(0, this.baseColor);
    grd.addColorStop(1, "white");
    ctx.fillStyle = grd;
    ctx.fillRect(this.posX, this.posY - SHADOW_OFFSET, CELL_WIDTH, CELL_WIDTH);
  };
  
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
        col = Math.ceil(this.posX / CELL_WIDTH);
        break;
      case 2: //DOWN
        this.posY += SPEED;
        row = Math.ceil(this.posY / CELL_WIDTH);
        break;
      case 3: //LEFT
        this.posX -= SPEED;
        col = Math.floor(this.posX / CELL_WIDTH);
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
      this.tail.fillTail(data.grid);
      this.tail.move(row, col);
    }
    //If we are completely in a new cell (not in our safe zone), we add to the tail.
    else if (this.posX % CELL_WIDTH === 0 && this.posY % CELL_WIDTH === 0)
    {
      this.tail.addTail(heading);
    }
    
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
      };

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
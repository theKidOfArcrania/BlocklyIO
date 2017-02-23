this.Grid = (function()
{
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
  
  return Grid;
})()
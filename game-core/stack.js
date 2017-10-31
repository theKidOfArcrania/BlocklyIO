

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
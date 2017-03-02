
function Rolling(value, maxSpeed)
{
  var lag = 0;
  
  if (!maxSpeed)
    maxSpeed = 5;
  
  this.value = value;
  
  Object.defineProperty(this, "lag", {
    get: function() { return lag; },
    enumerable: true
  });
  this.update = function() {
    var delta = value - lag;
    var dir = Math.sign(delta);
    var mag = Math.min(Math.abs(maxSpeed), Math.abs(delta));
    
    lag += mag * dir;
    return lag;
  }
}

module.exports = Rolling;



function Rolling(value, frames)
{
  var lag = 0;
  
  if (!frames)
    frames = 24;
  
  this.value = value;
  
  Object.defineProperty(this, "lag", {
    get: function() { return lag; },
    enumerable: true
  });
  this.update = function() {
    var delta = this.value - lag;
    var dir = Math.sign(delta);
    var speed = Math.abs(delta) / frames;
    var mag = Math.min(Math.abs(speed), Math.abs(delta));
    
    lag += mag * dir;
    return lag;
  }
}

module.exports = Rolling;


var inherits = require('util').inherits;  
var EventEmitter = require('events').EventEmitter;

module.exports = Gate;

function Gate(awaiting)
{
  var _this = this;
  if (!(this instanceof Gate)) 
    return new Gate(awaiting);
  
  if (typeof awaiting !== "number") 
    awaiting = 0;
  
  var currentAwaiting = awaiting;
  var readyCount = 0;
  var ready = new Array(currentAwaiting);
  
  this.setAwaiting = function(count) {
    awaiting = count;
  };
  this.ready = function(ind) {
    if (Math.floor(ind) != ind || ind >= readyCount)
      return false;
    
    ready[ind] = true;
    readyCount++;
    
    _this.emit("ready", ind);
    if (readyCount >= currentAwaiting)
    {
      _this.emit("allReady");
      _this.reset();
    }
    
    return true;
  };
  this.reset = function() {
    _this.emit("reset");
    ready = new Array(currentAwaiting = awaiting);
    readyCount = 0;
  };
  
  EventEmitter.call(this);
}

inherits(Gate, EventEmitter);
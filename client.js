var core = require('./game-core');
var Player = core.Player;

var io = require('socket.io-client');

var GRID_SIZE = core.GRID_SIZE;
var CELL_WIDTH = core.CELL_WIDTH;

var running = false;
var user, socket, frame;
var players, allPlayers;

var kills;

var timeout = undefined;
var dirty = false;
var deadFrames = 0;
var requesting = -1; //frame that we are requesting at.
var frameCache = []; //Frames after our request.

var allowAnimation = true;

var grid = new core.Grid(core.GRID_SIZE, function(row, col, before, after) {
  invokeRenderer('updateGrid', [row, col, before, after]);
}); 

/**
 * Provides requestAnimationFrame in a cross browser way. (edited so that this is also compatible with node.)
 * @author paulirish / http://paulirish.com/
 */
// window.requestAnimationFrame = function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
//       window.setTimeout( callback, 1000 / 60 );
//     };

var hasWindow;
try {
  window.document;
  hasWindow = true;
} catch (e) {
  hasWindow = false;
}

var requestAnimationFrame;
if ( !requestAnimationFrame ) {
  requestAnimationFrame = ( function() {
    if (hasWindow) {
      return window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
        setTimeout( callback, 1000 / 60 );
      };
    } else {
      return function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
        setTimeout( callback, 1000 / 60 );
      };
    }
  })();
}

//Public API
function connectGame(url, name, callback) {
  if (running)
    return; //Prevent multiple runs.
  running = true;
  
  user = null;
  deadFrames = 0;
  
  //Socket connection.
  io.j = [];
  io.sockets = [];
  socket = io(url, {
    'forceNew': true,
    upgrade: false,
    transports: ['websocket']
  });
  socket.on('connect', function(){
    console.info('Connected to server.');
  });
  socket.on('game', function(data) {
    if (timeout != undefined)
      clearTimeout(timeout);
    
    //Initialize game.
    //TODO: display data.gameid --- game id #
    frame = data.frame;
    
    reset();
    
    //Load players.
    data.players.forEach(function(p) {
      var pl = new Player(grid, p);
      addPlayer(pl);
    });
    user = allPlayers[data.num];
    if (!user) 
      throw new Error();
    setUser(user);
    
    //Load grid.
    var gridData = new Uint8Array(data.grid);
    for (var r = 0; r < grid.size; r++)
      for (var c = 0; c < grid.size; c++)
      {
        var ind = gridData[r * grid.size + c] - 1;
        grid.set(r, c, ind === -1 ? null : players[ind]);
      }
    
    invokeRenderer('paint', []);
    frame = data.frame;
    
    if (requesting !== -1)
    {
      //Update those cache frames after we updated game.
      var minFrame = requesting;
      requesting = -1;
      while (frameCache.length > frame - minFrame)
        processFrame(frameCache[frame - minFrame]);
      frameCache = [];
    }
  });
  
  socket.on('notifyFrame', processFrame);
  
  socket.on('dead', function() {
    socket.disconnect(); //In case we didn't get the disconnect call.
  });
  
  socket.on('disconnect', function(){
    if (!user)
      return;
    console.info('Server has disconnected. Creating new game.');
    socket.disconnect();
    user.die();
    dirty = true;
    paintLoop();
    running = false;
    invokeRenderer('disconnect', []);
  });
  
  socket.emit('hello', {
    name: name,
    type: 0, //Free-for-all
    gameid: -1 //Requested game-id, or -1 for anyone.
  }, function(success, msg) {
    if (success) 
      console.info('Connected to game!');
    else {
      console.error('Unable to connect to game: ' + msg);
      running = false;
    }
    if (callback)
      callback(success, msg);
  });
  
  
}

function changeHeading(newHeading) {
  if (!user || user.dead)
    return;
  if (newHeading === user.currentHeading || ((newHeading % 2 === 0) ^ 
    (user.currentHeading % 2 === 0)))
  {
    //user.heading = newHeading;
    if (socket) {
      socket.emit('frame', {
        frame: frame,
        heading: newHeading
      }, function(success, msg) {
        if (!success)
          console.error(msg);
      });
    }
  }
}

function getUser() {
  return user;
}

function getOthers() {
  var ret = [];
  for (var p of players) {
    if (p !== user) {
      ret.push(p);
    }
  }
  return ret;
}

function getPlayers() {
  return players.slice();
}

//Private API
function addPlayer(player) {
  if (allPlayers[player.num])
    return; //Already added.
  allPlayers[player.num] = players[players.length] = player;
  invokeRenderer('addPlayer', [player]);
  return players.length - 1;
}

function invokeRenderer(name, args) {
  var renderer = exports.renderer;
  if (renderer && typeof renderer[name] === 'function')
    renderer[name].apply(exports, args);
}


function processFrame(data)
{
  if (timeout != undefined)
      clearTimeout(timeout);
    
  if (requesting !== -1 && requesting < data.frame)
  {
    frameCache.push(data);
    return;
  }
  
  if (data.frame - 1 !== frame)
  {
    console.error('Frames don\'t match up!');
    socket.emit('requestFrame'); //Restore data.
    requesting = data.frame;
    frameCache.push(data);
    return;
  }
  
  frame++;
  if (data.newPlayers)
  {
    data.newPlayers.forEach(function(p) {
      if (p.num === user.num)
        return;
      var pl = new Player(grid, p);
      addPlayer(pl);
      core.initPlayer(grid, pl);
    });
  }
  
  var found = new Array(players.length);
  data.moves.forEach(function(val, i) {
    var player = allPlayers[val.num];
    if (!player) return;
    if (val.left) player.die();
    found[i] = true;
    player.heading = val.heading;
  });
  for (var i = 0; i < players.length; i++)
  {
    //Implicitly leaving game.
    if (!found[i])
    {
      var player = players[i];
      player && player.die();
    }
  }
  
  update();
  
  var locs = {};
  for (var i = 0; i < players.length; i++)
  {
    var p = players[i];
    locs[p.num] = [p.posX, p.posY, p.waitLag];
  }
  
  /*
  socket.emit('verify', {
    frame: frame,
    locs: locs
  }, function(frame, success, adviceFix, msg) {
    if (!success && requesting === -1) 
    {
      console.error(frame + ': ' + msg);
      if (adviceFix)
        socket.emit('requestFrame');
    }
  }.bind(this, frame));
  */
  
  dirty = true;
  requestAnimationFrame(function() {
    paintLoop();
  });
  timeout = setTimeout(function() {
    console.warn('Server has timed-out. Disconnecting.');
    socket.disconnect();
  }, 3000);
}

function paintLoop()
{
  if (!dirty)
    return;
  invokeRenderer('paint', []);
  dirty = false;
  
  if (user && user.dead)
  {
    if (timeout)
      clearTimeout(timeout);
    if (deadFrames === 60) //One second of frame
    {
      var before =allowAnimation;
      allowAnimation = false;
      update();
      invokeRenderer('paint', []);
      allowAnimation = before;
      user = null;
      deadFrames = 0;
      return;
    }
    
    socket.disconnect();
    deadFrames++;
    dirty = true;
    update();
    requestAnimationFrame(paintLoop);
  }
}

function reset() {
  user = null;
  
  grid.reset();
  players = [];
  allPlayers = [];
  kills = 0;
  
  invokeRenderer('reset');
}

function setUser(player) {
  user = player;
  invokeRenderer('setUser', [player]);
}

function update() {
  var dead = [];
  core.updateFrame(grid, players, dead, function addKill(killer, other)
  {
    if (players[killer] === user && killer !== other)
      kills++;
  });
  dead.forEach(function(val) {
    console.log((val.name || 'Unnamed') + ' is dead');
    delete allPlayers[val.num];
    invokeRenderer('removePlayer', [val]);
  });
  
  invokeRenderer('update', [frame]);
}

//Export stuff
var funcs = [connectGame, changeHeading, getOthers, getPlayers, getUser];
funcs.forEach(function (f) {
  exports[f.name] = f;
});

exports.renderer = null;
Object.defineProperties(exports, {
  allowAnimation: {
    get: function() { return allowAnimation; },
    set: function(val) { allowAnimation = !!val; },
    enumerable: true
  },
  grid: {
    get: function() { return grid; },
    enumerable: true
  },
  kills: {
    get: function() { return kills; },
    enumerable: true
  }
});

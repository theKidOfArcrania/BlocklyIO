var ANIMATE_FRAMES = 24;
var CELL_WIDTH = 40;

//TODO: remove constants.
exports.initPlayer = function(grid, player)
{
  for (var dr = -1; dr <= 1; dr++)
    for (var dc = -1; dc <= 1; dc++)
      if (!grid.isOutOfBounds(dr + player.row, dc + player.col))
        grid.set(dr + player.row, dc + player.col, player);
};
exports.updateFrame = function(grid, players, dead, notifyKill)
{
  var adead = [];
  if (dead instanceof Array)
    adead = dead;
  
  var kill;
  if (!notifyKill)
    kill = function() {};
  else
    kill = function(killer, other) {if (!removing[other]) notifyKill(killer, other);};
  
  //Move players.  
  var tmp = players.filter(function(val) {
    val.move();
    if (val.dead)
      adead.push(val);
    return !val.dead;
  });
  
  //Remove players with collisions.
  var removing = new Array(players.length);
  for (var i = 0; i < players.length; i++)
  {
    for (var j = i; j < players.length; j++)
    {
      
      //Remove those players when other players have hit their tail.
      if (!removing[j] && players[j].tail.hitsTail(players[i]))
      {
        kill(i, j);
        removing[j] = true;
        //console.log("TAIL");
      }
      if (!removing[i] && players[i].tail.hitsTail(players[j]))
      {
        kill(j, i);
        removing[i] = true;
        //console.log("TAIL");
      }
      
      //Remove players with collisons...
      if (i !== j && squaresIntersect(players[i].posX, players[j].posX) &&
        squaresIntersect(players[i].posY, players[j].posY))
      {
        //...if one player is own his own territory, the other is out.
        if (grid.get(players[i].row, players[i].col) === players[i])
        {
          kill(i, j);
          removing[j] = true;
        }
        else if (grid.get(players[j].row, players[j].col) === players[j])
        {
          kill(j, i);
          removing[i] = true;
        }
        else
        {
          //...otherwise, the one that sustains most of the collision will be removed.
          var areaI = area(players[i]);
          var areaJ = area(players[j]);
          
          if (areaI === areaJ)
          {
            kill(i, j);
            kill(j, i);
            removing[i] = removing[j] = true;
          }
          else if (areaI > areaJ)
          {
            kill(j, i);
            removing[i] = true;
          }
          else
          {
            kill(i, j);
            removing[j] = true;
          }
        }
      }
    }
  }
  
  tmp = tmp.filter(function(val, i) {
    if (removing[i])
    {
      adead.push(val);
      val.die();
    }
    return !removing[i];
  });
  players.length = tmp.length;
  for (var i = 0; i < tmp.length; i++)
    players[i] = tmp[i];
  
  //Remove dead squares.
  for (var r = 0; r < grid.size; r++)
  {
    for (var c = 0; c < grid.size; c++)
    {
      if (adead.indexOf(grid.get(r, c)) !== -1)
        grid.set(r, c, null);
    }
  }
};

function squaresIntersect(a, b)
{
  if (a < b)
    return b < a + CELL_WIDTH;
  else
    return a < b + CELL_WIDTH;
}

function area(player)
{
  var xDest = player.col * CELL_WIDTH;
  var yDest = player.row * CELL_WIDTH;
  
  if (player.posX === xDest)
    return Math.abs(player.posY - yDest);
  else
    return Math.abs(player.posX - xDest);
}
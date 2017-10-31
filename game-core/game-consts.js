function constant(val) {
  return {
    value: val,
    enumerable: true
  };
}

var consts = {
  GRID_SIZE: constant(80),
  CELL_WIDTH: constant(40),
  SPEED: constant(5),
  BORDER_WIDTH: constant(20),
  MAX_PLAYERS: constant(81)
};

Object.defineProperties(module.exports, consts);

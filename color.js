

function Color(h, s, l, a)
{
  verifyRange(h, s, l);
  if (a === undefined) a = 1;
  else verifyRange(a);
  
  Object.defineProperties(this, {
    "hue": {value: h, enumerable: true},
    "sat": {value: s, enumerable: true},
    "lum": {value: l, enumerable: true},
    "alpha": {value: a, enumerable: true},
  });
}

Color.fromData = function(data) {
  return new Color(data.hue, data.sat, data.lum, data.alpha);
};

function verifyRange()
{
  for (var i = 0; i < arguments.length; i++)
  {
    if (arguments[i] < 0 || arguments[i] > 1)
      throw new RangeError("H, S, L, and A parameters must be between the range [0, 1]");
  }
}

Color.prototype.interpolateToString = function(color, amount)
{
  var rgbThis = hslToRgb(this.hue, this.sat, this.lum);
  var rgbThat = hslToRgb(color.hue, color.sat, color.lum);
  var rgb = [];
  
  for (var i = 0; i < 3; i++)
    rgb[i] = Math.floor((rgbThat[i] - rgbThis[i]) * amount + rgbThis[i]);
  return {rgbString: function() {return 'rgb(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ')'}};
}

Color.prototype.deriveLumination = function(amount)
{
  var lum = this.lum + amount;
  lum = Math.min(Math.max(lum, 0), 1);
  return new Color(this.hue, this.sat, lum, this.alpha);
};

Color.prototype.deriveHue = function(amount)
{
  var hue = this.hue - amount;
  return new Color(hue - Math.floor(hue), this.sat, this.lum, this.alpha);
};

Color.prototype.deriveSaturation = function(amount)
{
  var sat = this.sat + amount;
  sat = Math.min(Math.max(sat, 0), 1);
  return new Color(this.hue, sat, this.lum, this.alpha);
};

Color.prototype.deriveAlpha = function(newAlpha)
{
  verifyRange(newAlpha);
  return new Color(this.hue, this.sat, this.lum, newAlpha);
};

Color.prototype.rgbString = function() {
  var rgb = hslToRgb(this.hue, this.sat, this.lum);
  rgb[3] = this.a;
  return 'rgba(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ', ' + this.alpha + ')';
};


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

module.exports = Color;
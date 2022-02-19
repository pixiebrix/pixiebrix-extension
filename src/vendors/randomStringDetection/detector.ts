// Apache License, Version 2.0
// Source: https://github.com/Webfit-project/random_string_detection/blob/01a3809c84ce5f1ccc6efe78e74f3dca8b496491/lib/detector.js
// Changes:
// - Drop global prototype changes
// - Drop console.log calls
// - Replace missing isNumber function
// - Add types
// - Automatic Prettier

var consonant = Array(
  "b",
  "c",
  "d",
  "f",
  "g",
  "h",
  "j",
  "k",
  "l",
  "m",
  "n",
  "p",
  "q",
  "r",
  "s",
  "t",
  "v",
  "w",
  "x",
  "y",
  "z"
);
var vowel = Array("a", "e", "i", "o", "u", "y");
var number = Array("0", "1", "2", "3", "4", "5", "6", "7", "8", "9");
var dbl = Array(
  "aj",
  "aq",
  "av",
  "az",
  "cy",
  "dy",
  "eh",
  "ek",
  "fy",
  "gy",
  "ib",
  "if",
  "ih",
  "ii",
  "ij",
  "ik",
  "iq",
  "iu",
  "iv",
  "iw",
  "ix",
  "iy",
  "jy",
  "ko",
  "ku",
  "ky",
  "oc",
  "og",
  "oh",
  "oj",
  "ok",
  "oq",
  "ov",
  "oy",
  "oz",
  "qa",
  "qi",
  "qo",
  "qy",
  "sy",
  "uc",
  "uf",
  "ug",
  "uh",
  "uj",
  "uk",
  "uq",
  "uu",
  "uv",
  "uw",
  "ux",
  "uy",
  "uz",
  "vu",
  "vy",
  "wu",
  "wy",
  "xa",
  "xi",
  "xu",
  "xy",
  "yb",
  "yc",
  "yd",
  "yf",
  "yg",
  "yh",
  "yi",
  "yj",
  "yk",
  "ym",
  "yp",
  "yq",
  "yr",
  "yt",
  "yv",
  "yw",
  "yx",
  "yy",
  "yz"
);
var whitelist = Array("cpl", "srx", "tkt", "pbm", "slp", "ch");

var regex: RegExp = null;
var regexwl: RegExp = null;

function makeRegex(tab: string[]) {
  var strregex = "(";
  for (var i = 0; i < tab.length; i++) {
    if (i == 0) strregex += tab[i];
    else strregex += "|" + tab[i];
  }
  strregex += ")";

  return new RegExp(strregex, "gi");
}

for (var i = 0; i < consonant.length; i++) {
  for (var j = 0; j < consonant.length; j++) {
    dbl.push(consonant[i] + "" + consonant[j]);
  }
}

for (var i = 0; i < vowel.length; i++) {
  for (var j = 0; j < vowel.length; j++) {
    dbl.push(vowel[i] + "" + vowel[j]);
  }
}

for (var i = 0; i < number.length; i++) {
  for (var j = 0; j < number.length; j++) {
    dbl.push(number[i] + "" + number[j]);
  }
}

regex = makeRegex(dbl);
regexwl = makeRegex(whitelist);

export default function detector(str: string, options?: { min: number }) {
  var defaults = { min: 5 };
  var settings = defaults;
  if (typeof options === "object") {
    if (typeof options.min === "number") {
      if (options.min >= 0) {
        settings.min = options.min;
      }
    }
  }

  if (str.length < settings.min) return false;

  var score = 0;
  var result;

  var tab = str.match(/([a-zA-Z\-]{2})(?=(.*?\1){2})/g);

  if (Array.isArray(tab)) {
    tab = [...new Set(tab)];

    var tmpregex = makeRegex(tab);
    while ((result = tmpregex.exec(str))) {
      score++;
    }
  }

  var duplet = "";
  //todo need a better regex
  for (var i = 0; i < str.length - 1; i++) {
    duplet = str.substr(i, 2);
    while ((result = regex.exec(duplet))) {
      score++;
    }
  }

  while ((result = regexwl.exec(str))) {
    if (result[0].length == 3) score = score - 2;
    else if (result[0].length == 2) score--;
  }

  return score / (str.length - 1);
}

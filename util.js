
const CODEPOINT_a = 'a'.codePointAt(0);
const CODEPOINT_1 = '1'.codePointAt(0);

function isString(value) {
  return typeof value === 'string' || value instanceof String;
}

/// Converts algebraic location notation to [rank, file] (0-indexed)
function algebraicToSpace(algebraic) {
  let file = algebraic.toLowerCase().codePointAt(0) - CODEPOINT_a;
  let rank = parseInt(algebraic[1]) - 1;
  return [rank, file];
}

function spaceToAlgebraic([rank, file]) {
  return String.fromCharCode(file + CODEPOINT_a, rank + CODEPOINT_1);
}

function toSpace(location) {
  if (isString(location)) {
    return algebraicToSpace(location);
  }
  else {
    return location
  }
}

function toAlgebraic(location) {
  if (isString(location)) {
    return location;
  }
  else {
    return spaceToAlgebraic(location);
  }
}

function otherColor(color) {
  return color == 'white'? 'black' : 'white';
}

function sameLocation(l1, l2) {
  let [r1, f1] = toSpace(l1);
  let [r2, f2] = toSpace(l2);
  return r1 === r2 && f1 === f2;
}

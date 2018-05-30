
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

function straightLine(l1, l2) {
  let [r1, f1] = toSpace(l1);
  let [r2, f2] = toSpace(l2);

  if (Math.abs(r2 - r1) === Math.abs(f2 - f1) || r1 === r2 || f1 === f2) {
    let rankDir = Math.sign(r2 - r1);
    let fileDir = Math.sign(f2 - f1);

    let path = [];
    let r = r1 + rankDir;
    let f = f1 + fileDir;
    while (r != r2 || f != f2) {
      path.push([r, f]);
      r += rankDir;
      f += fileDir;
    }
    return path;
  }
  else return [];
}

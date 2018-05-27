const WHITE = 'white';
const BLACK = 'black';
const PROTECT = ''; // Falsy sentinel value to mark protected piece

const LMB = 0;
const RMB = 2;
const MMB = 1;

// Quantum states
const ALPHA = 0;
const BETA = 1;

var hoveredPiece = null;
var heldPiece = null;

var armies = {
  white: null,
  black: null
};

var turn = 'white';

// ui elements
var dead, turnIndicator;

function unhighlight(space) {
  space.classList.remove('legal-move', 'threatened');
  for (let piece of space.children) {
    piece.classList.remove('threatened', 'protected');
  }
}

function unhighlightBoard() {
  for (let space of document.getElementsByClassName('board-space')) {
    unhighlight(space);
  }
}

function getSpace(location) {
  return document.getElementById(toAlgebraic(location));
}

function getSpaceFromPoint(x, y) {
  for (let space of document.getElementsByClassName('board-space')) {
    let bounds = space.getBoundingClientRect();
    if (x > bounds.left && x < bounds.right && y > bounds.top && y < bounds.bottom) {
      return space;
    }
  }
  return null;
}

function isInCheck(color) {
  let king = armies[color][0];
  for (let piece of armies[otherColor(color)]) {
    if (piece.alive && piece.canMove(king.location)) {
      return true;
    }
  }
  return false;
}

function wouldBeCheck(color, pieceToMove, destination) {
  let king = armies[color][0];
  for (let piece of armies[otherColor(color)]) {
    if (piece.alive) {
      if (sameLocation(piece.location, destination) && pieceToMove.canMove(destination)) {
        continue; // There might still be another piece keeping you in check
      }
      else if (pieceToMove === king) {
        if (piece.canMove(destination)) {
          return true;
        }
      }
      else if (piece.canMove(king.location, [pieceToMove, destination])) {
        return true;
      }
    }
  }
  return false;
}

function isCheckmate(color) {
  let king = armies[color][0];
  if (isInCheck) {
    for (let piece of armies[color]) {
      if (piece.alive && piece.hasLegalMove()) {
        return false;
      }
    }
    return true;
  }
  else return false;
}

Piece = function() {
  var nextId = function () {
    let idx = 0;
    return function iterator() {
      idx ++;
      return `piece-${idx}`
    }
  }();
  var piecesByIds = {}

  class Piece {
    constructor(color, position) {
      this.id = nextId();
      piecesByIds[this.id] = this;
      this.color = color;
      this.isQuantum = false;
      this.canQuantum = true;
      this.location = toSpace(position);
      this.type = null;
      this.element = null;
      this.qElements = null;
      this.hasMoved = false;
      this.alive = true;
    }

    static byId(id) {
      return piecesByIds[id];
    }

    static at(location, ...hMoves) {
      // hMoves are hypothetical moves that occur beforehand
      let space = getSpace(location);
      if (!space || space.children.length === 0) {
        let [r1, f1] = toSpace(location);
        for (let [pieceToMove, destination] of hMoves) {
          let [r2, f2] = toSpace(destination);
          if (r1 === r2 && f1 === f2) {
            return pieceToMove;
          }
        }
        return null;
      }
      else if (space.children.length === 1) {
        let piece = Piece.byId(space.firstChild.id);
        for (let [pieceToMove, destination] of hMoves) {
          if (piece === pieceToMove) {
            return null;
          }
        }
        return piece;
      }
    }

    initPiece() {
      this.element = document.createElement('div');
      this.element.id = this.id;
      this.element.classList.add('piece', this.color, this.type);

      let self = this;
      let piece = this.element;
      piece.addEventListener('mousedown', function(event) {
        if (event.button === LMB) {
          piece.style['position'] = 'absolute';
          piece.style['left'] = event.x;
          piece.style['top'] = event.y;
          piece.style['transform'] = 'translate(-50%, -50%)';
          piece.style['z-index'] = 10;
          heldPiece = self;
          event.preventDefault();
        }
        if (event.button === RMB) {
          // TODO: split piece
        }
      });
      piece.addEventListener('mouseenter', function(event) {
        hoveredPiece = self;
        self.highlightLegalMoves();
      });
      piece.addEventListener('mouseleave', function(event) {
        if (hoveredPiece === self) {
          unhighlightBoard();
        }
      });
      piece.addEventListener('contextmenu', function(event) {
        event.preventDefault();
      });
    }

    isCapOrGuard(other) {
      return other.color !== this.color? true : PROTECT;
    }

    moveTo(location, switchTurn) {
      if (switchTurn === undefined) {
        switchTurn = true;
      }
      if (this.color === turn) {
        let other = Piece.at(location);
        if (other) {
          other.capture();
        }
        this.location = toSpace(location);
        this.hasMoved = true;
        if (switchTurn) {
          turn = otherColor(this.color);
          turnIndicator.className = turn;
        }
        this.render();
        if (isInCheck(turn)) {
          if (isCheckmate(turn)) {
            window.alert("Checkmate!"); // TEMP
          }
          else {
            window.alert("Check!"); // TEMP
          }
        }
      }
    }

    capture() {
      unhighlight(getSpace(this.location));
      this.location = null;
      this.element.classList.add('captured')
      dead[this.color].append(this.element);
      this.alive = false;
    }

    canMove(location) {
      return false;
    }

    isLegalMove(location) {
      let [rank, file] = toSpace(location);
      let [curRank, curFile] = this.location;

      if (rank === curRank && file === curFile) {
        return false;
      }

      let result = this.canMove(location);
      if (result !== false && wouldBeCheck(this.color, this, location)) {
        return false;
      }
      return result;
    }

    hasLegalMove() {
      for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
          if (this.isLegalMove([rank, file])) {
            return true;
          }
        }
      }
      return false;
    }

    highlightLegalMoves() {
      if (!this.location) return;
      for (let space of document.getElementsByClassName('board-space')) {
        let piece = Piece.at(space.id);
        let legality = this.isLegalMove(space.id);
        if (legality) {
          if (piece) {
            space.classList.add('threatened');
            piece.element.classList.add('threatened');
          }
          else {
            space.classList.add('legal-move');
          }
        }
        else if (legality === PROTECT && piece.type !== 'king') {
          if (piece) { // A bit defensive, but whatever
            piece.element.classList.add('protected');
          }
        }
        else {
          unhighlight(space);
        }
      }
    }

    render() {
      if (!this.isQuantum) {
        let space = document.getElementById(toAlgebraic(this.location));
        if (!this.element) {
          this.initPiece();
        }
        space.append(this.element);
      }
    }
  }
  return Piece;
}();

function canRideToOrtho(piece, [rank, file], ...hMoves) {
  let [curRank, curFile] = piece.location;

  if (rank == curRank) {
    let dir = file > curFile? 1 : -1;
    let diff = Math.abs(file - curFile);
    for (let offset = 1; offset < diff; offset++) {
      let f = curFile + dir * offset;
      if (Piece.at([rank, f])) return false;
    }
    let other = Piece.at([rank, file], ...hMoves);
    if (other) {
      return piece.isCapOrGuard(other);
    }
    else return true;
  }
  else if (file == curFile) {
    let dir = rank > curRank? 1 : -1;
    let diff = Math.abs(rank - curRank);
    for (let offset = 1; offset < diff; offset++) {
      let r = curRank + dir * offset;
      if (Piece.at([r, file])) return false;
    }
    let other = Piece.at([rank, file], ...hMoves);
    if (other) {
      return piece.isCapOrGuard(other);
    }
    else return true;
  }
  else return false;
}

function canRideToDiag(piece, [rank, file], ...hMoves) {
  let [curRank, curFile] = piece.location;

  let rankDiff = rank - curRank;
  let fileDiff = file - curFile;

  if (Math.abs(rankDiff) === Math.abs(fileDiff)) {
    let diff = Math.abs(rankDiff);
    let fileDir = Math.sign(fileDiff);
    let rankDir = Math.sign(rankDiff);
    for (let offset = 1; offset < diff; offset++) {
      let f = curFile + fileDir * offset;
      let r = curRank + rankDir * offset;
      if (Piece.at([r, f], ...hMoves)) return false;
    }
    let other = Piece.at([rank, file], ...hMoves);
    if (other) {
      return piece.isCapOrGuard(other);
    }
    else return true;
  }
  else return false;
}

class King extends Piece {
  constructor(color, position) {
    super(color, position);
    this.type = 'king';
    this.canQuantum = false;
  }

  canMove(location) {
    let [rank, file] = toSpace(location);
    let [curRank, curFile] = this.location;

    // Castling
    if (!this.hasMoved && rank === curRank) {
      // TODO: check that the inbetween space is not threatened
      if (file === curFile + 2 && !isInCheck(this.color)) {
        let maybeRook = Piece.at([rank, 7]);
        if (maybeRook && maybeRook.type === 'rook' && !maybeRook.hasMoved) {
          return !Piece.at([rank, 5]) && !Piece.at([rank, 6]);
        }
      }
      else if (file === curFile - 2 && !isInCheck(this.color)) {
        let maybeRook = Piece.at([rank, 0]);
        if (maybeRook && maybeRook.type === 'rook' && !maybeRook.hasMoved) {
          return !Piece.at([rank, 1]) && !Piece.at([rank, 2]) && !Piece.at([rank, 3]);
        }
      }
    }
    if (
      rank <= curRank + 1 && rank >= curRank - 1
      && file <= curFile + 1 && file >= curFile - 1
    ) {
      let other = Piece.at(location);
      if (other) {
        return this.isCapOrGuard(other);
      }
      else return true;
    }
    else return false;
  }

  moveTo(location, switchTurn) {
    let [rank, file] = toSpace(location);
    let [curRank, curFile] = this.location;

    if (file === curFile + 2) {
      let maybeRook = Piece.at([rank, 7]);
      if (maybeRook && maybeRook.type === 'rook') {
        maybeRook.moveTo([rank, 5], false);
      }
    }
    else if (file === curFile - 2) {
      let maybeRook = Piece.at([rank, 0]);
      if (maybeRook && maybeRook.type === 'rook') {
        maybeRook.moveTo([rank, 3], false);
      }
    }
    super.moveTo(location, switchTurn);
  }
}

class Queen extends Piece {
  constructor(color, position) {
    super(color, position);
    this.type = 'queen';
  }

  canMove(location, ...hMoves) {
    let [rank, file] = toSpace(location);
    let [curRank, curFile] = this.location;

    let ortho = canRideToOrtho(this, [rank, file], ...hMoves);
    if (ortho !== false) return ortho;
    return canRideToDiag(this, [rank, file], ...hMoves);
  }
}

class Bishop extends Piece {
  constructor(color, position) {
    super(color, position);
    this.type = 'bishop';
  }

  canMove(location, ...hMoves) {
    let [rank, file] = toSpace(location);
    let [curRank, curFile] = this.location;

    return canRideToDiag(this, [rank, file], ...hMoves);
  }
}

class Knight extends Piece {
  constructor(color, position) {
    super(color, position);
    this.type = 'knight';
  }

  canMove(location) {
    let [rank, file] = toSpace(location);
    let [curRank, curFile] = this.location;

    let rankDiff = Math.abs(rank - curRank);
    let fileDiff = Math.abs(file - curFile);

    if (rankDiff === 2 && fileDiff === 1 || rankDiff === 1 && fileDiff === 2) {
      let other = Piece.at(location);
      if (other) {
        return this.isCapOrGuard(other);
      }
      else return true;
    }
    else return false;
  }
}

class Rook extends Piece {
  constructor(color, position) {
    super(color, position);
    this.type = 'rook';
  }

  canMove(location, ...hMoves) {
    let [rank, file] = toSpace(location);
    let [curRank, curFile] = this.location;

    return canRideToOrtho(this, [rank, file], ...hMoves);
  }
}

class Pawn extends Piece {
  constructor(color, position) {
    super(color, position);
    this.type = 'pawn';
    this.canQuantum = false;
  }

  canMove(location) {
    let [rank, file] = toSpace(location);
    let [curRank, curFile] = this.location;

    let dir = this.color === 'white'? 1 : -1;

    if (file === curFile) {
      if (!this.hasMoved && rank === curRank + 2 * dir) {
        return !Piece.at(location) && !Piece.at([rank - 1, file]);
      }
      return rank === curRank + dir && !Piece.at(location);
    }
    else if (Math.abs(file - curFile) === 1) {
      // TODO: en passant
      // TODO: promotion
      let other = Piece.at(location);
      return rank === curRank + dir && other && this.isCapOrGuard(other);
    }
    else return false;
  }
}

function newGame() {
  armies = {
    white: [
      new King(WHITE, 'e1'),

      new Rook(WHITE,   'a1'),
      new Knight(WHITE, 'b1'),
      new Bishop(WHITE, 'c1'),
      new Queen(WHITE,  'd1'),
      new Bishop(WHITE, 'f1'),
      new Knight(WHITE, 'g1'),
      new Rook(WHITE,   'h1'),

      new Pawn(WHITE, 'a2'),
      new Pawn(WHITE, 'b2'),
      new Pawn(WHITE, 'c2'),
      new Pawn(WHITE, 'd2'),
      new Pawn(WHITE, 'e2'),
      new Pawn(WHITE, 'f2'),
      new Pawn(WHITE, 'g2'),
      new Pawn(WHITE, 'h2'),
    ],
    black: [
      new King(BLACK, 'e8'),

      new Pawn(BLACK, 'a7'),
      new Pawn(BLACK, 'b7'),
      new Pawn(BLACK, 'c7'),
      new Pawn(BLACK, 'd7'),
      new Pawn(BLACK, 'e7'),
      new Pawn(BLACK, 'f7'),
      new Pawn(BLACK, 'g7'),
      new Pawn(BLACK, 'h7'),

      new Rook(BLACK,   'a8'),
      new Knight(BLACK, 'b8'),
      new Bishop(BLACK, 'c8'),
      new Queen(BLACK,  'd8'),
      new Bishop(BLACK, 'f8'),
      new Knight(BLACK, 'g8'),
      new Rook(BLACK,   'h8'),
    ]
  }
  for(let element of document.getElementsByClassName('board-space')) {
    element.innerHTML = '';
  }
  for(let piece of armies.white) {
    piece.render();
  }
  for(let piece of armies.black) {
    piece.render();
  }
}

function initialize() {
  let lastSpace = null;
  document.addEventListener('mouseup', function(event) {
    if (lastSpace) {
      lastSpace.classList.remove('drop');
    }
    if (heldPiece) {
      heldPiece.element.removeAttribute('style');
      let dropLocation = getSpaceFromPoint(event.x, event.y);
      if (dropLocation) {
        let desiredLocation = dropLocation.id;
        if (heldPiece.isLegalMove(desiredLocation)) {
          heldPiece.moveTo(desiredLocation);
          heldPiece.highlightLegalMoves(); // TEMP: will switch whose turn it is.
        }
      }
    }
    heldPiece = null;
  });
  document.addEventListener('mousemove', function(event) {
    if (heldPiece) {
      let space = getSpaceFromPoint(event.x, event.y);
      if (space !== lastSpace) {
        if (space && heldPiece.isLegalMove(space.id)) {
          space.classList.add('drop');
        }
        if (lastSpace) {
          lastSpace.classList.remove('drop');
        }
      }
      lastSpace = space;
      heldPiece.element.style['left'] = event.clientX;
      heldPiece.element.style['top'] = event.clientY;
    }
  });
  dead = {
    white: document.getElementById('dead-white'),
    black: document.getElementById('dead-black'),
  }
  turnIndicator = document.getElementById('turn-indicator')
}

document.addEventListener('DOMContentLoaded', function() {
  initialize();
  newGame();
});

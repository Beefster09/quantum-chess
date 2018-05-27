const WHITE = 'white';
const BLACK = 'black';
const PROTECT = ''; // Falsy sentinel value to mark protected piece

var hoveredPiece = null;
var heldPiece = null;
var game = null;

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
      this.location = toSpace(position);
      this.type = null;
      this.element = null;
      this.hasMoved = false;
    }

    static byId(id) {
      return piecesByIds[id];
    }

    static at(location) {
      let space = getSpace(location);
      if (!space || space.children.length === 0) {
        return null;
      }
      else if (space.children.length === 1) {
        return Piece.byId(space.firstChild.id);
      }
    }

    initPiece() {
      this.element = document.createElement('div');
      this.element.id = this.id;
      this.element.classList.add('piece', this.color, this.type);

      let self = this;
      let piece = this.element;
      piece.addEventListener('mousedown', function(event) {
        piece.style['position'] = 'absolute';
        piece.style['left'] = event.x;
        piece.style['top'] = event.y;
        piece.style['transform'] = 'translate(-50%, -50%)';
        piece.style['z-index'] = 10;
        heldPiece = self;
        event.preventDefault();
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
    }

    isCapOrGuard(other) {
      return other.color !== this.color? true : PROTECT;
    }

    moveTo(location) {
      if (this.color === turn) {
        let other = Piece.at(location);
        if (other) {
          other.capture();
        }
        this.location = toSpace(location);
        this.hasMoved = true;
        turn = otherColor(this.color);
        turnIndicator.innerHTML = turn;
        this.render();
      }
    }

    capture() {
      unhighlight(getSpace(this.location));
      this.location = null;
      this.element.classList.add('captured')
      dead[this.color].append(this.element);
    }

    isLegalMove(location) {
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

function canRideToOrtho(piece, [rank, file]) {
  let [curRank, curFile] = piece.location;

  if (rank == curRank) {
    let dir = file > curFile? 1 : -1;
    let diff = Math.abs(file - curFile);
    for (let offset = 1; offset < diff; offset++) {
      let f = curFile + dir * offset;
      if (Piece.at([rank, f])) return false;
    }
    let other = Piece.at([rank, file]);
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
    let other = Piece.at([rank, file]);
    if (other) {
      return piece.isCapOrGuard(other);
    }
    else return true;
  }
  else return false;
}

function canRideToDiag(piece, [rank, file]) {
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
      if (Piece.at([r, f])) return false;
    }
    let other = Piece.at([rank, file]);
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
  }

  isLegalMove(location) {
    let [rank, file] = toSpace(location);
    let [curRank, curFile] = this.location;

    if (rank === curRank && file === curFile) {
      return false;
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
}

class Queen extends Piece {
  constructor(color, position) {
    super(color, position);
    this.type = 'queen';
  }

  isLegalMove(location) {
    let [rank, file] = toSpace(location);
    let [curRank, curFile] = this.location;

    if (rank === curRank && file === curFile) {
      return false;
    }

    let ortho = canRideToOrtho(this, [rank, file]);
    if (ortho !== false) return ortho;
    return canRideToDiag(this, [rank, file]);
  }
}

class Bishop extends Piece {
  constructor(color, position) {
    super(color, position);
    this.type = 'bishop';
  }

  isLegalMove(location) {
    let [rank, file] = toSpace(location);
    let [curRank, curFile] = this.location;

    if (rank === curRank && file === curFile) {
      return false;
    }

    return canRideToDiag(this, [rank, file]);
  }
}

class Knight extends Piece {
  constructor(color, position) {
    super(color, position);
    this.type = 'knight';
  }

  isLegalMove(location) {
    let [rank, file] = toSpace(location);
    let [curRank, curFile] = this.location;

    if (rank === curRank && file === curFile) {
      return false;
    }

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

  isLegalMove(location) {
    let [rank, file] = toSpace(location);
    let [curRank, curFile] = this.location;

    if (rank === curRank && file === curFile) {
      return false;
    }

    return canRideToOrtho(this, [rank, file]);
  }
}

class Pawn extends Piece {
  constructor(color, position) {
    super(color, position);
    this.type = 'pawn';
  }

  isLegalMove(location) {
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
      let other = Piece.at(location);
      return rank === curRank + dir && other && this.isCapOrGuard(other);
    }
    else return false;
  }
}

class Board {
  constructor() {
    this.pieces = [
      new King(WHITE, 'e1'),
      new King(BLACK, 'e8'),

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
    ];
  }

  render() {
    let spaces = document.getElementsByClassName('board-space');
    for(let element of spaces) {
      element.innerHTML = '';
    }
    for(let piece of this.pieces) {
      piece.render();
    }
  }
}

function newGame() {
  game = new Board();
  game.render();
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

const WHITE = 'white';
const BLACK = 'black';

var hoveredPiece = null;
var heldPiece = null;

function unhighlight(space) {
  space.classList.remove('legal-move', 'threatened');
}

function unhighlightBoard() {
  for (let space of document.getElementsByClassName('board-space')) {
    unhighlight(space);
  }
}

class Piece {
  constructor(color, position) {
    this.game = null;
    this.color = color;
    this.isQuantum = false;
    this.position = toSpace(position);
    this.type = null;
    this.pieceNode = null;
    this.hasMoved = false;
  }

  initPiece() {
    this.pieceNode = document.createElement('div');
    this.pieceNode.classList.add('piece', this.color, this.type);

    let self = this;
    let piece = this.pieceNode;
    let dragging = false;
    piece.addEventListener('mousedown', function(event) {
      piece.style['position'] = 'absolute';
      piece.style['left'] = event.x;
      piece.style['top'] = event.y;
      piece.style['transform'] = 'translate(-50%, -50%)';
      piece.style['z-index'] = 10;
      dragging = true;
      event.preventDefault();
    });
    piece.addEventListener('mouseenter', function(event) {
      hoveredPiece = self;
      self.highlightLegalMoves();
    })
    piece.addEventListener('mouseleave', function(event) {
      if (hoveredPiece === self) {
        unhighlightBoard();
      }
    })
    // TODO: globally scope this one
    document.addEventListener('mouseup', function(event) {
      piece.removeAttribute('style');
      if (dragging) {
        let dropLocation = document.elementFromPoint(event.x, event.y);
        if (dropLocation) {
          let isEmpty = Array.prototype.includes.call(dropLocation.classList, 'board-space'); // TEMP
          if (isEmpty) {
            let desiredLocation = algebraicToSpace(dropLocation.id);
            if (self.isLegalMove(desiredLocation)) {
              self.moveTo(desiredLocation);
              self.highlightLegalMoves(); // TEMP: will switch whose turn it is.
            }
          }
        }
      }
      dragging = false;
    });
    // TODO: globally scope this so that there aren't a jillion listeners
    document.addEventListener('mousemove', function(event) {
      if (dragging) {
        piece.style['left'] = event.clientX;
        piece.style['top'] = event.clientY;
      }
    })
  }

  moveTo(location) {
    this.position = location;
    this.hasMoved = true;
    this.render();
  }

  isLegalMove(location) {
    return false;
  }

  highlightLegalMoves() {
    for (let space of document.getElementsByClassName('board-space')) {
      if (this.isLegalMove(space.id)) {
        space.classList.add('legal-move');
      }
      else {
        unhighlight(space);
      }
    }
  }

  render() {
    if (!this.isQuantum) {
      let space = document.getElementById(spaceToAlgebraic(this.position));
      if (!this.pieceNode) {
        this.initPiece();
      }
      space.append(this.pieceNode);
    }
  }
}

class King extends Piece {
  constructor(color, position) {
    super(color, position);
    this.type = 'king';
  }

  isLegalMove(location) {
    let [rank, file] = toSpace(location);
    let [curRank, curFile] = this.position;

    if (rank === curRank && file === curFile) {
      return false;
    }

    return (
      rank <= curRank + 1 && rank >= curRank - 1
      && file <= curFile + 1 && file >= curFile - 1
    );
  }
}

class Queen extends Piece {
  constructor(color, position) {
    super(color, position);
    this.type = 'queen';
  }
}

class Bishop extends Piece {
  constructor(color, position) {
    super(color, position);
    this.type = 'bishop';
  }
}

class Knight extends Piece {
  constructor(color, position) {
    super(color, position);
    this.type = 'knight';
  }
}

class Rook extends Piece {
  constructor(color, position) {
    super(color, position);
    this.type = 'rook';
  }
}

class Pawn extends Piece {
  constructor(color, position) {
    super(color, position);
    this.type = 'pawn';
  }

  isLegalMove(location) {
    let [rank, file] = toSpace(location);
    let [curRank, curFile] = this.position;

    let dir = this.color === 'white'? 1 : -1;

    if (file === curFile) {
      if (!this.hasMoved && rank === curRank + 2 * dir) {
        return true; // TODO: check if space is occupied
      }
      return rank === curRank + dir;
    }
    else {
      return false; // TODO: check if capturing
    }
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

const WHITE = 'white';
const BLACK = 'black';

class Piece {
  constructor(color, position) {
    this.color = color;
    this.position = position;
    this.type = null;
    this.pieceNode = null;
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
      dragging = true;
      event.preventDefault();
    });
    document.addEventListener('mouseup', function(event) {
      piece.removeAttribute('style');
      if (dragging) {
        let dropLocation = document.elementFromPoint(event.x, event.y);
        if (dropLocation && Array.prototype.includes.call(dropLocation.classList, 'board-space')) {
          self.position = dropLocation.id.split('-')[1];
          self.render();
        }
      }
      dragging = false;
    });
    document.addEventListener('mousemove', function(event) {
      if (dragging) {
        piece.style['left'] = event.clientX;
        piece.style['top'] = event.clientY;
      }
    })
  }

  render() {
    if (isString(this.position)) {
      let space = document.getElementById(`space-${this.position}`);
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

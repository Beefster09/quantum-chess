const WHITE = 'white';
const BLACK = 'black';
const PROTECT = ''; // Falsy sentinel value to mark protected piece

const LMB = 0;
const RMB = 2;
const MMB = 1;

const STATE_STRINGS = {
  alpha: '\u03b1',
  beta: '\u03b2',
}

var hoveredPiece = null;
var heldPiece = null;

var armies = {
  white: null,
  black: null
};

var turn = 'white';

// marks if there is a quantum move in progress and somehow indicates which
// part of the superstate still needs to be moved.
var requiredMove = null;

// ui elements
var dead, turnIndicator, hidden;

function getKing(color) {
  return armies[color][0];
}

function startDrag(piece) {
  let element = piece.element;
  element.style['position'] = 'absolute';
  element.style['left'] = event.x;
  element.style['top'] = event.y;
  element.style['transform'] = 'translate(-50%, -50%)';
  element.style['z-index'] = 10;
  heldPiece = piece;
}

function unhighlight(space) {
  space.classList.remove('legal-move', 'threatened', 'path');
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
  let king = getKing(color);
  for (let piece of armies[otherColor(color)]) {
    if (piece.alive && piece.canCapture(king.location)) {
      return true;
    }
  }
  return false;
}

function wouldBeCheck(color, pieceToMove, destination) {
  let king = getKing(color);
  for (let piece of armies[otherColor(color)]) {
    if (piece.alive) {
      if (sameLocation(piece.location, destination) && pieceToMove.canCapture(destination)) {
        continue; // There might still be another piece keeping you in check
      }
      else if (pieceToMove === king) {
        if (piece.canCapture(destination)) {
          return true;
        }
      }
      else if (piece.canCapture(king.location, [pieceToMove, destination])) {
        return true;
      }
    }
  }
  return false;
}

function isCheckmate(color) {
  let king = getKing(color);
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

/// Collapsing on putting king on check
function checkCollapse(superstate, king) {
  let alphaCheck = superstate.alpha.canCapture(king.location);
  let betaCheck = superstate.beta.canCapture(king.location);
  console.log(alphaCheck, betaCheck);
  if (alphaCheck === betaCheck) return;
  if (alphaCheck) {
    superstate.beta.collapse();
  }
  else {
    superstate.alpha.collapse();
  }
}

function passTurn() {
  for (let piece of armies[turn]) {
    if (piece.isQuantum) {
      if (sameLocation(piece.superstate.alpha.location, piece.superstate.beta.location)) {
        piece.collapse('alpha');
      }
      checkCollapse(piece.superstate, getKing(turn));
    }
  }
  turn = otherColor(turn);
  turnIndicator.className = turn;
  requiredMove = null;
  for (let piece of armies[turn]) {
    if (piece.type === 'pawn') {
      piece.justDoubleMoved = false;
    }
    if (piece.isQuantum) {
      checkCollapse(piece.superstate, getKing(turn));
    }
  }
  if (isInCheck(turn)) {
    if (isCheckmate(turn)) {
      window.alert("Checkmate!"); // TEMP
    }
    else {
      window.alert("Check!"); // TEMP
    }
  }
}

Piece = function() {
  var nextId = function () {
    let counts = {};
    return function iterator(color, type) {
      let slot = `${type}-${color}`;
      if (counts[slot] === undefined) {
        counts[slot] = 0;
        return `${slot}-0`;
      }
      else {
        counts[slot]++;
        return `${slot}-${counts[slot]}`;
      }
    }
  }();
  var piecesByIds = {}

  class Piece {
    constructor(color, position, type) {
      this.id = nextId(color, type);
      piecesByIds[this.id] = this;
      this.type = type;
      this.color = color;
      this.isQuantum = false;
      this.canQuantum = true;
      this.superstate = null;
      this.location = toSpace(position);
      this.element = null;
      this.hasMoved = false;
      this.alive = true;
      this.promotedFrom = null;
    }

    static byId(id) {
      return piecesByIds[id];
    }

    static at(location, ...hMoves) {
      // hMoves are hypothetical moves that occur beforehand
      let space = getSpace(location);
      if (!space || space.children.length === 0) {
        for (let [pieceToMove, destination] of hMoves) {
          if (sameLocation(location, destination)) {
            return pieceToMove;
          }
        }
        return null;
      }
      else if (space.children.length === 1) {
        let piece = Piece.byId(space.firstChild.id);
        if (piece instanceof Piece) {
          for (let [pieceToMove, destination] of hMoves) {
            if (piece === pieceToMove) {
              return null;
            }
          }
          return piece;
        }
      }
      // Drop-thru
      let result = new Array(...space.children).map(function (child) {
        let piece = Superstate.byId(child.id);
        for (let [pieceToMove, destination] of hMoves) {
          if (piece === pieceToMove) {
            return null;
          }
        }
        return piece;
      }).filter(x => x !== null);
      if (result.length) return result;
      else return null;
    }

    isSolid(location, ...hMoves) {
      /// Can a piece pass through this square?
      let piecesAt = Piece.at(location, ...hMoves);
      if (piecesAt === null) {
        return false;
      }
      else if (piecesAt instanceof Piece) {
        return true;
      }
      else if (piecesAt instanceof Array) {
        if (piecesAt.length <= 1) return false;
        if (piecesAt.length >= 4) return true;
        // 1 or more quantum pieces... This is tricky.
        // It also depends on the color of the piece and quantum pieces you pass through
        return true;
      }
    }

    initPiece() {
      this.element = document.createElement('div');
      this.element.id = this.id;
      this.element.classList.add('piece', this.color, this.type);

      let self = this;
      let piece = this.element;
      piece.addEventListener('mousedown', function(event) {
        if (!self.alive || turn !== self.color) return;
        if (event.button === LMB && (!requiredMove || requiredMove === self)) {
          startDrag(self);
          event.preventDefault();
        }
        if (event.button === RMB && this.canQuantum) {
          heldPiece = null;
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
        if (self.alive && turn === self.color && self.canQuantum) {
          self.split();
          event.preventDefault();
        }
      });
    }

    split() {
      console.log("Splitting")
      this.superstate = new Superstate(this); // TODO: reuse existing superstate when possible
      this.isQuantum = true;
      this.render();
    }

    collapse(which) {
      if (this.isQuantum) {
        if (which === null) {
          if (sameLocation(this.superstate.alpha.location, this.superstate.beta.location)) {
            this.location = this.superstate.alpha.location;
          }
          else {
            console.log("Attempt to collapse state to null");
            return;
          }
        }
        this.location = this.superstate[which].location;
        this.superstate.collapse(which);
        this.superstate.hide();
        this.isQuantum = false;
        this.render();
      }
    }

    isCapOrGuard(other) {
      if (other instanceof Piece) {
        return other.color !== this.color? true : PROTECT;
      }
      else if (other instanceof Array) {
        return other.length <= 1;
        // TEMP: quantum entanglement might be weird here...
        // return false;
      }
    }

    moveTo(location, switchTurn) {
      if (switchTurn === undefined) {
        switchTurn = true;
      }
      if (this.color === turn) {
        let other = Piece.at(location);
        if (other instanceof Piece) {
          other.capture(this);
        }
        else if (other instanceof Array) {
          for (let qPiece of other) {
            qPiece.other.collapse();
          }
        }
        let path = this.pathTo(location);
        console.log(path);
        for (let space of path) {
          let obstacle = Piece.at(space);
          console.log(obstacle);
          if (obstacle instanceof Array) {
            for (let qPiece of obstacle) {
              qPiece.other.collapse();
            }
          }
        }
        this.location = toSpace(location);
        this.hasMoved = true;
        if (switchTurn) {
          passTurn();
        }
        this.render();
      }
    }

    capture(captor) {
      unhighlight(getSpace(this.location));
      this.location = null;
      this.element.classList.add('captured')
      dead[this.color].append(this.element);
      this.alive = false;
    }

    /// the spaces on the way to the given location.
    pathTo(location) {
      return straightLine(this.location, location);
    }

    canMove(location, ...hMoves) {
      return false;
    }

    canCapture(location, ...hMoves) {
      return this.canMove(location, ...hMoves);
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
          if (piece instanceof Piece) {
            space.classList.add('threatened');
            piece.element.classList.add('threatened');
          }
          else {
            space.classList.add('legal-move');
          }
        }
        else if (legality === PROTECT && !(piece instanceof King)) {
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
      if (this.isQuantum) {
        hidden.append(this.element);
        this.superstate.render();
      }
      else {
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
      if (piece.isSolid([rank, f], ...hMoves)) return false;
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
      if (piece.isSolid([r, file])) return false;
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
      if (piece.isSolid([r, f], ...hMoves)) return false;
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
    super(color, position, 'king');
    this.canQuantum = false;
  }

  canMove(location) {
    let [rank, file] = toSpace(location);
    let [curRank, curFile] = this.location;

    // Castling
    if (!this.hasMoved && rank === curRank) {
      if (file === curFile + 2 && !isInCheck(this.color) && !wouldBeCheck(this.color, this, [rank, curFile + 1])) {
        let maybeRook = Piece.at([rank, 7]);
        if (maybeRook instanceof Rook && !maybeRook.hasMoved) {
          return !this.isSolid([rank, 5]) && !this.isSolid([rank, 6]);
        }
      }
      else if (file === curFile - 2 && !isInCheck(this.color) && !wouldBeCheck(this.color, this, [rank, curFile - 1])) {
        let maybeRook = Piece.at([rank, 0]);
        if (maybeRook instanceof Rook && !maybeRook.hasMoved) {
          return !this.isSolid([rank, 1]) && !this.isSolid([rank, 2]) && !this.isSolid([rank, 3]);
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

    // Castling
    if (file === curFile + 2) {
      let maybeRook = Piece.at([rank, 7]);
      if (maybeRook instanceof Rook) {
        maybeRook.moveTo([rank, 5], false);
      }
    }
    else if (file === curFile - 2) {
      let maybeRook = Piece.at([rank, 0]);
      if (maybeRook instanceof Rook) {
        maybeRook.moveTo([rank, 3], false);
      }
    }
    super.moveTo(location, switchTurn);
  }
}

class Queen extends Piece {
  constructor(color, position) {
    super(color, position, 'queen');
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
    super(color, position, 'bishop');
  }

  canMove(location, ...hMoves) {
    let [rank, file] = toSpace(location);
    let [curRank, curFile] = this.location;

    return canRideToDiag(this, [rank, file], ...hMoves);
  }
}

class Knight extends Piece {
  constructor(color, position) {
    super(color, position, 'knight');
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
    super(color, position, 'rook');
  }

  canMove(location, ...hMoves) {
    let [rank, file] = toSpace(location);
    let [curRank, curFile] = this.location;

    return canRideToOrtho(this, [rank, file], ...hMoves);
  }
}

class Pawn extends Piece {
  constructor(color, position) {
    super(color, position, 'pawn');
    this.canQuantum = false;
    this.justDoubleMoved = false;
  }

  canMove(location) {
    let [rank, file] = toSpace(location);
    let [curRank, curFile] = this.location;

    let dir = this.color === 'white'? 1 : -1;

    if (file === curFile) {
      if (!this.hasMoved && rank === curRank + 2 * dir) {
        return !this.isSolid(location) && !this.isSolid([curRank + dir, file]);
      }
      return rank === curRank + dir && !this.isSolid(location);
    }
    else if (Math.abs(file - curFile) === 1) {
      if (rank === curRank + dir) {
        let other = Piece.at(location);
        if (other instanceof Piece) {
          return this.isCapOrGuard(other);
        }
        if (other instanceof Array) {
          for (let qState of other) {
            if (qState.color !== this.color) {
              return true;
            }
          }
        }
        else if (other == null) { // Check for en passant capture
          let maybePawn = Piece.at([curRank, file]);
          return maybePawn instanceof Pawn && maybePawn.justDoubleMoved;
        }
      }
    }
    else return false;
  }

  canCapture(location) {
    let [rank, file] = toSpace(location);
    let [curRank, curFile] = this.location;

    let dir = this.color === 'white'? 1 : -1;
    return Math.abs(file - curFile) === 1 && rank === curRank + dir;
  }

  moveTo(location, switchTurn) {
    let [rank, file] = toSpace(location);
    let [curRank, curFile] = this.location;
    if (Math.abs(rank - curRank) == 2) {
      this.justDoubleMoved = true;
    }
    else if (file !== curFile) {
      // collapse-capture
      let other = Piece.at(location)
      if (other instanceof Array) {
        let qState = other.find(qs => qs.color !== this.color);
        if (qState) {
          qState.collapse();
        }
      }
      else {
        // en passant
        let maybePawn = Piece.at([curRank, file]);
        if (maybePawn instanceof Pawn && maybePawn.justDoubleMoved) {
          maybePawn.capture();
        }
      }
    }

    super.moveTo(location, switchTurn);

    let dir = this.color === 'white'? 1 : -1;
    let lastRank = this.color === 'white'? 7 : 0;

    if (rank === lastRank) {
      this.promote(location);
    }
  }

  promote(location) {
    // TODO: allow player to choose promotion piece
    let promotedPiece = new Queen(this.color, location);
    let index = armies[this.color].indexOf(this);
    armies[this.color][index] = promotedPiece;
    promotedPiece.hasMoved = true;
    promotedPiece.promotedFrom = this;
    promotedPiece.render();
    this.alive = false;
    hidden.append(this.element);
  }
}

const IMPOSSIBLE = 0;
const NORMAL = 1;
const LEFTCAPTURED = 2; // "left" term in entanglement captured by right
const RIGHTCAPTURED = 3;

const ALPHA = 0;
const BETA = 1;
const STATE_INDEX = {
  alpha: ALPHA,
  beta: BETA
}

Superstate = function() {
  let ids = {};

  class QuantumState {
    constructor(superstate, location, state) {
      this.id = `${superstate.piece.id}-${state}`;
      ids[this.id] = this;
      this.parent = superstate;
      this.location = location;
      this.state = state;
      this.element = null;
      this.other = null;
      this.alive = true;
    }

    get color() {
      return this.parent.piece.color;
    }

    get piece() {
      return this.parent.piece;
    }

    isLegalMove(location) {
      this.piece.location = this.location;
      return (
        this.piece.isLegalMove(location)
        && !(Piece.at(location) instanceof Piece) // Quantum Pieces cannot capture classical pieces
      );
    }

    canCapture(location) {
      this.piece.location = this.location;
      return this.piece.canCapture(location);
    }

    moveTo(location) {
      if (requiredMove & requiredMove !== this) {
        return;
      }
      this.location = toSpace(location);
      this.render();
      // Force quantum moves to happen in pairs.
      if (requiredMove == null) {
        requiredMove = this.other;
      }
      if (requiredMove === this) {
        passTurn();
      }
      // TODO: entanglement
    }

    highlightLegalMoves(location) {
      this.parent.piece.location = this.location;
      return this.parent.piece.highlightLegalMoves(location);
    }

    capture(captor) {
      // TODO: this might actually just entangle stuff...
      unhighlight(getSpace(this.location));
      this.location = null;
      this.element.classList.add('captured');
      dead[this.color].append(this.element);
      this.alive = false;
    }

    render() {
      let space = document.getElementById(toAlgebraic(this.location));
      space.append(this.element);
    }

    collapse() {
      this.piece.collapse(this.state);
    }
  }

  class Entanglement {
    constructor(first, second) {
      this.first = first;
      this.second = second;
      this.table = [
        [NORMAL, NORMAL],
        [NORMAL, NORMAL]
      ]
      // this.table is in this format:
      //            | right-alpha | right-beta
      // left-alpha |   la & ra   |  la & rb
      // left-beta  |   lb & ra   |  lb & rb
      // each cell can be:
      //  - NORMAL: possible, no interference
      //  - IMPOSSIBLE: this combination of states is impossible
      //  - LEFTCAPTURED: the left piece is captured when that pair of states is the case
      //  - RIGHTCAPTURED: the right piece is captured when that pair of states is the case
    }

    /// determine how an entanglement would collapse
    /// returns which state should be collapsed in right, or null if no collapse is needed
    ifLeftCollapses(which) {
      let [implAlpha, implBeta] = this.table[STATE_INDEX[which]];
      let possAlpha = implAlpha === NORMAL || implAlpha === RIGHTCAPTURED;
      let possBeta = implBeta === NORMAL || implBeta === RIGHTCAPTURED;
      if (possAlpha) {
        if (possBeta) return null;
        else return 'alpha'
      }
      else {
        if (possBeta) return 'beta';
        else return 'impossible';
      }
    }

    ifRightCollapses(which) {
      let [implAlpha, implBeta] = this.table[STATE_INDEX[which]];
      let possAlpha = implAlpha === NORMAL || implAlpha === LEFTCAPTURED;
      let possBeta = implBeta === NORMAL || implBeta === LEFTCAPTURED;
      if (possAlpha) {
        if (possBeta) return null;
        else return 'alpha'
      }
      else {
        if (possBeta) return 'beta';
        else return 'impossible';
      }
    }
  }

  class Superstate {
    constructor(piece) {
      this.piece = piece;

      // locations
      this.states = [
        new QuantumState(this, piece.location, 'alpha'),
        new QuantumState(this, piece.location, 'beta')
      ];
      this.states[0].other = this.states[1];
      this.states[1].other = this.states[0];

      this.entanglements = [];
    }

    get alpha() {
      return this.states[0];
    }

    get beta() {
      return this.states[1];
    }

    static get Entanglement() {
      return Entanglement;
    }

    static get QuantumState() {
      return QuantumState;
    }

    static byId(id) {
      return ids[id];
    }

    initPieces() {
      let self = this;
      let piece = this.piece;
      for (let stateObj of this.states) {
        let state = stateObj.state;
        let element = document.createElement('div');
        element.id = `${piece.id}-${state}`;
        element.classList.add('piece', piece.color, piece.type, 'quantum');
        let label = document.createElement('div');
        let intId = parseInt(piece.id.split('-').pop());
        label.classList.add('quantum', 'label', state, 'pair-' + intId);
        label.innerHTML = `${intId+1}${STATE_STRINGS[state]}`
        element.appendChild(label);
        stateObj.element = element;
        console.log(stateObj);

        element.addEventListener('mousedown', function(event) {
          if (!stateObj.alive || turn !== stateObj.color) return;
          if (event.button === LMB && (!requiredMove || requiredMove === stateObj)) {
            startDrag(stateObj);
            event.preventDefault();
          }
        });
        element.addEventListener('mouseenter', function(event) {
          hoveredPiece = self;
          stateObj.highlightLegalMoves();
        });
        element.addEventListener('mouseleave', function(event) {
          if (hoveredPiece === self) {
            unhighlightBoard();
          }
        });
        element.addEventListener('contextmenu', function(event) {
          if (!requiredMove && turn === piece.color) {
            stateObj.collapse();
            requiredMove = piece;
            event.preventDefault();
          }
        })
      }
    }

    collapse(which) {
      for (let qState of Piece.at(this[which].location)) {
        if (qState.piece !== this.piece && qState.piece.isQuantum) {
          qState.other.collapse();
        }
      }
    }

    hide() {
      for (let stateObj of this.states) {
        hidden.append(stateObj.element);
      }
    }

    render() {
      if (!this.elements) {
        this.initPieces();
      }
      for (let state of this.states) {
        state.render();
      }
    }
  }
  return Superstate;
}();

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

      new Rook(BLACK,   'a8'),
      new Knight(BLACK, 'b8'),
      new Bishop(BLACK, 'c8'),
      new Queen(BLACK,  'd8'),
      new Bishop(BLACK, 'f8'),
      new Knight(BLACK, 'g8'),
      new Rook(BLACK,   'h8'),

      new Pawn(BLACK, 'a7'),
      new Pawn(BLACK, 'b7'),
      new Pawn(BLACK, 'c7'),
      new Pawn(BLACK, 'd7'),
      new Pawn(BLACK, 'e7'),
      new Pawn(BLACK, 'f7'),
      new Pawn(BLACK, 'g7'),
      new Pawn(BLACK, 'h7'),
    ]
  }
  for(let element of document.getElementsByClassName('board-space')) {
    element.innerHTML = ''; // clear content from previous game
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
          heldPiece.highlightLegalMoves();
        }
      }
    }
    heldPiece = null;
  });
  document.addEventListener('mousemove', function(event) {
    if (heldPiece) {
      let space = getSpaceFromPoint(event.x, event.y);
      if (space !== lastSpace) {
        if (lastSpace) {
          lastSpace.classList.remove('drop');
          for (let pathSpace of straightLine(heldPiece.location, lastSpace.id)) {
            let spaceElem = document.getElementById(toAlgebraic(pathSpace));
            spaceElem.classList.remove('path');
          }
        }
        if (space && heldPiece.isLegalMove(space.id)) {
          space.classList.add('drop');
          for (let pathSpace of straightLine(heldPiece.location, space.id)) {
            let spaceElem = document.getElementById(toAlgebraic(pathSpace));
            spaceElem.classList.add('path');
          }
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
  turnIndicator = document.getElementById('turn-indicator');
  hidden = document.getElementById('hidden');
}

document.addEventListener('DOMContentLoaded', function() {
  initialize();
  newGame();
});

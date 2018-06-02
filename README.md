# Quantum Chess
Chess, but with Quantum Mechanics

[Play it here](https://beefster09.github.io/quantum-chess/quantum-chess.html)

*Note that this is a work in progress, so not everything you see here has been
implemented yet*

## Overview

All the normal rules of Chess are in effect, except that Bishops, Knights, Rooks,
and Queens each have the ability to split into a superstate of two locations.
For all intents and purposes, a split piece can be treated as being at both
locations until a move "observes" that a piece was or wasn't present at a given
location.

## Superstates

You can split a piece by right clicking on it. The piece is then split into an
alpha-beta pair which you must always move as a pair. Each half of the alpha-beta
pair of the superstate will be referred to as a quantum piece. A piece that is
in a superstate will be referred to as a classical piece.

### Collapse

Moving a classical piece through a quantum piece will cause the quantum piece to
collapse through the other location. The same goes for ending a turn on the same
space as a quantum piece.

There are a few exceptions and nuances to this type of collapse:

* A pawn that moves diagonally will capture the split piece rather than
collapsing it to the other location. This is because the piece had to have been
observed at that location for the pawn to move diagonally.
* Pieces will collapse-capture in cases where it would have put the king in
check had the quantum piece collapsed to the other location.
* If a space containing multiple quantum pieces could not collapse to empty, it
is considered solid and thus pieces may not pass through it.
 * Note that in some cases, this will trigger a capture. If multiple pieces
can be captured this way, the most valuable piece will be taken, with ties being
broken arbitrarily.

### Check with Superstates

Whenever possible, superstates will collapse to avoid putting the king in check.
Without this rule, it would be nearly trivial to checkmate with a single piece.

### Entanglement

Certain situations can cause certain combinations of quantum states to be
impossible. Captures between quantum pieces are somewhat delayed. Generally
speaking, any interaction between two quantum pieces will cause entanglement.

If a quantum piece passes through another, those two states of the piece cannot
both be true.

If a quantum piece captures another, the capture is noted and will resolve if
both pieces collapse to the state where the capture occurred.

Entanglement itself can lead to collapse in cases where both quantum pieces in
a superstate pair have rendered a state impossible. Such a situation may not
necessarily collapse the triggering superstate.

## Contributing

Pull requests are welcome.

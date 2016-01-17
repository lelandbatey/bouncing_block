
# Info

[Bouncing Blocks](https://github.com/lelandbatey/bouncing_block) (BB) was written in C, then compiled to Javascript with Emscripten. Since BB is built to work with a terminal, a terminal emulator implemented in Javascript called [Term.js](https://github.com/chjj/term.js) is used to display the program.

# How it Works

The display area is represented as a "board", a two dimensional array of "cells". Each cell is a string of characters.

Each colored "block" is modeled as a projectile, so each block has an initial upward velocity and a right-ward velocity. Calculating the vertical position of a block is done by applying the kinematic equation for displacement of a projectile to the amount of time that's passed since the start of the "throw". When the vertical position of a block would fall below zero, it restarts the "throw". Horizontal position is calculated by multiplying the age of the block by its right-ward velocity.

If a block would move beyond the edge of the board, the board wraps that position to the opposite edge of the board. So if a block would move beyond the right edge of the board, the board "wraps" that block back to the left edge of the board.

The "color" of a block is encoded not as a standard hex value, but instead as an ANSI escape code to set the background of the terminal to a particular color, then a space, then an escape code to reset the background to the default color. This results in a single "block" of color being displayed in the terminal.

Before each frame is displayed, the contents of the "board" is reset. Then, each "block" has it's position on the board calculated at that moment, and the "color" for that block is copied into it's position on the board.

Each "frame" of the animation is actually a string. It is composed of:

1. A series of control sequences to move the cursor to the "top" of the board. This is done so that the rectangular board will be over-written with each frame, giving it the appearance of animation.
2. The contents of each cell of the board, in order from left to right, top to bottom, with a new line for each row.
3. An additional line showing the number of frames printed in the last second.

The entire string is then printed to the terminal, resulting in the displayed animation.


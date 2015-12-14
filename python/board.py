# -*- coding: utf-8 -*-
"""Terminal drawing primitive."""

import time

def print_vert_col_labels(board_width, row_label_width, newline_func):
    """Prints verticle column labels."""
    nums = [str(x) for x in range(board_width)]
    for line in range(0, len(max(nums, key=len))):
        # Print whitespace padding to the left of the labels to match
        # the width of the horizontal row labels
        for _ in range(row_label_width):
            print(' ', end="")
        for num in nums:
            if len(num) <= line:
                print(' ', end="")
            else:
                print(num[line], end="")
        newline_func()

class Board(object):
    """Represents a two dimensional array of cells. Used for drawing objects to
    the terminal."""
    def __init__(self, width=100, height=25):
        self.height = height
        self.width = width
        self.board = [[' ' for _ in range(width)] for _ in range(height)]
        self.been_drawn = False
        self.newlines_drawn = 0

        self.fps = 0
        self.draw_count = 0
        self.fps_time = time.time()


    def renew(self):
        """Reset all cells of the board to default"""
        for row in range(len(self.board)):
            for col in range(len(self.board[row])):
                self.board[row][col] = ' '

    def __iter__(self):
        for row in self.board:
            yield row

    def __getitem__(self, key):
        return self.board[key]

    def render_frame(self, debug=False, debug_fields=None):
        """Creates the string to be printed to stdout. Debug cooresponds to
        column and row labels, debug_fields is a list of additional strings to
        be printed at the bottom of the board, after the FPS counter."""
        if debug_fields is None:
            debug_fields = []
        row_label_width = 4

        frame = ""

        # Hide the cursor
        frame += '\033[?25l'

        # Move the cursor up the the same number of newlines that've been
        # printed.
        if self.been_drawn:
            for _ in range(self.newlines_drawn):
                frame += "\r\033[1A"
            self.newlines_drawn = 0

        if debug:
            print_vert_col_labels(self.width, row_label_width, self.newline)

        # Print contents of board
        for row_num, row in enumerate(self.board):
            if debug:
                # Print horizontal row labels
                frame += ("{:>"+str(row_label_width)+"}").format(row_num)
            for col in row:
                frame += col
            frame += self.newline()

        # Measure and print the number of frames printed in the last second
        self.draw_count += 1
        if time.time() - self.fps_time >= 1:
            self.fps = self.draw_count
            self.draw_count = 0
            self.fps_time = time.time()
        frame += 'FPS: {}'.format(self.fps)
        frame += self.newline()

        for entry in debug_fields:
            frame += entry
            frame += self.newline()


        # Show the cursor
        frame += '\033[?25h'
        self.been_drawn = True
        return frame

    def draw_board(self, debug=False, debug_fields=None):
        """Draws the board to stdout. Debug cooresponds to column and row
        labels, debug_fields is a list of additional strings to be printed at
        the bottom of the board, after the FPS counter."""
        frame = self.render_frame(debug, debug_fields)
        print(frame, end="")


    def newline(self):
        """Keeps track of the newlines that've been printed. Done to allow for
        consistent redrawing of the board."""
        self.newlines_drawn += 1
        return '\n'

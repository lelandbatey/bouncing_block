#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Draws bouncing arcs to the screen."""

from __future__ import print_function
import itertools
import argparse
import random
import copy
import math
import time
import os

from board import Board

BIRTHDAY_MESSAGE = [
    ["_    _                           ____  _      _   _         _             ", 1],
    ["| |  | |                         |  _ \(_)    | | | |       | |            ", 0],
    ["| |__| | __ _ _ __  _ __  _   _  | |_) |_ _ __| |_| |__   __| | __ _ _   _ ", 0],
    ["|  __  |/ _` | '_ \| '_ \| | | | |  _ <| | '__| __| '_ \ / _` |/ _` | | | |", 0],
    ["| |  | | (_| | |_) | |_) | |_| | | |_) | | |  | |_| | | | (_| | (_| | |_| |", 0],
    ["|_|  |_|\__,_| .__/| .__/ \__, | |____/|_|_|   \__|_| |_|\__,_|\__,_|\__, |", 0],
    ["| |   | |     __/ |                                      __/ |", 13],
    ["|_|   |_|    |___/                                      |___/ ", 13],
    ["_____               _", 25],
    ["|  __ \             | |", 24],
    ["| |__) |   _ ___ ___| |", 24],
    ["|  _  / | | / __/ __| |", 24],
    ["| | \ \ |_| \__ \__ \_|", 24],
    ["|_|  \_\__,_|___/___(_)", 24]
]



COLORS = [
    "\033[48;5;197m", # Pink
    "\033[48;5;162m", # Magenta
    "\033[48;5;54m", # Purple
    "\033[48;5;196m", # Red
    "\033[48;5;34m", # Green
    "\033[48;5;35m", # Green
    "\033[48;5;40m", # Green
    "\033[48;5;19m", # Blue
    "\033[48;5;20m", # Blue
    "\033[48;5;39m", # Blue
    "\033[48;5;226m", # Yellow
    "\033[48;5;229m", # Yellow
    "\033[48;5;208m", # Orange
]

class Line(object):
    """Simulates the trajectory of an object, while also providing color and
    drawing logic."""
    def __init__(self, color_str, x_vel, y_vel, tail_length=1):
        """Initialize the child trajectory and other values."""
        self.start_time = time.time()
        self.jump_start = self.start_time
        self.init_x_vel = x_vel
        self.init_y_vel = y_vel

        # A little bit of randomness for variety of trajectories.
        grav_delta = random.randint(-1, 1) * random.random()
        self.gravity = -9.8 + grav_delta

        self.point_val = color_str+' '+'\033[0m'
        self.tail_length = tail_length
        self.points = []

    def get_y_pos(self):
        """Calculates and returns current y position."""
        t_diff = time.time() - self.jump_start
        t_diff *= 2
        # y = init_y_velocity * t + 0.5 * gravity * t**2
        y_pos = self.init_y_vel * t_diff + 0.5 * self.gravity * t_diff**2

        # Restart the bounce when it would otherwise fall below zero.
        if y_pos <= 0.0:
            y_pos = 0.0
            self.jump_start = time.time()
        return y_pos

    def get_x_pos(self):
        """Calculates and returns current x position."""
        t_diff = time.time() - self.start_time
        return self.init_x_vel * t_diff

    def draw(self, board):
        """Draws this lines points to the board, with points being derived from
        this instances 'Trajectory' property."""
        y_pos = self.get_y_pos()
        row = (board.height-1) - math.floor(y_pos)
        col = math.floor(self.get_x_pos()) % board.width

        if [row, col] not in self.points:
            self.points.append([row, col])

        if len(self.points) > self.tail_length:
            self.points = self.points[-self.tail_length:]

        for row, col in self.points:
            board[row][col] = self.point_val

    def beyond_age(self, given_age):
        """Returns true if this Line object is as old or older than the given
        age, in seconds."""
        current_age = time.time() - self.start_time
        if current_age >= given_age:
            return True
        return False
    def get_max_height(self):
        """Returns max height of this trajectory."""
        return (-(self.init_y_vel**2))/(2*self.gravity)

class ScrollText(object):
    """Like a Line, but composed of text."""
    def __init__(self, text_str, x_vel=5, y_height=None, init_x_pos=None,
                 should_expire=False):
        """Initialize the scrolling text."""
        self.start_time = time.time()
        self.x_vel = x_vel
        self.y_height = y_height
        self.init_x_pos = init_x_pos

        self.should_expire = should_expire

        self.text = text_str

    def get_x_pos(self):
        """Returns the x position of the starting character."""
        t_diff = time.time() - self.start_time
        return self.x_vel * t_diff + self.init_x_pos

    def get_y_pos(self):
        """Returns the y position of the line of text."""
        return self.y_height

    def draw(self, board):
        """Draws the text to the board."""
        if len(self.text) >= board.width:
            raise ValueError("Text too long for board. Text must be shorter "
                             "than the board is wide.")

        if self.y_height is None:
            self.y_height = int(board.height*2/3)
        if self.init_x_pos is None:
            self.init_x_pos = int((board.width-len(self.text))/2)

        y_pos = self.get_y_pos()
        row = (board.height-1) - math.floor(y_pos)
        col = math.floor(self.get_x_pos()) % board.width

        for chr_pos in range(len(self.text)):
            safe_col = (col+chr_pos) % board.width
            board[row][safe_col] = self.text[chr_pos]

    def beyond_age(self, given_age):
        """If `self.should_expire` is True, always returns False. Otherwise,
        returns true if this object is older than `given_age`."""
        if self.should_expire and (time.time() - self.start_time) >= given_age:
            return True
        return False


class DrawableCollection(object):
    """A collection of drawable objects, such as ScrollText or Line objects."""
    def __init__(self, min_vel=8, max_vel=24, inject_interval=0,
                 inject_count=None, drawable_max=None, tail_length=None,
                 expiration=0, drawable_class=None):
        self._drawables = []
        self.min_vel = min_vel
        self.max_vel = max_vel
        self.seed_vels = random_velocities(min_vel, max_vel)
        self.inject_interval = inject_interval
        self.inject_count = inject_count

        self.drawable_max = drawable_max
        self.tail_length = tail_length
        self.expiration = expiration

        self.drawable_class = drawable_class
        self.clear_time = time.time()

    def __len__(self):
        return len(self._drawables)
    def __iter__(self):
        for drw in self._drawables:
            yield drw

    def append(self, obj):
        self._drawables.append(obj)
    def remove(self, obj):
        self._drawables.remove(obj)

    def inject(self):
        """Inject new Lines if enough time has passed. Respects the
        `self.drawable_max` and will not create additional drawable objects if
        limit is reached."""
        if not self.inject_interval:
            return
        if not time.time() - self.clear_time > self.inject_interval:
            return

        self.clear_time = time.time()
        new_count = min(self.drawable_max - len(self), self.inject_count)
        for _ in range(new_count):
            color = random.choice(COLORS)
            vels = random.choice(self.seed_vels)
            dc = self.drawable_class
            tmp = dc(color, tail_length=self.tail_length, *vels)
            self.append(tmp)

    def draw(self, board):
        """Draws all drawable objects to the board. Expires old objects."""
        expired = []
        for drw in self:
            if self.expiration and drw.beyond_age(self.expiration):
                expired.append(drw)
            else:
                drw.draw(board)

        for exp in expired:
            self.remove(exp)



def f_range(low, high, div=1):
    """Returns a floating-point range."""
    for num in range(low*div, high*div):
        yield num/div


def skew_parabola(num, low, high):
    """Given a `number` and the start and end of the range that number is found
    in, scale that number up by a factor. That factor is the result of taking
    the relative position of `number` within the range as a floating point
    value from 0 to 1, then feeding that value into the following equation for
    a parabola:
        1 - ((x-1)^2)
    """
    width = high - low
    scaled = (num - low)/width
    skew_val = 1 - (scaled-1)**2
    return skew_val*width + low

def random_velocities(min_vel, max_vel):
    """Creates a list of permuted random velocities within `min_vel` and
    `max_vel`."""
    seed_vels = []
    for num in f_range(min_vel, max_vel, 100):
        seed_vels.append(skew_parabola(num, min_vel, max_vel))
    seed_vels = list(itertools.permutations(seed_vels, 2))
    return seed_vels

def create_lines(min_vel, max_vel, blocks_count, tail_length):
    """Initializes the lines for display."""

    traj_vels = random.sample(seed_vels, blocks_count)

    lines = []
    for vels in traj_vels:
        color = random.choice(COLORS)
        lines.append(Line(color, tail_length=tail_length, *vels))

    return lines, seed_vels

def find_default_vel(height):
    """Calculate a max velocity for a given height of the display, such that
    lines will not vertically wrap around."""
    # Since there's a random delta applied to the gravity of each line, and
    # that delta could be as much as -1, we calculate the max height using the
    # lowest possible gravity that could arise.
    gravity = -8.8
    return math.sqrt(-(2 * gravity * height))

def draw_blocks(board, drawables):
    """Inner loop which draws blocks to screen."""
    while True:
        board.renew()
        for dc in drawables:
            dc.inject()
            dc.draw(board)
        obj_count = sum([len(dc) for dc in drawables])
        board.draw_board(debug_fields=["Line count: {}".format(obj_count)])


def main():
    """Main logic for trajectory and display."""

    parser = argparse.ArgumentParser("Displays bouncing blocks in the terminal.")
    parser.add_argument('--width', help="Number of columns wide to display",
                        type=int, default=None)
    parser.add_argument('--height', help="Number of rows high to display",
                        type=int, default=None)
    parser.add_argument('--blocks_init', type=int, default=10,
                        help="Number of initial blocks to spawn")
    parser.add_argument('--blocks_inject', type=int, default=15,
                        help="Number of blocks to inject during runtime")
    parser.add_argument('--blocks_inject_interval', type=int, default=0.5,
                        help="Interval in seconds to attempt to inject blocks")
    parser.add_argument('--block_max', type=int, default=300,
                        help="Maximum number of blocks to display at once")
    parser.add_argument('--min_velocity', '-v', type=int, default=8,
                        help="Minimum velocity for blocks")
    parser.add_argument('--max_velocity', '-x', type=int, default=None,
                        help="Maximum velocity for blocks")
    parser.add_argument('--blocks_expire_age', type=int, default=8,
                        help="Age in seconds before a block is removed")
    parser.add_argument('--blocks_tail_length', type=int, default=1,
                        help="Length of 'tail' of each block.")
    args = parser.parse_args()

    board_width = args.width
    board_height = args.height

    blocks_init_count = args.blocks_init
    blocks_inject_count = args.blocks_inject
    blocks_inject_interval = args.blocks_inject_interval
    blocks_max_count = args.block_max

    min_vel = args.min_velocity
    max_vel = args.max_velocity

    blocks_expire_age = args.blocks_expire_age
    blocks_tail_length = args.blocks_tail_length

    # Default the board width and height to be slightly smaller than the max
    # width and height of the current terminal
    t_width, t_height = os.get_terminal_size()
    if board_width is None:
        board_width = max(t_width-5, 20)
    if board_height is None:
        board_height = max(t_height-5, 20)

    if max_vel is None:
        max_vel = math.floor(find_default_vel(board_height))
        max_vel = int(max_vel)


    board = Board(board_width, board_height)
    drawables = []
    confetti_fwd = DrawableCollection(min_vel=min_vel, max_vel=max_vel,
                             inject_interval=blocks_inject_interval,
                             inject_count=blocks_init_count,
                             drawable_max=blocks_max_count,
                             tail_length=blocks_tail_length,
                             expiration=blocks_expire_age,
                             drawable_class=Line)
    confetti_bwd = copy.copy(confetti_fwd)
    confetti_bwd.seed_vels = [[-x, y] for x, y in confetti_bwd.seed_vels]

    birthday = DrawableCollection()
    # Create the birthday message
    m_width = max([len(l[0])+l[1] for l in BIRTHDAY_MESSAGE])
    for l_idx in range(len(BIRTHDAY_MESSAGE)):
        l_struct = BIRTHDAY_MESSAGE[l_idx]
        line = l_struct[0]
        y_pos = board_height - l_idx - 1
        x_pos = ((board_width - m_width)/2) + l_struct[1]
        birthday.append(ScrollText(line, 0, y_pos, init_x_pos=x_pos))

    drawables.append(confetti_fwd)
    drawables.append(confetti_bwd)
    drawables.append(birthday)

    draw_blocks(board, drawables)



if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt as exception:
        # Show the cursor
        print('\033[?25h'+('\n'*10), end='')
        exit()


#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Draws bouncing arcs to the screen."""

from __future__ import print_function
import itertools
import argparse
import random
import time
import math

from board import Board


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

def create_lines(min_vel, max_vel, blocks_count, tail_length):
    """Initializes the lines for display."""
    seed_vels = []
    for num in f_range(min_vel, max_vel, 100):
        seed_vels.append(skew_parabola(num, min_vel, max_vel))
    seed_vels = list(itertools.permutations(seed_vels, 2))

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

def main():
    """Main logic for trajectory and display."""

    parser = argparse.ArgumentParser("Displays bouncing blocks in the terminal.")
    parser.add_argument('--width', help="Number of columns wide to display",
                        type=int, default=80)
    parser.add_argument('--height', help="Number of rows high to display",
                        type=int, default=24)
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

    if max_vel is None:
        max_vel = math.floor(find_default_vel(board_height))
        max_vel = int(max_vel)


    board = Board(board_width, board_height)
    lines, seed_vels = create_lines(min_vel, max_vel,
                                    blocks_init_count, blocks_tail_length)

    clear_time = time.time()

    while True:
        # Inject new Lines if enough time has passed
        if time.time() - clear_time > blocks_inject_interval:
            board.renew()
            clear_time = time.time()
            for _ in range(blocks_inject_count):
                color = random.choice(COLORS)
                vels = random.choice(seed_vels)
                if len(lines) < blocks_max_count:
                    tmp = Line(color, tail_length=blocks_tail_length, *vels)
                    lines.append(tmp)
        board.renew()

        # Draw all non-expired lines to the board, then delete the expired lines
        expired_lines = []
        for line in lines:
            if blocks_expire_age and line.beyond_age(blocks_expire_age):
                expired_lines.append(line)
            else:
                line.draw(board)
        for expired in expired_lines:
            lines.remove(expired)
        board.draw_board(debug_fields=["Line count: {}".format(len(lines))])



if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt as exception:
        # Show the cursor
        print('\033[?25h'+('\n'*10), end='')
        exit()


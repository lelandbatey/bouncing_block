#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Draws bouncing arcs to the screen."""

from __future__ import print_function
from __future__ import division
import argparse
import random
import copy
import math
import time
import os

from board import Board
from drawable import DrawableCollection, Line, ScrollText

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
        board.draw_board()
        time.sleep(0.013)


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
    try:
        t_width, t_height = os.get_terminal_size()
    except:
        import curses
        t_height, t_width = curses.initscr().getmaxyx()
        curses.endwin()
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
        print('\033[?25h', end='')
        exit()


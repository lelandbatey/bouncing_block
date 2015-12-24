# -*- coding: utf-8 -*-
"""Implements the `Drawable` and `DrawableCollection` objects. `Drawable` is an
interface for objects which can draw themselves to a `Board` object.

`DrawableCollection` is a kind of poor-mans list of `Drawable` objects. It does
not completely implement the list/collection interface, only the `append` and
`__iter__` methods."""

from __future__ import division, print_function
import itertools
import random
import time
import math

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

def random_velocities(min_vel, max_vel, count=2000):
    """Creates a list of permuted random velocities within `min_vel` and
    `max_vel`."""
    seed_vels = []
    for num in f_range(min_vel, max_vel, 100):
        seed_vels.append(skew_parabola(num, min_vel, max_vel))
    seed_vels = list(itertools.permutations(seed_vels, 2))
    seed_vels = random.sample(seed_vels, count)
    return seed_vels


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
            board[int(row)][int(col)] = self.point_val

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
            board[int(row)][int(safe_col)] = self.text[chr_pos]

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




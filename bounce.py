
from __future__ import print_function
from pprint import pformat
from time import time, sleep
import itertools
import random
import math


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
		self.fps_time = time()


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

	def draw_board(self, debug=False, debug_fields=None):
		"""Draws the board to stdout. Debug cooresponds to column and row
		labels, debug_fields is a list of additional strings to be printed at
		the bottom of the board, after the FPS counter."""

		if debug_fields is None:
			debug_fields = []
		ROW_LABEL_WIDTH = 4

		# Hide the cursor
		print('\033[?25l', end='')

		# Move the cursor up the the same number of newlines that've been
		# printed.
		if self.been_drawn:
			for _ in range(self.newlines_drawn):
				print("\r\033[1A", end="")
			self.newlines_drawn = 0

		# Print verticle column labels
		if debug:
			nums = [str(x) for x in range(self.width)]
			for line in range(0, len(max(nums, key=lambda x: len(x)))):
				# Print whitespace padding to the left of the labels to match
				# the width of the horizontal row labels
				for _ in range(ROW_LABEL_WIDTH):
					print(' ', end="")
				for num in nums:
					if len(num) <= line:
						print(' ', end="")
					else:
						print(num[line], end="")
				self.newline()

		# Print contents of board
		for row_num, row in enumerate(self.board):
			if debug:
				# Print horizontal row labels
				print(("{:>"+str(ROW_LABEL_WIDTH)+"}").format(row_num), end="")
			for col_num, col in enumerate(row):
				print(col, end="")
			self.newline()

		# Measure and print the number of frames printed in the last second
		self.draw_count += 1
		if time() - self.fps_time >= 1:
			self.fps = self.draw_count
			self.draw_count = 0
			self.fps_time = time()
		print('FPS: ', self.fps, end="")
		self.newline()

		for entry in debug_fields:
			print(entry, end="")
			self.newline()


		# Show the cursor
		print('\033[?25h', end='')
		self.been_drawn = True

	def newline(self):
		self.newlines_drawn += 1
		print()



class Trajectory(object):
	"""Simulates the trajectory of an object."""
	def __init__(self, x_vel=5, y_vel=20):
		self.start_time = time()
		self.jump_start = self.start_time
		self.init_x_vel = x_vel
		self.init_y_vel = y_vel

		# A little bit of randomness for variety of trajectories.
		grav_delta = random.randint(-1, 1) * random.random()
		self.gravity = -9.8 + grav_delta

	def get_y_pos(self):
		t_diff = time() - self.jump_start
		t_diff *= 2
		# y = init_y_velocity * t + 0.5 * gravity * t**2
		y_pos = self.init_y_vel * t_diff + 0.5 * self.gravity * t_diff**2

		# Restart the bounce when it would otherwise fall below zero.
		if y_pos <= 0.0:
			y_pos = 0.0
			self.jump_start = time()
		return y_pos

	def get_x_pos(self):
		t_diff = time() - self.start_time
		return self.init_x_vel * t_diff

class Line(object):
	"""Provides color and drawing logic for a trajectory."""
	def __init__(self, color_str, x_vel, y_vel, tail_length=1):
		"""Initialize the child trajectory and other values."""
		self.traj = Trajectory(x_vel, y_vel)
		self.point_val = color_str+' '+'\033[0m'
		self.tail_length = tail_length
		self.points = []

	def draw(self, board):
		"""Draws this lines points to the board, with points being derived from
		this instances 'Trajectory' property."""
		y_pos = self.traj.get_y_pos()
		row = (board.height-1) - math.floor(y_pos)
		col = math.floor(self.traj.get_x_pos()) % board.width

		if [row, col] not in self.points:
			self.points.append([row, col])

		if len(self.points) > self.tail_length:
			self.points = self.points[-self.tail_length:]

		for row, col in self.points:
			board[row][col] = self.point_val

	def beyond_age(self, given_age):
		"""Returns true if this Line object is as old or older than the given
		age, in seconds."""
		current_age = time() - self.traj.start_time
		if current_age >= given_age:
			return True
		return False


def sigmoid_skew(low, high):
	init = [x/100 for x in range(100*low, 100*high)]
	sig_low = 0
	sig_high = 12

	cum = (sig_high - sig_low)/len(init)
	sigmoid = []
	for pos in range(0, len(init)):
		val = 1/(1+math.e**(-((cum*pos)-6)))
		sigmoid.append(val)
	assert len(sigmoid) == len(init)
	dist = [high*sigmoid[x] for x in range(len(sigmoid))]
	dist = [x for x in dist if x >= low and x <= high]
	return dist



def main():

	BOARD_HEIGHT = 37
	BOARD_WIDTH = 159
	board = Board(BOARD_WIDTH, BOARD_HEIGHT)


	LINES_INITIAL_COUNT = 10
	LINES_INJECTED_COUNT = 15
	LINES_INJECT_INTERVAL = 0.5
	LINES_MAX_COUNT = 300

	LINES_MIN_VELOCITY = 8
	LINES_MAX_VELOCITY = 24

	LINES_EXPIRE_AGE = 8

	LINES_TAIL_LENGTH = 1



	# random.seed(2)
	# seed_vels = [x/100 for x in range(100*8, 100*33)]
	seed_vels = sigmoid_skew(LINES_MIN_VELOCITY, LINES_MAX_VELOCITY)
	seed_vels = list(itertools.permutations(seed_vels, 2))

	traj_vels = random.sample(seed_vels, LINES_INITIAL_COUNT)
	colors = [
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

	lines = []
	for idx in range(max(len(traj_vels), len(colors))):
		vels = traj_vels[idx%len(traj_vels)]
		color = colors[idx%len(colors)]
		lines.append(Line(color, tail_length=LINES_TAIL_LENGTH, *vels))

	clear_time = time()
	while True:

		# Inject new Lines if enough time has passed
		if time() - clear_time > LINES_INJECT_INTERVAL:
			board.renew()
			clear_time = time()
			for _ in range(LINES_INJECTED_COUNT):
				color = random.sample(colors, 1)[0]
				vels = random.sample(seed_vels, 1)[0]
				if len(lines) < LINES_MAX_COUNT:
					tmp = Line(color, tail_length=LINES_TAIL_LENGTH, *vels)
					lines.append(tmp)
		board.renew()

		# Draw all non-expired lines to the board, then delete the expired lines
		expired_lines = []
		for line in lines:
			if LINES_EXPIRE_AGE and line.beyond_age(LINES_EXPIRE_AGE):
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


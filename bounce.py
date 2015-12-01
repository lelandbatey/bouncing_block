
from __future__ import print_function
from pprint import pformat
from time import time, sleep
import itertools
import random
import math


class Board(object):
	"""Represents a two dimensional array of cells."""
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
		self.board = [[' ' for _ in range(self.width)] for _ in range(self.height)]

	def __iter__(self):
		for row in self.board:
			yield row
	def __getitem__(self, key):
		return self.board[key]

	def draw_board(self):
		ROW_LABEL_WIDTH = 4

		# Hide the cursor
		print('\033[?25l', end='')

		if self.been_drawn:
			for _ in range(self.newlines_drawn):
				print("\r\033[1A", end="")
			self.newlines_drawn = 0

		# Print verticle column labels
		# nums = [str(x) for x in range(self.width)]
		# for line in range(0, len(max(nums, key=lambda x: len(x)))):
			# for _ in range(ROW_LABEL_WIDTH):
				# print(' ', end="")
			# for num in nums:
				# if len(num) <= line:
					# print(' ', end="")
				# else:
					# print(num[line], end="")
			# self.newline()

		for row_num, row in enumerate(self.board):
			print(("{:>"+str(ROW_LABEL_WIDTH)+"}").format(row_num), end="")
			for col_num, col in enumerate(row):
				print(col, end="")
			self.newline()

		self.draw_count += 1
		if time() - self.fps_time >= 1:
			self.fps = self.draw_count
			self.draw_count = 0
			self.fps_time = time()
		print('FPS: ', self.fps, end="")
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

	def get_y_pos(self):
		t_diff = time() - self.jump_start
		t_diff *= 2
		gravity = -9.8
		# y = init_y_velocity * t + 0.5 * gravity * t**2
		y_pos = self.init_y_vel * t_diff + 0.5 * gravity * t_diff**2
		if y_pos <= 0.0:
			y_pos = 0.0
			# self.init_x_vel /= 2
			self.jump_start = time()
		return y_pos

	def get_x_pos(self):
		t_diff = time() - self.start_time
		return self.init_x_vel * t_diff

class Line(object):
	def __init__(self, color_str, x_vel, y_vel):
		self.traj = Trajectory(x_vel, y_vel)
		self.point_val = color_str+' '+'\033[0m'
		self.point_limit = 3
		self.points = []
	def draw(self, board):
		y_pos = self.traj.get_y_pos()
		row = (board.height-1) - math.floor(y_pos)
		col = math.floor(self.traj.get_x_pos()) % board.width

		if [row, col] not in self.points:
			self.points.append([row, col])

		if len(self.points) > self.point_limit:
			self.points = self.points[-self.point_limit:]

		for row, col in self.points:
			board[row][col] = self.point_val
		# board[row][col] = self.point_val


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
	dist = [init[x]*sigmoid[x] for x in range(len(sigmoid))]
	dist = [x for x in dist if x >= low and x <= high]
	return dist



def main():
	board = Board(151, 37)

	# random.seed(2)
	# seed_vels = [7, 8, 9, 10, 11, 13, 17, 19, 21, 23, 24, 26]
	# seed_vels = [x/100 for x in range(100*8, 100*26)]
	seed_vels = sigmoid_skew(8, 26)

	traj_vels = random.sample(list(itertools.permutations(seed_vels, 2)), 400)
	# colors = ["\033[48;5;{}m".format(x) for x in range(22, 58)]+\
			 # ["\033[48;5;{}m".format(x) for x in range(88, 130)]+\
			 # ["\033[48;5;{}m".format(x) for x in range(160, 202)]
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
		# "\033[0;42m",
		# "\033[1;43m",
		# "\033[0;44m",
		# "\033[0;45m",
		# "\033[0;46m",
	]

	lines = []
	for idx in range(max(len(traj_vels), len(colors))):
		vels = traj_vels[idx%len(traj_vels)]
		color = colors[idx%len(colors)]
		lines.append(Line(color, *vels))

	clear_time = time()
	while True:
		if time() - clear_time > 5:
			board.renew()
			clear_time = time()
		board.renew()
		for line in lines:
			line.draw(board)
		board.draw_board()
		# sleep(0.01)


	return
	traj = Trajectory(11, 19)
	while True:
		y_pos = traj.get_y_pos()
		row = (board.height-1) - math.floor(y_pos)
		col = math.floor(traj.get_x_pos()) % board.width
		# board.renew()
		board[row][col] = '\033[0;41m'+' '+'\033[0m'
		board.draw_board()
		# sleep(0.005)



if __name__ == '__main__':
	try:
		main()
	except KeyboardInterrupt as exception:
		# Show the cursor
		print('\033[?25h'+('\n'*10), end='')
		exit()

	# draw_board(Board())


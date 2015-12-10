#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

#include "board.c"
#include "trajectory.c"
#include "bounce_utils.h"


int main(void) {

	int BOARD_HEIGHT = 37;
	int BOARD_WIDTH = 159;

	int TRAJ_COUNT = 900;

	int MIN_VEL = 8;
	int MAX_VEL = 24;

	int j = 0;

	Trajectory* trajectories[TRAJ_COUNT];
	for (j = 0; j < TRAJ_COUNT; j++){
		double x_vel = rand_float_range(MIN_VEL, MAX_VEL);
		double y_vel = rand_float_range(MIN_VEL, MAX_VEL);

		y_vel = skew_parabola(y_vel, MIN_VEL, MAX_VEL);

		char* color = random_color();
		trajectories[j] = traj_create(x_vel, y_vel, color);
	}

	Board* b = board_create(BOARD_WIDTH, BOARD_HEIGHT);

	int i = 70000;


	while (i--){
		board_renew(b);
		for (j = 0; j < TRAJ_COUNT; j++){
			traj_draw(trajectories[j], b);
		}
		board_draw(b);
		usleep(10000);
	}

	return 0;
}

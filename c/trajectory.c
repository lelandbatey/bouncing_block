#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <errno.h>

#include "bounce_utils.h"
/*#include "board.h"*/
#include "trajectory.h"


Trajectory* traj_create(double x_vel, double y_vel, char* color){
	Trajectory* self = malloc(sizeof(Trajectory));

	self->color = strdup(color);

	self->start_time = get_time() - (rand_float() * rand_float());
	self->jump_begin_time = get_time();

	self->init_x_vel = x_vel;
	self->init_y_vel = y_vel;

	// A float that's either -1, 0, or 1
	float delta_factor = ((float)(random()%3)) - 1.0;
	// Some floating point number between zero and one
	float grav_delta =  rand_float();

	self->gravity = (-9.8) + (grav_delta * delta_factor);

	return self;
}


double traj_getx(Trajectory* self){
	double t_diff = get_time() - self->start_time;
	return self->init_x_vel * t_diff;
}


double traj_gety(Trajectory* self){
	double t_diff = get_time() - self->jump_begin_time;
	// Speeds up the bouncing
	t_diff *= 2;
	double y_pos = self->init_y_vel * t_diff + 0.5 * self->gravity * pow(t_diff, 2.0);

	/*printf("t_diff: %lf\n", t_diff);*/
	/*printf("y_pos : %lf\n", y_pos);*/
	if (y_pos <= 0.0){
		y_pos = 0.0;
		self->jump_begin_time = get_time();
	}
	return y_pos;
}


void traj_draw(Trajectory* self, Board* board){
	double y_pos = traj_gety(self);
	int row = floor(y_pos);
	int col = ((int)floor(traj_getx(self))) % (board->width);

	board_set_cell(board, col, row, self->color);
}

int traj_beyond_age(Trajectory* self, double given_age){
	double current_age = get_time() - self->start_time;
	if (current_age >= given_age){
		return 1;
	}
	return 0;
}



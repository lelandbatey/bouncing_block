
#ifndef _XOPEN_SOURCE
#define _XOPEN_SOURCE 700
#endif

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <errno.h>
#include <stdint.h>

#include "bounce_utils.h"
#include "trajectory.h"


Trajectory* traj_create(double x_vel, double y_vel, uint8_t* color){
	Trajectory* self = malloc(sizeof(Trajectory));

	self->color = (uint8_t*)strdup((char*)color);

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

void traj_destroy(Trajectory* self){
	free(self->color);
	free(self);
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


Trajectory_settings* traj_settings_create(){
	Trajectory_settings* self = malloc(sizeof(Trajectory_settings));
	self->max_count = 500;
	self->init_count = 300;

	self->inject_count = 10;
	self->inject_interval = 0.5;

	self->min_velocity = 8;
	self->max_velocity = 24;
	
	return self;
}
void traj_settings_destroy(Trajectory_settings* self){
	free(self);
}





#pragma once
#include <stdint.h>

#include "bounce_utils.h"
#include "board.h"

typedef struct {
	double start_time;
	double jump_begin_time;

	double init_x_vel;
	double init_y_vel;

	uint8_t* color;

	float gravity;
} Trajectory;


Trajectory* traj_create(double x_vel, double y_vel, uint8_t* color);
void traj_destroy(Trajectory* self);
double traj_getx(Trajectory* self);
double traj_gety(Trajectory* self);
void traj_draw(Trajectory* self, Board* board);
int traj_beyond_age(Trajectory* self, double given_age);


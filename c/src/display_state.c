
#ifndef _XOPEN_SOURCE
#define _XOPEN_SOURCE 700
#endif

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>

#include "display_state.h"

#include "board.h"
#include "trajectory.h"
#include "linked_list.h"
#include "bounce_utils.h"


Display_state* disp_create(int64_t width, int64_t height){
	Display_state* self = malloc(sizeof(Display_state));
	self->settings = traj_settings_create();
	self->last_inject_time = get_time();
	self->dboard = board_create(width, height);
	return self;
}

Display_state* disp_create_trajectories(Display_state* self){
	self->trajectories = List_create();
	for (int64_t i = 0; i < self->settings->init_count; i++){
		int64_t min_vel = self->settings->min_velocity;
		int64_t max_vel = self->settings->max_velocity;
		double x_vel = rand_float_range(min_vel, max_vel);
		double y_vel = rand_float_range(min_vel, max_vel);

		y_vel = skew_parabola(y_vel, min_vel, max_vel);

		uint8_t* color = random_color();
		List_push(self->trajectories, traj_create(x_vel, y_vel, color));
	}

	return self;
}

void disp_destroy(Display_state* self){
	// Destroy each trajectory
	LIST_FOREACH(self->trajectories, first, next, cur){
		traj_destroy((Trajectory*)cur->value);
	}
	// Destroy the list of trajectories
	List_destroy(self->trajectories);

	board_destroy(self->dboard);
	traj_settings_destroy(self->settings);
	free(self);
}

char* disp_get_frame(Display_state* self){
	Trajectory_settings* settings = self->settings;
	List* trajectories = self->trajectories;

	// Inject trajectories
	if (get_time() - self->last_inject_time > settings->inject_interval){
		self->last_inject_time = get_time();
		for (int64_t i = 0; i < settings->inject_count; i++){
			int64_t min_vel = settings->min_velocity;
			int64_t max_vel = settings->max_velocity;
			double x_vel = rand_float_range(min_vel, max_vel);
			double y_vel = rand_float_range(min_vel, max_vel);

			y_vel = skew_parabola(y_vel, min_vel, max_vel);

			uint8_t* color = random_color();
			if (List_count(trajectories) < settings->max_count){
				List_push(trajectories, traj_create(x_vel, y_vel, color));
			}
		}
	}
	// Refresh and redraw board
	board_renew(self->dboard);
	LIST_FOREACH(trajectories, first, next, cur){
		traj_draw((Trajectory*)cur->value, self->dboard);
	}

	char* frame = board_get_frame(self->dboard);
	return frame;
}



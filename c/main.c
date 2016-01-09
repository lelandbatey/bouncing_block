

// Allows for printing of preprocessor values
#define STRING2(x) #x
#define STRING(x) STRING2(x)

#ifndef _XOPEN_SOURCE
#define _XOPEN_SOURCE 700
#endif

#include <stdio.h>
#include <stdlib.h>
#include <time.h> /* nanosleep */
#include <stdint.h>

#include <getopt.h> /* getopt */

#include "board.c"
#include "trajectory.c"
#include "bounce_utils.h"
#include "linked_list.c"

void sleep_hundredth(){
	struct timespec tim0, tim1;
	tim0.tv_sec = 0;
	// One one-hundredth of a second, in nanoseconds
	tim0.tv_nsec = 10000000L;
	nanosleep(&tim0, &tim1);
}

void print_usage(){
	printf("%s", "TODO: implement usage");
}

int main(int argc, char *const *argv) {

	int BOARD_HEIGHT = 37;
	int BOARD_WIDTH = 159;

	int TRAJ_COUNT = 900;
	int TRAJ_INIT_COUNT = 300;

	int INJECT_COUNT = 10;
	double INJECT_INTERVAL = 0.5;

	int MIN_VEL = 8;
	int MAX_VEL = 24;

	int j = 0;


	int max_vel_passed = 0;

	int opt = 0;
	//Specifying the expected options
	static struct option long_options[] = {
		{"width",   required_argument, 0,  'x' },
		{"height",  required_argument, 0,  'y' },
		{"max_vel", required_argument, 0,  'v' },
		{"help",    no_argument,       0,  'h' },
		{0,         0,                 0,   0  }
	};

	int option_index = 0;
	while ((opt = getopt_long(argc, argv, "x:y:",
				long_options, &option_index )) != -1) {
		switch (opt) {
			// `optarg` is a global variable from getopt.h
			case 'x' : BOARD_WIDTH = atoi(optarg);
				break;
			case 'y' : BOARD_HEIGHT = atoi(optarg);
				break;
			case 'v' : max_vel_passed = 1; MAX_VEL = atoi(optarg);
				break;
			case 'h' : print_usage(); exit(0);
			default: print_usage();
				exit(EXIT_FAILURE);
		}
	}
	if (!max_vel_passed){
		MAX_VEL = default_vel(BOARD_HEIGHT);
	}


	/*Trajectory* trajectories[TRAJ_COUNT];*/
	List* trajectories = List_create();
	for (j = 0; j < TRAJ_INIT_COUNT; j++){
		double x_vel = rand_float_range(MIN_VEL, MAX_VEL);
		double y_vel = rand_float_range(MIN_VEL, MAX_VEL);

		y_vel = skew_parabola(y_vel, MIN_VEL, MAX_VEL);

		uint8_t* color = random_color();
		List_push(trajectories, traj_create(x_vel, y_vel, color));
	}

	Board* b = board_create(BOARD_WIDTH, BOARD_HEIGHT);

	int i = 70000;

	double clear_time = get_time();

	while (i--){
		if (get_time() - clear_time > INJECT_INTERVAL){
			clear_time = get_time();
			for (j = 0; j < INJECT_COUNT; j++){
				double x_vel = rand_float_range(MIN_VEL, MAX_VEL);
				double y_vel = rand_float_range(MIN_VEL, MAX_VEL);

				y_vel = skew_parabola(y_vel, MIN_VEL, MAX_VEL);

				uint8_t* color = random_color();
				if (List_count(trajectories) < TRAJ_COUNT){
					List_push(trajectories, traj_create(x_vel, y_vel, color));
				}
			}
		}
		board_renew(b);
		LIST_FOREACH(trajectories, first, next, cur){
			traj_draw((Trajectory*)cur->value, b);
		}
		board_draw(b);
		sleep_hundredth();
	}

	return 0;
}

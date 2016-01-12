

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

/*#include "board.h"*/
/*#include "trajectory.h"*/
#include "display_state.h"
#include "bounce_utils.h"
#include "linked_list.h"

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

	// int MIN_VEL = 8;
	int MAX_VEL = 24;

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

	Display_state* display = disp_create(BOARD_WIDTH, BOARD_HEIGHT);

	if (!max_vel_passed){
		display->settings->max_velocity = default_vel(BOARD_HEIGHT);
	} else {
		display->settings->max_velocity = MAX_VEL;
	}

	display = disp_create_trajectories(display);
	int i = 10;
	while (i--){
		char* frame = disp_get_frame(display);
		printf("%s", frame);
		free(frame);
		sleep_hundredth();
	}
	disp_destroy(display);
	return 0;
}

#pragma once

#ifndef _XOPEN_SOURCE
#define _XOPEN_SOURCE 700
#endif

#include <sys/time.h> /* gettimeofday() */
#include <stdlib.h> /* random() */
#include <math.h> /* pow() */
#include <stdint.h>

// Return the current time as a double-precision floating point
// representing number of seconds which have passed since Epoch.
double get_time(){
	struct timeval now;
	gettimeofday(&now, 0);

	double to_ret = 0.0;

	to_ret = now.tv_sec + (now.tv_usec / 1000000.0);
	return to_ret;
}

// Return a random floating point number between 0 and 1
double rand_float(){
	return ((double)random() / (double)RAND_MAX);
}

// Return a random floating point number between min and max
double rand_float_range(double min, double max){
	double base = max - min;
	base = rand_float() * base;
	return base + min;
}


int COLOR_COUNT = 12;
char* COLORS[] = {
	"\033[48;5;197m \033[0m", // Pink
	"\033[48;5;162m \033[0m", // Magenta
	"\033[48;5;54m \033[0m", // Purple
	"\033[48;5;196m \033[0m", // Red
	"\033[48;5;34m \033[0m", // Green
	"\033[48;5;35m \033[0m", // Green
	"\033[48;5;40m \033[0m", // Green
	"\033[48;5;19m \033[0m", // Blue
	"\033[48;5;20m \033[0m", // Blue
	"\033[48;5;39m \033[0m", // Blue
	"\033[48;5;226m \033[0m", // Yellow
	"\033[48;5;229m \033[0m", // Yellow
	"\033[48;5;208m \033[0m", // Orange
};

uint8_t* random_color(){
	return (uint8_t*)COLORS[random() % COLOR_COUNT];
}

// Given a `number` and the start and end of the range that number is found in,
// scale that number up by a factor. That factor is the result of taking the
// relative position of `number` within the range as a floating point value
// from 0 to 1, then feeding that value into the following equation for a
// parabola:
//     1 - ((x-1)^2)
double skew_parabola(double num, double low, double high){
	double width = high - low;
	double scaled = (num - low)/width;
	double skew_val = 1 - pow(scaled-1, 2);

	return skew_val*width + low;
}


// Calculate a max velocity for a given height of the display, such that lines
// will not vertically wrap around.
int default_vel(int height){
	// Since there's a random delta applied to the gravity of each line, and
	// that delta could be as much as -1, we calculate the max height using the
	// lowest possible gravity that could arise.
	double gravity = -8.8;
	double vel = sqrt(-(2 * gravity * height));

	return (int)(floor(vel));
}




#pragma once

#ifndef _XOPEN_SOURCE
#define _XOPEN_SOURCE 700
#endif

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <inttypes.h>

#include "board.h"
#include "bounce_utils.h"

Board* board_create(int64_t width, int64_t height){
	Board* self = malloc(sizeof(Board));

	self->width = width;
	self->height = height;

	self->been_drawn = 0;
	self->draw_count = 0;
	self->fps = 0;
	self->fps_time = get_time();

	self->board = malloc(height*sizeof(uint8_t***));

	int row, col;
	for (row = 0; row < height; row++){
		self->board[row] = malloc(width*sizeof(uint8_t**));
		for (col = 0; col < width; col++){
			self->board[row][col] = (uint8_t*)strdup("0");
		}
	}

	return self;
}


void board_renew(Board* self){
	int row, col;
	for (row = 0; row < self->height; row++){
		for (col = 0; col < self->width; col++){
			free(self->board[row][col]);
			self->board[row][col] = 0;
			self->board[row][col] = (uint8_t*)strndup(" ", 1);
		}
	}
}

void board_set_cell(Board* self, int64_t x, int64_t y, uint8_t* val){
	// By reflecting y, the board is zero indexed from the bottom left corner
	// instead of the top left.
	y = (self->height-1) - y;
	if (y < 0){
		// Negative indeces are remaped to LENGTH-N, where LENGTH is the height
		// of the board, and N is y. Behavior is similar to Python's array[-1].
		while (y < 0){
			y += self->height;
		}
	}
	x = x % self->width;

	free(self->board[y][x]);
	self->board[y][x] = 0;

	self->board[y][x] = (uint8_t*)strdup((char*)val);
}

void board_newline(Board* self){
	self->newlines_drawn++;
	printf("\n");
}

void board_draw(Board* self){

	// Hide the cursor
	/*printf("\033[?25l");*/

	if (self->been_drawn){
		while (self->newlines_drawn){
			printf("\r\033[1A");
			self->newlines_drawn--;
		}
	}

	int row, col;
	for (row = 0; row < self->height; row++){
		for (col = 0; col < self->width; col++){
			printf("%s", self->board[row][col]);
		}
		board_newline(self);
	}

	self->draw_count += 1;
	if (get_time() - self->fps_time >= 1.0){
		self->fps = self->draw_count;
		self->draw_count = 0;
		self->fps_time = get_time();
	}
	printf("FPS: %" PRId64, self->fps);
	board_newline(self);

	// Show the cursor
	printf("\033[?25h");
	self->been_drawn = 1;

}






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
	Board* self = calloc(1, sizeof(Board));

	self->width = width;
	self->height = height;

	self->been_drawn = 0;
	self->draw_count = 0;
	self->fps = 0;
	self->fps_time = get_time();

	self->sboard = calloc(height, sizeof(uint8_t***));

	for (int row = 0; row < height; row++){
		self->sboard[row] = calloc(width, sizeof(uint8_t**));
		for (int col = 0; col < width; col++){
			self->sboard[row][col] = (uint8_t*)strdup("0");
		}
	}

	return self;
}

void board_destroy(Board* self){
	// Free all the cells in the board
	for (int row = 0; row < self->height; row++){
		for (int col = 0; col < self->width; col++){
			free(self->sboard[row][col]);
		}
		free(self->sboard[row]);
	}
	free(self->sboard);
	free(self);
}

void board_renew(Board* self){
	for (int row = 0; row < self->height; row++){
		for (int col = 0; col < self->width; col++){
			free(self->sboard[row][col]);
			self->sboard[row][col] = 0;
			self->sboard[row][col] = (uint8_t*)strndup(" ", 1);
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

	free(self->sboard[y][x]);
	self->sboard[y][x] = 0;

	self->sboard[y][x] = (uint8_t*)strdup((char*)val);
}

void board_newline(Board* self){
	self->newlines_drawn++;
	printf("\n");
}

void board_draw(Board* self){
	char* frame = board_get_frame(self);
	printf("%s", frame);
	free(frame);
	return;
}


char* board_get_frame(Board* self){
	char* to_ret = calloc(2, sizeof(char));
	to_ret[0] = ' ';
	to_ret[1] = '\0';
	if (self->been_drawn){
		while (self->newlines_drawn){
			to_ret = str_concat(to_ret, "\r\033[1A");
			self->newlines_drawn--;
		}
	}

	int row, col;
	for (row = 0; row < self->height; row++){
		for (col = 0; col < self->width; col++){
			to_ret = str_concat(to_ret, (char*)(self->sboard[row][col]));
		}
		/*board_newline(self);*/
		to_ret = str_concat(to_ret, "\n");
		self->newlines_drawn++;
	}

	self->draw_count += 1;
	if (get_time() - self->fps_time >= 1.0){
		self->fps = self->draw_count;
		self->draw_count = 0;
		self->fps_time = get_time();
	}
	char* temp_str = calloc(15, sizeof(char));
	sprintf(temp_str, "FPS: %" PRId64 "\n", self->fps);
	to_ret = str_concat(to_ret, temp_str);
	free(temp_str);
	self->newlines_drawn++;

	self->been_drawn = true;

	return to_ret;
}



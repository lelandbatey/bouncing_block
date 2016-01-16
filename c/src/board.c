
#ifndef _XOPEN_SOURCE
#define _XOPEN_SOURCE 700
#endif

#include <stdio.h>
#include <stdlib.h>
#include <string.h> /* strlen, strdup */
#include <stdint.h>
#include <inttypes.h>

#include <assert.h>

#include "board.h"
#include "bounce_utils.h"

Board* board_create(int32_t width, int32_t height){
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
			self->sboard[row][col] = calloc(BOARD_CELL_LEN, sizeof(uint8_t*));
		}
	}

	// Calculate the length of buffer to alloc for `canvas`
	int32_t up_count = self->height + 1;
	int32_t up_len = 5;

	int32_t endl_count = up_count;
	int32_t endl_len = 2;

	int32_t cell_count = self->width * self->height;

	int32_t fps_len = 15;

	int32_t canvas_len = (up_count * up_len) +
	                     (endl_count * endl_len) +
	                     (cell_count * BOARD_CELL_LEN) +
						 fps_len;
	self->canvas = calloc(canvas_len, sizeof(uint8_t));

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
	free(self->canvas);
	free(self);
}

void board_renew(Board* self){
	for (int row = 0; row < self->height; row++){
		for (int col = 0; col < self->width; col++){
			uint8_t* cell = self->sboard[row][col];
			cell[0] = ' ';
			cell[1] = '\0';
		}
	}
}

void board_set_cell(Board* self, int32_t x, int32_t y, uint8_t* val){
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

	uint8_t* cell = self->sboard[y][x];

	int32_t val_count = 0;
	while ((val[val_count] != '\0') && (val_count < BOARD_CELL_LEN)){
		cell[val_count] = val[val_count];
		val_count++;
	}
	cell[val_count] = '\0';
}

void board_draw(Board* self){
	char* frame = board_get_frame(self);
	printf("%s", frame);
}


char* board_get_frame(Board* self){

	int32_t ret_pos = 0;

	// Add the "move up" command strings. One for each row and one for fps line
	if (self->been_drawn){
		for (int32_t i = 0; i < (self->height + 1); i++){
			char* up_str = "\r\033[1F";
			while (*up_str != '\0'){
				self->canvas[ret_pos] = *up_str;
				up_str++;
				ret_pos++;
			}
		}
	}

	// Copy contents of sboard into return string
	for (int32_t row = 0; row < self->height; row++){
		for (int32_t col = 0; col < self->width; col++){

			uint8_t* cell = self->sboard[row][col];
			while (*cell != '\0'){
				self->canvas[ret_pos] = *cell;
				cell++;
				ret_pos++;
			}
		}
		// Add newlines to end of row
		self->canvas[ret_pos] = '\r';
		self->canvas[ret_pos+1] = '\n';
		ret_pos += 2;

		self->newlines_drawn++;
	}

	// Rest fps counter
	if (get_time() - self->fps_time >= 1.0){
		self->fps = self->draw_count;
		self->draw_count = 0;
		self->fps_time = get_time();
	}
	self->draw_count += 1;


	// Create and append fps string
	char fps_str[15];
	sprintf(fps_str, "FPS: %" PRId32 "\r\n", self->fps);
	for (int32_t i = 0; fps_str[i] != '\0'; i++){
		self->canvas[ret_pos] = fps_str[i];
		ret_pos++;
	}

	self->canvas[ret_pos] = '\0';
	self->newlines_drawn++;

	self->been_drawn = true;

	return (char*)self->canvas;
}



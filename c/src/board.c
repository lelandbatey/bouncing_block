
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

int int_width(int in){
	if (!in){
		return 1;
	}
	int width = 0;
	while (in){
		width++;
		in = in/10;
	}
	return width;
}

char* board_get_frame(Board* self){
	char* to_ret = calloc(1, sizeof(char));
	to_ret[0] = '\0';

	int32_t up_len = 0;
	if (self->been_drawn){
		while (self->newlines_drawn){
			up_len += 5;
			to_ret = str_concat(to_ret, "\r\033[1F");
			self->newlines_drawn--;
		}
	}
	/*int32_t up_len_actual = strlen(to_ret);*/

	int32_t cell_len = 0;
	/*int32_t cell_len_actual = 0;*/
	int row, col;
	for (row = 0; row < self->height; row++){
		for (col = 0; col < self->width; col++){
			cell_len += strlen((char*)self->sboard[row][col]);
			to_ret = str_concat(to_ret, (char*)(self->sboard[row][col]));
		}
		// Use of the '\r' is necessary to ensure proper display in all
		// terminal emulators.
		to_ret = str_concat(to_ret, "\r\n");
		self->newlines_drawn++;
	}
	/*cell_len_actual = strlen(to_ret) - (2 * self->newlines_drawn) - up_len_actual;*/


	if (get_time() - self->fps_time >= 1.0){
		self->fps = self->draw_count;
		self->draw_count = 0;
		self->fps_time = get_time();
	}
	self->draw_count += 1;


	/*int32_t fps_len = 5 + int_width(self->fps);*/
	char* temp_str = calloc(15, sizeof(char));
	sprintf(temp_str, "FPS: %" PRId32 "\r\n", self->fps);
	int32_t fps_len = strlen(temp_str)-2;
	to_ret = str_concat(to_ret, temp_str);
	free(temp_str);
	self->newlines_drawn++;

	self->been_drawn = true;

	int32_t calc_len = (self->newlines_drawn * 2) +
		               (up_len) +
					   cell_len + fps_len;

	/*printf("cell_len_actual: %d\n", cell_len_actual);*/
	/*printf("Actual 'up_len' added: %d\n", up_len_actual);*/
	/*printf("fps_len_actual: %d\n", fps_len_actual);*/

	printf("up_len: %d\n", up_len);
	printf("endl_len: %d\n", self->newlines_drawn*2);
	printf("cell_len: %d\n", cell_len);
	printf("fps: %d\n", self->fps);
	printf("fps_len: %d\n", fps_len);
	printf("calc length: %d\n", calc_len);
	printf("actual length: %zu\n\n\n", strlen(to_ret));
	/*printf("%zu\n", strlen(to_ret));*/

	return to_ret;
}

// Get the contents of the board quickly.
char* fast_get_frame(Board* self){

	int32_t all_cells_len = 0;

	for (int32_t row = 0; row < self->height; row++){
		for (int32_t col = 0; col < self->width; col++){
			uint8_t* cell = self->sboard[row][col];
			int32_t len = strlen((char*)cell);

			all_cells_len += len;
		}
	}

	// Calculate number of "up" control sequences to be printed
	int32_t up_len = 0;
	if (self->been_drawn){
		up_len = 5 * self->newlines_drawn;
	}
	// Calculate number of newlines will be printed. One for each row, plus one
	// for the fps line.
	int32_t endl_len = 2 * (self->height+1);

	// Length of the FPS string *not including the number*
	char* fps_str = calloc(15, sizeof(char));
	sprintf(fps_str, "FPS: %" PRId32 "\r\n", self->fps);
	int32_t fps_len = strlen(fps_str)-2;

	int32_t total_len = up_len + endl_len + all_cells_len + fps_len + 5;

	/*printf("up_len: %d\n", up_len);*/
	/*printf("endl_len: %d\n", endl_len);*/
	/*printf("cell_len: %d\n", all_cells_len);*/
	/*printf("fps: %d\n", self->fps);*/
	/*printf("fps_len: %d\n", fps_len);*/
	/*printf("calc length: %d\n\n", total_len);*/
	/*printf("%d ", total_len);*/

	char* to_ret = calloc(total_len, sizeof(char));
	int32_t ret_pos = 0;

	// Add the "move up" command strings
	for (int32_t i = 0; i < (up_len/5); i++){
		char* up_str = "\r\033[1F";
		while (*up_str != '\0'){
			to_ret[ret_pos] = *up_str;
			up_str++;
			ret_pos++;
		}
	}

	// Copy contents of sboard into return string
	for (int32_t row = 0; row < self->height; row++){
		for (int32_t col = 0; col < self->width; col++){

			uint8_t* cell = self->sboard[row][col];
			while (*cell != '\0'){
				if (ret_pos >= total_len){
					printf("Printing beyond buffer.\n");
				}
				to_ret[ret_pos] = *cell;
				cell++;
				ret_pos++;
			}
		}
		// Add newlines to end of row
		to_ret[ret_pos] = '\r';
		to_ret[ret_pos+1] = '\n';
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

	// Append fps string
	for (int32_t i = 0; fps_str[i] != '\0'; i++){
		to_ret[ret_pos] = fps_str[i];
		ret_pos++;
	}
	free(fps_str);
	self->newlines_drawn++;

	self->been_drawn = true;
	/*printf("%p\n", to_ret);*/

	return to_ret;
}



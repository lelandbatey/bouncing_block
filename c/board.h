#ifndef BOARD_H
#define BOARD_H

#include "bounce_utils.h"

typedef struct {
	int width;
	int height;

	int been_drawn;

	int newlines_drawn;
	int draw_count;
	int fps;
	double fps_time;

	// Two dimensional array of pointers to strings
	char*** board;
} Board;

Board* board_create(int width, int height);
void board_renew(Board* self);
void board_draw(Board* self);
void board_set_cell(Board* self, int x, int y, char* val);

void board_newline(Board* self);

#endif

#pragma once

#include <stdint.h>
#include <stdbool.h>

#include "bounce_utils.h"

typedef struct {
	int64_t width;
	int64_t height;

	bool been_drawn;

	int64_t newlines_drawn;
	int64_t draw_count;
	int64_t fps;
	double fps_time;

	// Two dimensional array of pointers to strings
	uint8_t*** board;
} Board;

Board* board_create(int64_t width, int64_t height);
void board_renew(Board* self);
void board_draw(Board* self);
void board_set_cell(Board* self, int64_t x, int64_t y, uint8_t* val);

void board_newline(Board* self);


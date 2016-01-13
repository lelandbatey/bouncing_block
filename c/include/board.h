#pragma once

#include <stdint.h>
#include <stdbool.h>

#include "bounce_utils.h"

/**
 * @file board.h
 * @brief Board struct and functions.
 */


/** @brief Two dimensional grid of "cells" of strings. Create with board_create().
 *
 * A board is a struct with associated helper functions for printing strings to
 * a two dimensional "grid" of cells of strings. It is used within the
 * 'bouncing_block' project to represent colored cells to be printed on a
 * terminal.
 */
typedef struct {
	int32_t width;
	int32_t height;

	bool been_drawn;

	/// Number of newlines drawn. After the board has been entirely drawn,
	/// used to move the cursor back to the top of the board.
	int32_t newlines_drawn;
	int32_t draw_count;

	/// Number of times this board has been drawn by board_draw() in the prior second
	int32_t fps;
	double fps_time;

	/// Underlying two dimensional array of pointers to strings
	uint8_t*** sboard;
} Board;

/** @brief Initialize a Board struct with a width and height, as well as it's
 *         array of strings in sboard.
 *
 *  @param width The number of cells wide the sboard should be.
 *  @param height The number of cells tall the sboard should be.
 */
Board* board_create(int32_t width, int32_t height);

/** @brief Free the component parts of the sboard before freeing the sboard and Board.
 *
 *  @param self The Board to destroy.
 */
void board_destroy(Board* self);


/** @brief Set all cells to contain only a single 'space' character. Frees all
 *         strings in the sboard.
 *
 *  @param self The Board to conduct the renew operation on.
 */
void board_renew(Board* self);

/** @brief Print the contents of the cells of the Board to stdout.
 *
 *  @param self The Board to print the cells of.
 */
void board_draw(Board* self);

/** @brief Returns a string of the current "frame" of the Board.
 *
 *  The returned string is the result of concatenating the contents of each
 *  cell from left to right, top to bottom, into one single string. This string
 *  is refered to as a "frame".
 *
 *  @brief self The Board to get the "frame" from.
 */
char* board_get_frame(Board* self);

char* fast_get_frame(Board* self);

/** @brief Set the contents of cell
 *
 *  Set the contents of cell at (x, y) from the bottom left to a copy of val.
 *
 *  @param self The Board to modify the cell of.
 *  @param x The x position of the cell, measured with left as 0, moving right
 *           as the value increases.
 *  @param y The y position of the cell, with the bottom being 0, moving up as
 *           the value increases.
 *  @param val The string to be copied into the given cell.
 */
void board_set_cell(Board* self, int32_t x, int32_t y, uint8_t* val);

void board_newline(Board* self);


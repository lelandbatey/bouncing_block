
#pragma once

#include <stdint.h>

#include "linked_list.h"
#include "trajectory.h"
#include "board.h"

/**
 * @file display_state.h
 * @brief Display_state coordinates the Board and Trajectory
 */

typedef struct {
	Trajectory_settings* settings;
	Board* dboard;
	List* trajectories;
	double last_inject_time;
} Display_state;


/** @brief Create Display_state
 *
 *  @param width The width of the board
 *  @param height The height of the board
 *  @return An initialized Display_state but trajectories is uninitialized. Use
 *          disp_create_trajectories() to initialize trajectories. This is done to
 *          allow for the changing of min and max seed velocities in
 *          Display_state->settings which controls the min and max velocities of the
 *          trajectories created in disp_create_trajectories().
 */
Display_state* disp_create(int32_t width, int32_t height);

/** @brief Initializes self->trajectories
 *
 *  @param self The Display_state to have trajectories initialized on.
 */
Display_state* disp_create_trajectories(Display_state* self);

/** @brief Free's the Display_state and member structs.
 *
 *  @param self The Display_state to be destroyed.
 */
void disp_destroy(Display_state* self);

/** @brief Update the board and return it's frame
 *
 *  @param self The Display_state to get the frame of.
 */
char* disp_get_frame(Display_state* self);


#pragma once
#include <stdint.h>

#include "bounce_utils.h"
#include "board.h"


/**
 * @file trajectory.h
 * @brief Trajectory and Trajectory_settings struct and functions.
 */



/** @brief A "trajectory", a block which bounces.
 *
 *  A block which bounces on screen, named "trajectory". Currently, the
 *  horizontal and vertical (x and y, respectively) components of the position
 *  of a trajectory are computed seperately.
 *
 *  That is, the x position is found by multiplying the age of the trajectory
 *  by the constant init_x_vel. So if init_x_vel is 5, at second 0 the x
 *  position is 0, at second 1 x is 5, and at second 2 x is 10.
 *
 *  The y position is calculated using the vertical displacement of a
 *  projectile thrown straight up:
 *  \f[
 *      y = (y_i \cdot t) + (0.5 \cdot g \cdot t^2)
 *  \f]
 *  where:
 *
 *      yi = y_initial_velocity
 *      t = time_since_beginning_of_jump
 *      g = gravity_for_trajectory
 *
 *  When the y position would drop below zero, the jump_begin_time field is reset to
 *  0 and the projectile arc begins again.
 *
 *  Note as well that each trajectory has it's own gravity that is probably not
 *  -9.8. The gravity for each trajectory is calculated by applying a small
 *  random number between -1 and 1 and adding that to -9.8. This is done to add
 *  variation to the movement of each trajectory.
 */
typedef struct {
	double start_time;
	double jump_begin_time;

	double init_x_vel;
	double init_y_vel;

	/// String with escape code color, then a space, then 'reset' escape code
	uint8_t* color;

	float gravity;
} Trajectory;

/** @brief Create trajectory
 *
 *  @param x_vel The x velocity of the trajectory.
 *  @param y_vel The initial y velocity of the trajectory.
 *  @param color String representing block of color.
 */
Trajectory* traj_create(double x_vel, double y_vel, uint8_t* color);

/** @brief Free the color, then the Trajectory itself
 *
 *  @param self The Trajectory to be freed.
 */
void traj_destroy(Trajectory* self);

/** @brief Get the current x position of the given Trajectory
 *
 *  @param self The Trajectory to get x position of.
 */
double traj_getx(Trajectory* self);

/** @brief Get the current y position of the given Trajectory
 *
 *  @param self The Trajectory to get y position of.
 */
double traj_gety(Trajectory* self);

/** @brief Draw the Trajectory to the Board
 *
 *  @param self The Trajectory to draw.
 *  @param board The Board to be drawn to.
 */
void traj_draw(Trajectory* self, Board* board);

/** @brief Check if the Trajectory is older than a given age.
 *
 *  Checks if the start_time of the given Trajectory is after the given_age.
 *
 *  @param self The Trajectory to check the age of.
 *  @param given_age The age to check the time of. Must be a double with
 *                   decimals being nanoseconds. Generally from get_time().
 */
int traj_beyond_age(Trajectory* self, double given_age);


typedef struct {
	int32_t max_count;
	int32_t init_count;

	int32_t inject_count;
	double inject_interval;

	int32_t min_velocity;
	int32_t max_velocity;
} Trajectory_settings;

Trajectory_settings* traj_settings_create();
void traj_settings_destroy(Trajectory_settings* self);



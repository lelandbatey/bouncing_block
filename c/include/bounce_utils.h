#pragma once

#ifndef _XOPEN_SOURCE
#define _XOPEN_SOURCE 700
#endif

#include <sys/time.h> /* gettimeofday() */
#include <stdlib.h> /* random() */
#include <math.h> /* pow() */
#include <stdint.h>

/**
 * @file bounce_utils.h
 * @brief Utility functions for the 'bouncing_block' project.
 */

/** @brief Returns current time as double.
 *
 *  Return the current time as a double-precision floating point representing
 *  number of seconds which have passed since Epoch, with decimals being
 *  nanoseconds.
 */
double get_time();

/**
 * @brief Return a random floating point number between 0 and 1.
 */
double rand_float();

/** @brief Return a random floating point number between min and max.
 *
 */
double rand_float_range(double min, double max);

/** @brief Get a string representing an bock of color.
 *
 *  @return Returns a string representing an ANSI escaped color sequence,
 *  followed by a space, followed by an ANSI 'reset to default' sequence. So if
 *  this string where to be printed to stdout on a compatible terminal, it
 *  would print a single colored cell.
 */
uint8_t* random_color();

 /**
  * Given a `number` and the start and end of the range that number is found in,
  * scale that number up by a factor. That factor is the result of taking the
  * relative position of `number` within the range as a floating point value
  * from 0 to 1, then feeding that value into the following equation for a
  * parabola:
  *     1 - ((x-1)^2)
  */
double skew_parabola(double num, double low, double high);


/** @brief Calculate a max velocity for a given height of the display, such
 *         that lines will not vertically wrap around.
 *
 *  @param height The maximum allowed height of a parabola.
 *  @return The maximum velocity which will not cause a parabola to reach beyond
 *          height.
 */
int default_vel(int height);

/** @brief Concatenate two strings together.
 *
 *  Creates a new string that is the result of concatenating str2 onto the end
 *  of str1, returning the new string *and freeing str1*.
 *
 *  @param str1 The first string. **This string is freed by this function.**
 *  @param str2 The second string, which is appended to string1.
 *  @return The newly created string representing the result of str1 + str2
 */
char* str_concat(char* str1, char* str2);


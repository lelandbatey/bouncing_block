Bouncing blocks -- C implementation
===================================

This is a C implementation of the [bouncing block](https://github.com/lelandbatey/bouncing_block) project. It displays bouncing blocks in the terminal.


Compiling
---------

To compile, run the command `make` in this directory. This will produce an executable named `bounce` in the `./build/` directory.


Documentation
-------------

This project is documented using Doxygen. Doxygen can be installed with `sudo apt-get install doxygen` on Debian based systems.

To generate the documentation for this project, run the command `doxygen Doxyfile` in this directory.


Using the JS Version
--------------------

This C implementation has been written to be compatible and usable with Emscripten. There is a js-compiled version of this in the `js/` folder. To access, you will need to serve that directory from an HTTP server. For quick experimentation, I recommend the following:

	cd js/
	python -m SimpleHTTPServer

Then visit `http://localhost:8000/` in your web browser.

Additionally, if you've made modifications to the C source and would like to compile them into the JS library, you can compile them with Emscripten and the following command:

	emcc -g -Wall -Wextra -std=c11 -Isrc -Iinclude -O3 \
		src/board.c src/bounce_utils.c src/display_state.c src/linked_list.c src/trajectory.c \
		-o js/bounce.js \
		-s EXPORTED_FUNCTIONS="['_get_time', '_disp_create', '_disp_create_trajectories', '_disp_get_frame']" \
		-s ASSERTIONS=1



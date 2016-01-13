
# Set up source file and ouput directories
ODIR=bin
IDIR=include
SRCDIR=src

# The "-I{something}" tells the compiler to include those directories when
# searching for system headers specified in source code via system header
# notation (e.g. "include <stdio.h>")
#CFLAGS=-g -O2 -Wall -Wextra -static -std=c11 -I$(SRCDIR) -I$(IDIR) -rdynamic -DNDEBUG $(OPTFLAGS)
CFLAGS=-g -O2 -Wall -Wextra -std=c11 -I$(SRCDIR) -I$(IDIR) -rdynamic $(OPTFLAGS)
LDFLAGS=-lm $(OPTLIBS)


# Gather list of all *.c files in `src/` and in direct child directories to
# `src/`. Create an objects file list from the list of c files. Compilation of
# '.c' files in subdirectories of `src/` will not work at this time.
SOURCES=$(wildcard $(SRCDIR)/**/*.c $(SRCDIR)/*.c)
OBJECTS=$(patsubst $(SRCDIR)/%.c,$(ODIR)/%.o,$(SOURCES))

TEST_SRC=$(wildcard tests/*_tests.c)
TESTS=$(patsubst %.c,%,$(TEST_SRC))


TARGET=build/bounce

#CFLAGS=-g -Wall -Wextra -static -std=c11
#LDFLAGS=-lm

 print-%: ; @echo $* is $($*)

all: build $(TARGET)

$(ODIR)/%.o: $(SRCDIR)/%.c
	$(CC) $(CFLAGS) -c $< -o $@ $(LDFLAGS)

$(TARGET): $(OBJECTS)
	$(CC) $(CFLAGS) -o $(TARGET) $^ $(LDFLAGS)

build:
	@mkdir -p build
	@mkdir -p bin

clean:
	rm -rf build/
	rm -rf bin/


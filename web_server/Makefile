CC=gcc
CFLAGS=-Wall -g -Werror

SRC = $(wildcard *.c) $(wildcard lib/*.c) $(wildcard linux/*.c)
OBJ = $(SRC:%.c=%.o)
LIBS = -ltalloc -lpthread

all: files/embedded.c mavlink web_server

.PHONY: mavlink

mavlink: generated/mavlink/ardupilotmega/mavlink.h

generated/mavlink/ardupilotmega/mavlink.h:
	mavgen.py --lang C ../mavlink/message_definitions/v1.0/ardupilotmega.xml -o generated/mavlink --wire-protocol=2.0

web_server: $(OBJ) files/embedded.c
	$(CC) -o web_server $(OBJ) $(LIBS)

files/embedded.c:
	cd files && make

clean:
	rm -f *.o */*.o web_server files/embedded.c
	rm -rf generated

SHELL := /bin/bash

test:
	@./test/run.js

clean:
	rm test/tmp/*

.PHONY: test clean

SHELL := /bin/bash

test:
	@find test/{simple,integration,system}/test-*.js | xargs -n 1 -t node

clean:
	rm test/tmp/*

.PHONY: test clean

test:
	@find test/{simple,integration}/test-*.js | xargs -n 1 -t node

.PHONY: test
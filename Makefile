test:
	@find test/{simple,integration,system}/test-*.js | xargs -n 1 -t node

.PHONY: test
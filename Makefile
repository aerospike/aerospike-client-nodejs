

VALGRIND_OPTS = --tool=memcheck --leak-check=yes --show-reachable=yes --num-callers=20 --track-fds=yes -v


default: build

.PHONY: build
build:
	node-gyp build

.PHONY: test
test: build
	npm test

.PHONY: empty-valgrind
empty-valgrind: build
	mkdir -p valgrind
	valgrind $(VALGRIND_OPTS) node -e "" 1>valgrind/empty.out 2>valgrind/empty.valgrind

.PHONY: test-valgrind
test-valgrind: build
	mkdir -p valgrind
	valgrind $(VALGRIND_OPTS) npm test 1>valgrind/test.out 2>valgrind/test.valgrind

.PHONY: benchmark-valgrind
benchmark-valgrind: build
	mkdir -p valgrind
	valgrind $(VALGRIND_OPTS) node benchmarks/main.js -O 10000 -P 4 -R 0.5 1>valgrind/benchmark.out 2>valgrind/benchmark.valgrind

.PHONY: put-valgrind
put-valgrind: build
	mkdir -p valgrind
	valgrind $(VALGRIND_OPTS) npm run examples -- Put 1>valgrind/put-100.out 2>valgrind/put-100.valgrind

.PHONY: put
put: build
	npm run examples -- Put

.PHONY: get-valgrind
get-valgrind: build
	mkdir -p valgrind
	valgrind $(VALGRIND_OPTS) npm run examples -- Get 1>valgrind/get-100.out 2>valgrind/get-100.valgrind

.PHONY: get
get: build
	npm run examples -- Get

.PHONY: query-valgrind
query-valgrind: build
	mkdir -p valgrind
	valgrind $(VALGRIND_OPTS) npm run examples -- QueryInteger 1>valgrind/query-100.out 2>valgrind/query-100.valgrind

.PHONY: query
query: build
	npm run examples -- QueryInteger






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
	valgrind $(VALGRIND_OPTS) node examples/put.js -q -I 100 foo 1>valgrind/put-100.out 2>valgrind/put-100.valgrind

.PHONY: put
put: build
	node examples/put.js -q -I 100 foo

.PHONY: get-valgrind
get-valgrind: build
	mkdir -p valgrind
	valgrind $(VALGRIND_OPTS) node examples/get.js -q -I 100 foo 1>valgrind/get-100.out 2>valgrind/get-100.valgrind

.PHONY: get
get: build
	node examples/get.js -q -I 100 foo

.PHONY: query-valgrind
query-valgrind: build
	mkdir -p valgrind
	node examples/indexCreate.js s idx_s string
	# valgrind $(VALGRIND_OPTS) node examples/query.js -I 1 1>valgrind/query-1.out 2>valgrind/query-1.valgrind
	valgrind $(VALGRIND_OPTS) node --expose-gc examples/query.js -q -I 100 1>valgrind/query-100.out 2>valgrind/query-100.valgrind
	# valgrind $(VALGRIND_OPTS) node examples/query.js -I 1000 1>valgrind/query-1000.out 2>valgrind/query-1000.valgrind
	# valgrind $(VALGRIND_OPTS) node examples/query.js -I 10000 1>valgrind/query-10000.out 2>valgrind/query-10000.valgrind

.PHONY: query
query: build
	node examples/indexCreate.js s idx_s string
	# node --expose-gc examples/query.js -I 1
	# node --expose-gc examples/query.js -I 100
	node --expose-gc examples/query.js -q -I 1000
	# node --expose-gc examples/query.js -I 10000




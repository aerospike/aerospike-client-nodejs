# Expression conversion fast path: tests and benchmark

`src/main/expressions.cc` converts every JS expression node to an `as_exp_entry` on every
command. The original conversion costs ~15-30 V8 API calls per node: each property probe builds
its key with `Nan::New("<literal>")` (UTF-8 decode + hash + string-table lookup), the value kind
is found by up to 12 sequential `Has()` probes, and `free_entries()` repeats the probes only to
decide what to free. A profile of a 254-node expression showed 99% of compile CPU in V8/NAN glue
and none visible in `as_exp_compile`. On a real workload (a 700-node filtered `operate`) that is
~1.7 ms of event-loop CPU per command.

The fast path (default; `AEROSPIKE_EXP_LEGACY=1` selects the original):

1. property-name keys created once per isolate, internalized (`v8::Eternal`);
2. one `GetOwnPropertyNames()` per node, names matched to keys by identity (pointer compare);
3. each entry's ownership kind recorded in a C array while converting, so freeing makes no V8 calls.

Value semantics, key precedence and type errors follow the original. No JS or API change.

Also on this branch, separately: `lib/exp.js` `_paramsExp` spread the list of parameter arrays
instead of their nodes, so `pow, log, mod, abs, floor, ceil, toInt, toFloat, intNot, intLshift,
intRshift, intArshift, intCount, intLscan, intRscan` never compiled ("Expressions could not be
compiled") in 7.0.1. Fixed with `[].concat(...)`.

## Files

| file | what |
|---|---|
| `corpus.js` | every node kind `lib/exp*.js` emits, the capture-gate POC expressions, size stress, malformed input |
| `equivalence.js` | compiles the corpus in both modes (child processes): identical base64 bytes, identical rejections |
| `leak.js` | 200k compiles of allocation-heavy expressions + the error path; RSS growth fast vs legacy |
| `perf.js` | compile-only µs and ns/node by size; end-to-end filtered `operate` (POC open) at concurrency 1 and 32 |
| `build-and-run.sh` | builds from source, then runs all of the above plus `test/exp*.ts` in both modes |

```bash
AEROSPIKE_HOSTS=127.0.0.1:3100 AEROSPIKE_NS=poc benchmarks/exp_compile/build-and-run.sh
```

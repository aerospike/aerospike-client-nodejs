# CLI to harness migration (CLIENT-4749)

Legacy `node run` examples under `examples/*.js` are being replaced by harness-backed modules in [`../doc/`](../doc/). CI runs only the harness via `npm run examples:all` (Example Run check).

## Phase status

| Phase | Scope | Status |
|-------|--------|--------|
| 0 | Harness + 15 doc examples ([#1074](https://github.com/aerospike/aerospike-client-nodejs/pull/1074)) | Done |
| 1 | Remove CLI duplicates covered by harness (Connect, Get, Exists, Add, Append, Batch, Operate) | Done |
| 2 | Put, Remove, Apply, Info, query/scan gaps | Planned |
| 3 | SecondaryIndex, UdfModule, DynamicConfig, Metrics | Planned |
| 4 | MRT, GeospatialMonteCarlo, PathExpressions | Planned |
| 5 | Remove `run.js`, `shared/`, remaining CLI scripts | Planned |
| 6 | Full CI verification on CE smoke + EE stage | Planned |

## Harness replacements (Phase 1)

Use from the repo root (after `npm run build`):

| Removed CLI command | Harness example |
|--------------------|-----------------|
| `node run connect` | `npm run examples -- Connect` |
| `node run get` | `npm run examples -- Get` |
| `node run exists` | `npm run examples -- Exists` |
| `node run add` | `npm run examples -- Add` |
| `node run append` | `npm run examples -- Append` |
| `node run batch` | `npm run examples -- Batch` |
| `node run operate` | `npm run examples -- Operate` |

Related harness-only examples (no CLI duplicate removed in Phase 1): PutGet, Prepend, Delete, Replace, ServerInfo, ScanParallel, QueryInteger, UserDefinedFunction.

## Remaining CLI commands (until later phases)

`apply`, `put`, `remove`, `info`, `query`, `scan`, `sindex`, `udf`, `dynamicConfig`, `metrics`, `mrtCommit`, `mrtAbort`, `geospatialMonteCarlo` — still via `cd examples && node run <command>`.

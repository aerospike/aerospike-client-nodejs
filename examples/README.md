# Aerospike Node.js Client Examples

Documentation examples live in [`doc/`](doc/) and run through [`harness/`](harness/). This is the supported path for learning APIs and for CI (**Example Run**).

From the repository root (build the client first with `npm run build`):

```bash
npm run examples:all
npm run examples -- Get PutGet MrtCommit
```

Settings: [`.settings.json`](.settings.json) and `AEROSPIKE_HOST`, `AEROSPIKE_PORT`, etc. See [`harness/README.md`](harness/README.md).

**29 registered examples:** Connect, ServerInfo, Info, PutGet, Put, Get, Exists, Add, Append, Prepend, Delete, Remove, Replace, Operate, Batch, Apply, Scan, ScanParallel, QueryInteger, QueryEqual, SecondaryIndex, UserDefinedFunction, UdfModule, DynamicConfig, Metrics, MrtCommit, MrtAbort, GeospatialMonteCarlo, PathExpressions.

Default cluster: `127.0.0.1:3000`, namespace `test`, set `demo`.

Optional: `EXAMPLES_GEO_DARTS` overrides the dart count for **GeospatialMonteCarlo** (default 500 in CI).

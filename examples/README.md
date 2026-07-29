# Aerospike Node.js Client Examples

## Canonical path: harness (CI-verified)

Documentation examples live in [`doc/`](doc/) and run through [`harness/`](harness/). This is the supported path for learning APIs and for CI (**Example Run**).

From the repository root (build the client first with `npm run build`):

```bash
npm run examples:all
npm run examples -- Get PutGet
```

Settings: [`/.settings.json`](.settings.json) and `AEROSPIKE_HOST`, `AEROSPIKE_PORT`, etc. See [`harness/README.md`](harness/README.md).

Registered harness examples: Connect, ServerInfo, Info, PutGet, Put, Get, Exists, Add, Append, Prepend, Delete, Remove, Replace, Operate, Batch, Apply, Scan, ScanParallel, QueryInteger, QueryEqual, SecondaryIndex, UserDefinedFunction, UdfModule, DynamicConfig, Metrics.

## Legacy CLI (being retired)

A few demos still use `node run` under this directory (`cd examples && npm install`):

```bash
node run --help
```

Remaining commands: `geospatialMonteCarlo`, `mrtCommit`, `mrtAbort`.

Default cluster: `127.0.0.1:3000`, namespace `test`, set `demo`.

Use **`npm run examples`** for all APIs listed in the harness registry above.

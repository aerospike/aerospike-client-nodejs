# Aerospike Node.js Client Examples

## Canonical path: harness (CI-verified)

Documentation examples live in [`doc/`](doc/) and run through [`harness/`](harness/). This is the supported path for learning APIs and for CI (**Example Run**).

From the repository root (build the client first with `npm run build`):

```bash
npm run examples:all
npm run examples -- Get PutGet
```

Settings: [`/.settings.json`](.settings.json) and `AEROSPIKE_HOST`, `AEROSPIKE_PORT`, etc. See [`harness/README.md`](harness/README.md).

Registered harness examples: Connect, ServerInfo, PutGet, Get, Exists, Add, Append, Prepend, Delete, Replace, Operate, Batch, ScanParallel, QueryInteger, UserDefinedFunction.

### Migrated off legacy CLI (Phase 1)

These no longer have `node run` scripts; use the harness name instead:

| Former CLI | Use |
|------------|-----|
| `connect` | `npm run examples -- Connect` |
| `get` | `npm run examples -- Get` |
| `exists` | `npm run examples -- Exists` |
| `add` | `npm run examples -- Add` |
| `append` | `npm run examples -- Append` |
| `batch` | `npm run examples -- Batch` |
| `operate` | `npm run examples -- Operate` |

See [`harness/MIGRATION.md`](harness/MIGRATION.md) for the full migration plan.

## Legacy CLI (being retired)

Some examples still use the older yargs runner under this directory. They require a separate install in `examples/`:

```bash
cd examples
npm install
node run --help
node run put myKey bin=value
```

Remaining commands: `apply`, `put`, `remove`, `info`, `query`, `scan`, `sindex`, `udf`, `dynamicConfig`, `metrics`, `mrtCommit`, `mrtAbort`, `geospatialMonteCarlo`.

Default cluster: `127.0.0.1:3000`, namespace `test`, set `demo`.

These will move into the harness in follow-up work; prefer **`npm run examples`** for anything already listed in the harness registry.

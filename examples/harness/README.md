# Runnable documentation examples

The `examples/harness` directory runs documentation-shaped examples against a live Aerospike server. The harness owns connection setup, policies, logging, server capability detection, fixture lifecycle (setup, validate, cleanup), and CI result reporting.

Example code lives in [`../doc/`](../doc/). Each file exports a `runExample(context)` function that uses injected `client`, `ns`, `set`, policies, and `console`. Keep example bodies focused on teachable API usage; use fixtures for seed data, assertions, and cleanup.

## Registered examples (29)

Connect, ServerInfo, Info, PutGet, Put, Get, Exists, Add, Append, Prepend, Delete, Remove, Replace, Operate, Batch, Apply, Scan, ScanParallel, QueryInteger, QueryEqual, SecondaryIndex, UserDefinedFunction, UdfModule, DynamicConfig, Metrics, MrtCommit, MrtAbort, GeospatialMonteCarlo, PathExpressions.

Run all registered examples:

```bash
npm run examples:all
```

Run a subset:

```bash
npm run examples -- PutGet Get
node examples/harness/run.js --settings examples/.settings.json PutGet
```

## Example shape

```javascript
async function runExample ({ client, ns, set, writePolicy, policy, console, requireEnterprise }) {
  requireEnterprise() // optional — marks example Skipped when gate not met
  const key = new Aerospike.Key(ns, set, 'mykey')
  await client.put(key, { bin1: 'value' }, null, writePolicy)
}

module.exports = { name: 'MyExample', runExample }
```

## Server capability gates

After connect, the harness populates `args.enterprise`, `args.scMode`, `args.serverVersion`, and `args.build` via [`serverCapabilities.js`](serverCapabilities.js).

Context helpers (throw `ExampleSkipError` → **Skipped**, not Failed):

- `requireEnterprise()`
- `requireStrongConsistency()`
- `requireAuth()` / `requireTls()`
- `requireMinServerVersion('8.0.0')`
- `skipUnless(condition, reason)`

| Example | Gate behavior |
|---------|----------------|
| **Delete** | Durable delete: `requireEnterprise()` |
| **MrtCommit**, **MrtAbort** | EE + SC + server `>= 8.0.0` (skipped on CE smoke) |
| **GeospatialMonteCarlo** | Runs on CE; uses set `montecarlo`, 500 darts by default (`EXAMPLES_GEO_DARTS` to override) |
| **PathExpressions** | Standard namespace/set fixtures |

## Register an example

1. Add a module under `examples/doc/`.
2. Add validation helpers in [`fixtures/validation.js`](fixtures/validation.js) when needed.
3. Register in [`registry.js`](registry.js) with a fixture recipe from [`fixtures/recipes.js`](fixtures/recipes.js).
4. Run locally through the harness.

## Settings

Defaults: [`../.settings.json`](../.settings.json). Override with:

- `AEROSPIKE_HOST` or `AS_HOST`
- `AEROSPIKE_PORT` or `AS_PORT`
- `AEROSPIKE_NAMESPACE`, `AEROSPIKE_SET`
- `AEROSPIKE_USER`, `AEROSPIKE_PASSWORD` (required for secured stage CI)

## CI reporting

```bash
node examples/harness/run.js --settings examples/.settings.json \
  --report-junit example-results/results.xml all
```

- PR **smoke-tests** (Node 20): publishes **Example Run** check.
- **stage-comprehensive-tests** `test-ee` job (Linux, Node 20): same command with superuser credentials.

## Fixtures

- `setup` — before the example body
- `validate` — after a successful body
- `cleanup` — always in `finally`

Shared helpers live in [`fixtures/support.js`](fixtures/support.js) (keys, indexes, UDF register/remove, delete ranges).

'use strict'

// Leak check: compile a mix that exercises every owned allocation (strVal strdup, bytes, ctx,
// list/map policy, nested exp, as_val values) many times, plus the error path, and compare RSS
// growth after warm-up between the two modes. The fast path frees from a C-side kinds array
// instead of re-reading the JS objects, so this is the test that it frees the same things.
//
//   AEROSPIKE_HOSTS=127.0.0.1:3100 ITER=200000 node benchmarks/exp_compile/leak.js

const { MODE, compiler, runBothModes } = require('./common')
const { corpus, invalid } = require('./corpus')

const ITER = Number(process.env.ITER || 200000)
const MIX = ['str unicode', 'bytes', 'list read ctx', 'list append policy ctx', 'map put policy ctx', 'map putItems',
  'modifyByPath', 'list value', 'map value', 'geo', 'lusha refund']

async function child () {
  const { client, compile } = await compiler()
  const exps = MIX.map(name => corpus[name]())
  const bad = invalid['error after a string node (cleanup path)']()
  const rssMb = () => { global.gc(); return process.memoryUsage().rss / 1048576 }
  const round = n => {
    for (let i = 0; i < n; i += 1) {
      compile(exps[i % exps.length])

      if (i % 10 === 0) try { compile(bad) } catch (err) {}
    }
  }

  round(ITER / 4) // warm-up: let allocators and V8 settle
  const start = rssMb()

  round(ITER)
  const end = rssMb()

  await client.close()
  process.stdout.write(JSON.stringify({ mode: MODE, start, end, growth: end - start }))
}

function parent () {
  const { legacy, fast } = runBothModes(__filename)

  for (const r of [legacy, fast]) {
    console.log(`${r.mode.padEnd(7)} RSS after warm-up ${r.start.toFixed(1)} MB, after ${ITER} compiles ${r.end.toFixed(1)} MB, growth ${r.growth.toFixed(1)} MB`)
  }

  // the fast path must not leak more than the legacy one (small slack for allocator noise)
  const ok = fast.growth <= Math.max(legacy.growth, 0) + 8

  console.log(ok ? 'PASS  fast path does not grow more than legacy' : 'FAIL  fast path grows more than legacy')
  process.exit(ok ? 0 : 1)
}

if (process.argv.includes('--child')) child().catch(err => { console.error(err); process.exit(1) })
else parent()

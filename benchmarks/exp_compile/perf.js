'use strict'

// Performance: legacy vs fast conversion, same binary, separate processes.
//  1. compile only (expressionToBase64, no I/O) by expression size: µs per compile, ns per node
//  2. end to end: the capture-gate open (filter + read + write expressions, built per call, as the
//     customer does) against a 1,000-user account record: wall and CPU per op, p50/p99,
//     at CONCURRENCY 1 and 32
//
//   AEROSPIKE_HOSTS=127.0.0.1:3100 AEROSPIKE_NS=poc node benchmarks/exp_compile/perf.js

const { Aerospike, NS, MODE, compiler, runBothModes } = require('./common')
const { corpus, lushaOpen, lushaRefund } = require('./corpus')

const N_OPS = Number(process.env.N || 3000)
const REPEATS = 5

const median = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]

function compileBench (compile, expr) {
  const runs = []
  let n = 200

  for (let i = 0; i < n; i += 1) compile(expr) // warm-up

  // size the loop to ~200 ms
  const t = process.hrtime.bigint()

  for (let i = 0; i < 50; i += 1) compile(expr)
  n = Math.max(50, Math.round(200e6 / (Number(process.hrtime.bigint() - t) / 50)))

  for (let r = 0; r < REPEATS; r += 1) {
    const t0 = process.hrtime.bigint()

    for (let i = 0; i < n; i += 1) compile(expr)
    runs.push(Number(process.hrtime.bigint() - t0) / 1e3 / n)
  }

  return median(runs)
}

async function opBench (fn, concurrency) {
  for (let i = 0; i < 300; i += 1) await fn()

  const lat = []
  const cpu0 = process.cpuUsage()
  const t0 = process.hrtime.bigint()
  let next = 0

  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < N_OPS) {
      next += 1
      const s = process.hrtime.bigint()

      await fn()
      lat.push(Number(process.hrtime.bigint() - s) / 1e6)
    }
  }))

  const wall = Number(process.hrtime.bigint() - t0) / 1e6
  const cpu = process.cpuUsage(cpu0)

  lat.sort((a, b) => a - b)

  return { wallMs: wall / N_OPS, cpuMs: (cpu.user + cpu.system) / 1000 / N_OPS, p50: pct(lat, 0.5), p99: pct(lat, 0.99), opsPerSec: N_OPS / (wall / 1000) }
}

async function child () {
  const { client, compile } = await compiler()
  const out = { mode: MODE, compile: {}, e2e: {} }
  const open = lushaOpen()

  // end to end runs first: the compile-only loops below are long synchronous runs that block the
  // event loop, and a command issued right after one can hit the client's total timeout
  // 2. end to end on a seeded 1,000-user account record
  const key = new Aerospike.Key(NS, 'gate', 'exp-bench-acct')
  const used = { account: 0, 'group:g1': 0 }
  const limit = { account: 5e12, 'group:g1': 5e12 }
  const users = {}

  for (let i = 0; i < 1000; i += 1) {
    used[`user:u${i}`] = 0
    users[`u${i}`] = 'group:g1'
  }

  await client.put(key, { used, limit, users })

  const policyBase = { exists: Aerospike.policy.exists.UPDATE, totalTimeout: 5000, maxRetries: 0 }
  const { read, write } = Aerospike.exp.operations
  const openPerCall = () => {
    const e = lushaOpen({ userId: `u${Math.floor(Math.random() * 1000)}`, userGroupId: 'g1' }, 1)

    return client.operate(key, [read('answer', e.read, 0), write('used', e.write, 0)], {},
      new Aerospike.OperatePolicy({ ...policyBase, filterExpression: e.filter }))
  }
  const refund = () => client.operate(key, [write('used', lushaRefund(), 0)], {}, policyBase)
  const baseline = () => client.operate(key, [read('x', Aerospike.exp.int(1), 0)])

  for (const concurrency of [1, 32]) {
    out.e2e[`baseline trivial expr, c=${concurrency}`] = await opBench(baseline, concurrency)
    out.e2e[`lusha open, c=${concurrency}`] = await opBench(openPerCall, concurrency)
    out.e2e[`lusha refund, c=${concurrency}`] = await opBench(refund, concurrency)
  }

  await client.remove(key)

  // 1. compile only
  const sizes = ['trivial (int)', 'let cond', 'lusha refund', 'lusha open filter', 'lusha open write', 'and of 2000 eq']

  for (const name of sizes) {
    const expr = name === 'trivial (int)' ? Aerospike.exp.int(1) : corpus[name]()

    out.compile[name] = { nodes: expr.length, us: compileBench(compile, expr) }
  }

  out.compile['lusha open (3 exprs)'] = {
    nodes: open.read.length + open.write.length + open.filter.length,
    us: compileBench(e => { compile(e.read); compile(e.write); compile(e.filter) }, open)
  }

  await client.close()
  process.stdout.write(JSON.stringify(out))
}

function parent () {
  const { legacy, fast } = runBothModes(__filename)
  const x = (a, b) => `${(a / b).toFixed(1)}x`

  console.log('compile only (expressionToBase64, median of 5)')
  console.log(`${''.padEnd(24)}${'nodes'.padStart(7)}${'legacy µs'.padStart(12)}${'fast µs'.padStart(10)}${'legacy ns/node'.padStart(16)}${'fast ns/node'.padStart(14)}${'speedup'.padStart(9)}`)

  for (const [name, l] of Object.entries(legacy.compile)) {
    const f = fast.compile[name]

    console.log(`${name.padEnd(24)}${String(l.nodes).padStart(7)}${l.us.toFixed(1).padStart(12)}${f.us.toFixed(1).padStart(10)}` +
      `${(l.us * 1000 / l.nodes).toFixed(0).padStart(16)}${(f.us * 1000 / f.nodes).toFixed(0).padStart(14)}${x(l.us, f.us).padStart(9)}`)
  }

  console.log(`\nend to end (operate, expressions built per call), N=${N_OPS}`)
  console.log(`${''.padEnd(30)}${'cpu ms/op'.padStart(18)}${'wall ms/op'.padStart(18)}${'p50 ms'.padStart(16)}${'p99 ms'.padStart(16)}${'ops/s'.padStart(16)}`)
  console.log(`${''.padEnd(30)}${'legacy → fast'.padStart(18)}${'legacy → fast'.padStart(18)}${'legacy → fast'.padStart(16)}${'legacy → fast'.padStart(16)}${'legacy → fast'.padStart(16)}`)

  for (const [name, l] of Object.entries(legacy.e2e)) {
    const f = fast.e2e[name]
    const pair = (a, b, d = 3) => `${a.toFixed(d)} → ${b.toFixed(d)}`

    console.log(`${name.padEnd(30)}${pair(l.cpuMs, f.cpuMs).padStart(18)}${pair(l.wallMs, f.wallMs).padStart(18)}` +
      `${pair(l.p50, f.p50, 2).padStart(16)}${pair(l.p99, f.p99, 2).padStart(16)}${pair(l.opsPerSec, f.opsPerSec, 0).padStart(16)}`)
  }
}

if (process.argv.includes('--child')) child().catch(err => { console.error(err); process.exit(1) })
else parent()

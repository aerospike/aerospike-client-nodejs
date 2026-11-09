'use strict'

// Shared helpers: get a client that can compile expressions, and run a script in both modes.
//   AEROSPIKE_EXP_LEGACY=1  -> original conversion path, otherwise the fast path

const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const Aerospike = require('../../lib/aerospike')

// Guard: the loader prefers an installed npm prebuild over build/Release, which silently tests
// the stock client against itself. Refuse to run unless the binary under test is the local build
// and contains the fast path.
const loaded = Object.keys(require.cache).filter(file => file.endsWith('.node'))
const LOCAL_BUILD = path.join(__dirname, '..', '..', 'build', 'Release', 'aerospike.node')

if (loaded.length !== 1 || loaded[0] !== LOCAL_BUILD) {
  throw new Error(`native binary under test is not the local build:\n  loaded:   ${loaded.join(', ')}\n  expected: ${LOCAL_BUILD}\n` +
    'move node_modules/@aerospike/prebuild-<platform> aside so the loader falls through to build/Release')
}
if (!fs.readFileSync(LOCAL_BUILD).includes('AEROSPIKE_EXP_LEGACY')) {
  throw new Error(`${LOCAL_BUILD} has no expression fast path (AEROSPIKE_EXP_LEGACY not found): rebuild`)
}

const HOSTS = process.env.AEROSPIKE_HOSTS || '127.0.0.1:3100'
const NS = process.env.AEROSPIKE_NS || 'poc'
const MODE = process.env.AEROSPIKE_EXP_LEGACY === '1' ? 'legacy' : 'fast'

// expressionToBase64 is the native compile with no I/O: the conversion under test
async function compiler () {
  const client = await Aerospike.connect({ hosts: HOSTS, log: { level: Aerospike.log.OFF } })

  return { client, compile: e => client.expressionToBase64(e) }
}

// run `script` once per mode in a child process; each child prints one JSON document
function runBothModes (script, extraEnv = {}) {
  const out = {}

  for (const [mode, legacy] of [['legacy', '1'], ['fast', '0']]) {
    const res = spawnSync(process.execPath, ['--expose-gc', script, '--child'], {
      env: { ...process.env, ...extraEnv, AEROSPIKE_EXP_LEGACY: legacy },
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024
    })

    if (res.status !== 0) {
      throw new Error(`${mode} child failed (status ${res.status}, signal ${res.signal}):\n${res.stderr}`)
    }

    out[mode] = JSON.parse(res.stdout)
  }

  return out
}

module.exports = { Aerospike, HOSTS, NS, MODE, compiler, runBothModes }

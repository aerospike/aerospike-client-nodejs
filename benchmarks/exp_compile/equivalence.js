'use strict'

// Equivalence: for every expression in the corpus the fast path must produce exactly the bytes
// the legacy path produces (base64 of the compiled wire expression), and reject the same
// malformed inputs. Exit 1 on any difference.
//
//   AEROSPIKE_HOSTS=127.0.0.1:3100 node benchmarks/exp_compile/equivalence.js

const { MODE, compiler, runBothModes } = require('./common')
const { corpus, invalid } = require('./corpus')

async function child () {
  const { client, compile } = await compiler()
  const result = { mode: MODE, ok: {}, invalid: {} }

  for (const [name, build] of Object.entries(corpus)) {
    try {
      result.ok[name] = compile(build())
    } catch (err) {
      result.ok[name] = `ERROR: ${err.message}`
    }
  }

  for (const [name, build] of Object.entries(invalid)) {
    try {
      result.invalid[name] = `ACCEPTED: ${compile(build())}`
    } catch (err) {
      result.invalid[name] = `ERROR: ${err.message}`
    }
  }

  await client.close()
  process.stdout.write(JSON.stringify(result))
}

function parent () {
  const { legacy, fast } = runBothModes(__filename)
  let failures = 0

  if (legacy.mode !== 'legacy' || fast.mode !== 'fast') throw new Error('mode switch not honoured')

  for (const section of ['ok', 'invalid']) {
    for (const name of Object.keys(legacy[section])) {
      const same = legacy[section][name] === fast[section][name]
      const shown = String(fast[section][name])

      if (!same) failures += 1
      if (section === 'ok' && shown.startsWith('ERROR')) failures += 1 // valid input must compile

      console.log(`${same ? 'PASS' : 'FAIL'}  ${section.padEnd(7)} ${name.padEnd(42)} ${shown.length > 60 ? `${shown.slice(0, 57)}...` : shown}`)

      if (!same) console.log(`        legacy: ${String(legacy[section][name]).slice(0, 200)}\n        fast:   ${shown.slice(0, 200)}`)
    }
  }

  const total = Object.keys(legacy.ok).length + Object.keys(legacy.invalid).length

  console.log(`\n${total - failures}/${total} identical${failures ? `, ${failures} FAILED` : ''}`)
  process.exit(failures ? 1 : 0)
}

if (process.argv.includes('--child')) child().catch(err => { console.error(err); process.exit(1) })
else parent()

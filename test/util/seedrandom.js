// For use with Mocha together with Choma to get a random, yet repeatable order
// of tests. Add "--require ./test/util/seedrandom" to test/mocha.opts to use.

'use strict'

const crypto = require('crypto')
require('seedrandom')

function randomSeed (minLength) {
  let bytes = Math.ceil(minLength / 2)
  return crypto.randomBytes(bytes)
    .toString('hex')
    .toUpperCase()
}

let seed = process.env['RANDOM_SEED'] || randomSeed(8)
process.env['RANDOM_SEED'] = seed

Math.seedrandom(seed)

console.info(`Running tests in randomized order. Use RANDOM_SEED=${seed} to reproduce.`)
process.on('exit', () =>
  console.info(`Tests executed in randomized order. Use RANDOM_SEED=${seed} to reproduce.`)
)

// *****************************************************************************
// Copyright 2026 Aerospike, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License")
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// *****************************************************************************

'use strict'

/* global describe, it, before, after */

import { expect } from 'chai';
import * as Aerospike from '../../lib/aerospike.js';
import * as helper from '../test_helper.ts';
import {
  ELEMENT_TYPES, METRICS, makeVector, referenceDistance, roundoff, expectNear, distancePrecision,
  loadVectors, removeLoadedSets, distanceOf, seededRandom, float16Bits
} from './helpers.ts';

const { Vector, status } = Aerospike
const { FLOAT16, INT32, FLOAT32 } = Aerospike.vectorElementType
const { EUCLIDEAN_SQUARED, DOT_PRODUCT, COSINE_SIMILARITY } = Aerospike.vectorDistanceMetric

// Stores each [stored, query] pair, then checks every metric's distance against
// the double-precision reference within the server's rounding.
async function expectAccurate (pairs: Array<{ type: number, stored: ReturnType<typeof makeVector>, query: ReturnType<typeof makeVector>, label: string }>) {
  const precision = await distancePrecision()
  const set = await loadVectors(pairs.map(pair => pair.stored.vector))
  for (let i = 0; i < pairs.length; i++) {
    const { type, stored, query, label } = pairs[i]
    for (const { name, metric } of METRICS) {
      const actual = await distanceOf(set, i, metric, query.vector)
      expectNear(actual, referenceDistance(metric, stored.values, query.values), stored.values.length, roundoff(type, precision), `${label} ${name}`)
    }
  }
}

// Pairs of random vectors of each type, with elements from value(random).
function randomPairs (dimensions: number, seed: number, value: (random: () => number) => number, label: string) {
  const random = seededRandom(seed)
  return ELEMENT_TYPES.map(({ name, type }) => ({
    type,
    stored: makeVector(type, dimensions, () => value(random)),
    query: makeVector(type, dimensions, () => value(random)),
    label: `${label} ${name} (seed ${seed})`
  }))
}

describe('Vector distance accuracy', function () {
  this.timeout(60000)
  helper.skipUnlessVersion('>= 8.2.1', this)

  let precision: string
  before(async function () { precision = await distancePrecision() })
  after(removeLoadedSets)

  it('gives the spec answers for (1, 2, 3) and (4, 5, 6) in every element type (R13)', async function () {
    const pairs = ELEMENT_TYPES.map(({ type }) => [makeVector(type, 3, i => i + 1), makeVector(type, 3, i => i + 4)])
    const set = await loadVectors(pairs.map(([stored]) => stored.vector))
    for (let i = 0; i < pairs.length; i++) {
      const { name, type } = ELEMENT_TYPES[i]
      const query = pairs[i][1].vector
      expect(await distanceOf(set, i, DOT_PRODUCT, query), name).to.equal(32)
      expect(await distanceOf(set, i, EUCLIDEAN_SQUARED, query), name).to.equal(27)
      const cosine = await distanceOf(set, i, COSINE_SIMILARITY, query)
      expectNear(cosine, { value: 32 / Math.sqrt(14 * 77), scale: 1 }, 3, roundoff(type, precision), `${name} cosine`)
    }
  })

  it('gives the exact answers of simple geometry', async function () {
    const F = Vector.ofFloat32
    const cases: Array<[string, Aerospike.Vector, Aerospike.Vector, number, number, number]> = [
      // name, stored, query, dot, squared L2, cosine
      ['identical', F([0.5, -1.5, 2]), F([0.5, -1.5, 2]), 6.5, 0, 1],
      ['opposite', F([1, 2, 3]), F([-1, -2, -3]), -14, 56, -1],
      ['orthogonal', F([1, 0, 0]), F([0, 5, 0]), 0, 26, 0],
      ['scaled', F([1, 2, 3]), F([3, 6, 9]), 42, 56, 1],
      ['a zero stored vector (cosine 0, R13)', F([0, 0, 0]), F([1, 2, 3]), 0, 14, 0],
      ['two zero vectors', F([0, 0, 0]), F([0, 0, 0]), 0, 0, 0],
      ['negative zero', F([-0]), F([0]), 0, 0, 0],
      ['one dimension', F([3]), F([-2]), -6, 25, -1]
    ]
    const set = await loadVectors(cases.map(([, stored]) => stored))
    for (let i = 0; i < cases.length; i++) {
      const [name, , query, dot, l2, cosine] = cases[i]
      expect(await distanceOf(set, i, DOT_PRODUCT, query), `${name} dot`).to.equal(dot)
      expect(await distanceOf(set, i, EUCLIDEAN_SQUARED, query), `${name} L2`).to.equal(l2)
      expect(await distanceOf(set, i, COSINE_SIMILARITY, query), `${name} cosine`).to.equal(cosine)
    }
  })

  it('gives the dot product as the cosine for unit-length vectors (R7)', async function () {
    const random = seededRandom(7)
    const unit = () => {
      const values = Array.from({ length: 768 }, () => random() * 2 - 1)
      const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0))
      return makeVector(FLOAT32, 768, i => values[i] / norm)
    }
    const stored = unit()
    const query = unit()
    const set = await loadVectors([stored.vector])
    const dot = await distanceOf(set, 0, DOT_PRODUCT, query.vector)
    const cosine = await distanceOf(set, 0, COSINE_SIMILARITY, query.vector)
    expectNear(cosine, referenceDistance(COSINE_SIMILARITY, stored.values, query.values), 768, roundoff(FLOAT32, precision), 'cosine')
    expectNear(dot, { value: cosine, scale: 3 }, 768, roundoff(FLOAT32, precision), 'dot vs cosine')
  })

  it('matches the double-precision reference for random 768-dimension vectors (R65, R66)', async function () {
    const pairs = [1, 2, 3].flatMap(seed => randomPairs(768, seed, random => random() * 2 - 1, '768 in [-1, 1)'))
    await expectAccurate(pairs)
  })

  it('stays accurate from 1 dimension to the most each type holds', async function () {
    const pairs = []
    for (const { name, type, maxDimensions } of ELEMENT_TYPES) {
      for (const dimensions of [1, 2, 3, 5, 17, 1536, maxDimensions]) {
        const random = seededRandom(dimensions)
        pairs.push({
          type,
          stored: makeVector(type, dimensions, () => random() * 2 - 1),
          query: makeVector(type, dimensions, () => random() * 2 - 1),
          label: `${name} ${dimensions} dimensions`
        })
      }
    }
    // INT32 needs a wider range than [-1, 1) to hold anything but 0.
    for (const pair of pairs.filter(p => p.type === INT32)) {
      const random = seededRandom(pair.stored.values.length)
      const n = pair.stored.values.length
      pair.stored = makeVector(INT32, n, () => random() * 2000 - 1000)
      pair.query = makeVector(INT32, n, () => random() * 2000 - 1000)
    }
    await expectAccurate(pairs)
  })

  it('counts every element position exactly, up to the most dimensions each type holds', async function () {
    // One non-zero element per vector, so each distance has a single term and
    // is exact: a skipped or misplaced element changes it.
    const cases = []
    for (const { name, type, maxDimensions } of ELEMENT_TYPES) {
      for (const dimensions of [1, 3, 4, 5, 7, 8, 9, 15, 16, 17, 33, maxDimensions]) {
        for (const position of new Set([0, dimensions >> 1, dimensions - 1])) {
          const oneHot = (value: number) => makeVector(type, dimensions, i => (i === position ? value : 0))
          cases.push({ label: `${name} ${dimensions} dimensions, element ${position}`, stored: oneHot(3).vector, query: oneHot(-2).vector })
        }
      }
    }
    const set = await loadVectors(cases.map(c => c.stored))
    for (let i = 0; i < cases.length; i++) {
      const { label, query } = cases[i]
      expect(await distanceOf(set, i, DOT_PRODUCT, query), label).to.equal(-6)
      expect(await distanceOf(set, i, EUCLIDEAN_SQUARED, query), label).to.equal(25)
      expect(await distanceOf(set, i, COSINE_SIMILARITY, query), label).to.equal(-1)
    }
  })

  it('stays accurate for large, tiny and mixed-sign elements', async function () {
    const ranges: Array<[string, (random: () => number) => number]> = [
      ['large', random => (random() * 2 - 1) * 60000],
      ['tiny', random => (random() * 2 - 1) * 1e-3],
      ['positive only', random => random()],
      ['mixed magnitudes', random => (random() < 0.5 ? -1 : 1) * 10 ** (random() * 8 - 4)]
    ]
    const pairs = ranges.flatMap(([name, value], seed) => randomPairs(512, seed + 10, value, name))
    await expectAccurate(pairs)
  })

  it('handles the largest and smallest INT32 and FLOAT16 values', async function () {
    const pairs = [
      { type: INT32, stored: makeVector(INT32, 2, i => [-(2 ** 31), 2 ** 31 - 1][i]), query: makeVector(INT32, 2, i => [2 ** 31 - 1, -(2 ** 31)][i]), label: 'INT32 extremes' },
      { type: FLOAT16, stored: makeVector(FLOAT16, 2, i => [65504, -65504][i]), query: makeVector(FLOAT16, 2, i => [65504, 65504][i]), label: 'FLOAT16 largest' },
      { type: FLOAT16, stored: makeVector(FLOAT16, 2, () => 2 ** -24), query: makeVector(FLOAT16, 2, () => 2 ** -24), label: 'FLOAT16 smallest subnormal' }
    ]
    expect(float16Bits(65504)).to.equal(0x7bff)
    await expectAccurate(pairs)
  })

  it('sums FLOAT16, INT32 and FLOAT32 vectors in 32-bit floats unless set to double (R65)', async function () {
    // 16,777,217 has no 32-bit float; 1e8 + 1 - 1e8 loses the 1 in 32-bit floats.
    const set = await loadVectors([Vector.ofInt32([16777217]), Vector.ofFloat32([1e8, 1, -1e8])])
    const intDot = await distanceOf(set, 0, DOT_PRODUCT, Vector.ofInt32([1]))
    const cancelled = await distanceOf(set, 1, DOT_PRODUCT, Vector.ofFloat32([1, 1, 1]))
    if (precision === 'double') {
      expect([intDot, cancelled]).to.eql([16777217, 1])
    } else {
      expect([intDot, cancelled]).to.eql([16777216, 0])
    }
  })

  it('sums FLOAT64 vectors in doubles whatever the setting (R66)', async function () {
    const set = await loadVectors([Vector.ofFloat64([1e8, 1, -1e8]), Vector.ofFloat64([2 ** 53, 1, -(2 ** 53)])])
    expect(await distanceOf(set, 0, DOT_PRODUCT, Vector.ofFloat64([1, 1, 1]))).to.equal(1)
    // Beyond double precision, the 1 is lost in a double too.
    expect(await distanceOf(set, 1, DOT_PRODUCT, Vector.ofFloat64([1, 1, 1]))).to.equal(0)
  })

  // Not in the spec; the server's rule (Kevin, 2026-11-05): every squared Euclidean
  // term is >= 0, so an overflow really is farther than any finite distance and
  // gives +Infinity; a dot product can overflow even when its true value is
  // finite, so it stays unknown and a single read fails (R19).
  it('gives +Infinity when a squared Euclidean distance overflows', async function () {
    const max32 = 3.4028234663852886e38
    const set = await loadVectors([Vector.ofFloat64([Number.MAX_VALUE]), Vector.ofFloat32([max32])])
    expect(await distanceOf(set, 0, EUCLIDEAN_SQUARED, Vector.ofFloat64([-Number.MAX_VALUE])), 'FLOAT64').to.equal(Infinity)
    // FLOAT32 sums overflow only when the server sums in 32 bits.
    if (precision === 'float') {
      expect(await distanceOf(set, 1, EUCLIDEAN_SQUARED, Vector.ofFloat32([-max32])), 'FLOAT32').to.equal(Infinity)
    }
  })

  it('makes a dot product unknown when its sum overflows', async function () {
    const set = await loadVectors([Vector.ofFloat64([Number.MAX_VALUE])])
    const error = await distanceOf(set, 0, DOT_PRODUCT, Vector.ofFloat64([Number.MAX_VALUE])).then(() => null, e => e)
    expect(error).to.be.instanceof(Aerospike.AerospikeError)
    expect(error.code).to.equal(status.ERR_OP_NOT_APPLICABLE)
    // A FLOAT32 dot product that overflows 32 bits with the float setting isn't
    // pinned here: -59 returns the double-precision value (asked Kevin, 2026-11-05).
  })
})

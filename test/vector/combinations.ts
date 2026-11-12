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

import type { AerospikeRecord } from '../../lib/aerospike.js';

import { expect } from 'chai';
import * as Aerospike from '../../lib/aerospike.js';
import * as helper from '../test_helper.ts';
import { topK, skipUnlessTopKQueriesRun } from '../topk/helpers.ts';
import {
  ELEMENT_TYPES, METRICS, makeVector, referenceDistance, roundoff, distancePrecision, loadVectors,
  removeLoadedSets, seededRandom, expectBestK, loadGridSet, expectSearchGrid
} from './helpers.ts';

const { exp, operations } = Aerospike
const { DOUBLE, INTEGER } = Aerospike.binDataType
const { ASC, DESC } = Aerospike.order
const { FLOAT64, INT32 } = Aerospike.vectorElementType
const { EUCLIDEAN_SQUARED } = Aerospike.vectorDistanceMetric

// One random search: what is stored and how it is queried.
interface Search {
  elementType: number
  dimensions: number
  metric: number
  ascending: boolean
  k: number
  fetchVector: boolean
  secondKey: boolean
  inStockOnly: boolean
  shape: 'plain' | 'unknowns' | 'zeros' | 'duplicates'
}

function pick<T> (random: () => number, choices: T[]): T {
  return choices[Math.floor(random() * choices.length)]
}

function randomSearch (random: () => number): Search {
  const metric = pick(random, METRICS).metric
  return {
    elementType: pick(random, ELEMENT_TYPES).type,
    dimensions: pick(random, [1, 2, 3, 4, 5, 8, 17, 64, 768]),
    metric,
    ascending: pick(random, [true, false]),
    k: pick(random, [1, 2, 7, 50, 1000]),
    fetchVector: pick(random, [true, false]),
    secondKey: pick(random, [true, false]),
    inStockOnly: pick(random, [true, false]),
    shape: pick(random, ['plain', 'unknowns', 'zeros', 'duplicates'] as const)
  }
}

const describeSearch = (s: Search, seed: number) =>
  `seed ${seed}: type ${s.elementType}, ${s.dimensions} dims, metric ${s.metric}, ${s.ascending ? 'ASC' : 'DESC'}, k ${s.k}, ` +
  `vector ${s.fetchVector ? 'fetched' : 'not fetched'}, second key ${s.secondKey}, in stock only ${s.inStockOnly}, ${s.shape}`

// Stores 120 records shaped as asked, runs the search three ways (results(),
// foreach(), partitions) and checks it against the reference.
async function runSearch (s: Search, seed: number, precision: string) {
  const random = seededRandom(seed)
  const scale = s.elementType === INT32 ? 100 : 1
  const element = () => (random() * 2 - 1) * scale
  const count = 120
  const stored = Array.from({ length: count }, (_, i) => {
    if (s.shape === 'zeros' && i % 10 === 0) return makeVector(s.elementType, s.dimensions, () => 0)
    return makeVector(s.elementType, s.dimensions, element)
  })
  if (s.shape === 'duplicates') {
    for (let i = 1; i < count; i += 3) stored[i] = stored[i - 1] // equal distances, to exercise ties
  }
  const query = makeVector(s.elementType, s.dimensions, element)
  const unknown = (i: number) => s.shape === 'unknowns' && i % 7 === 0
  // Unknown distances: the other float type, or one more dimension.
  const otherType = s.elementType === FLOAT64 ? Aerospike.vectorElementType.FLOAT32 : FLOAT64
  const values = stored.map((v, i) => !unknown(i) ? v.vector : (i % 14 === 0 ? makeVector(otherType, s.dimensions, element).vector : makeVector(s.elementType, s.dimensions + 1, element).vector))
  const bins = stored.map((_, i) => ({ id: i, g: i % 4, stock: i % 3 }))
  const set = await loadVectors(values, bins)

  const records = await topK(set, q => {
    q.ops = [
      operations.read('id'),
      operations.read('g'),
      exp.operations.read('d', exp.vectorDistance(s.metric, query.vector, exp.binVector('v')), 0),
      ...(s.fetchVector ? [operations.read('v')] : [])
    ]
    q.orderBy('d', DOUBLE, s.ascending ? ASC : DESC)
    if (s.secondKey) q.thenOrderBy('g', INTEGER, ASC)
  }, s.k, s.inStockOnly ? { filterExpression: exp.gt(exp.binInt('stock'), exp.int(0)) } : null)

  const eligible = (i: number) => !unknown(i) && (!s.inStockOnly || bins[i].stock > 0)
  const references = stored.map((v, i) => (eligible(i) ? referenceDistance(s.metric, v.values, query.values) : null))
  expectBestK(records, references, s.k, s.ascending, s.dimensions, roundoff(s.elementType, precision))
  expectTiesBroken(records, s.secondKey)
  if (s.fetchVector) {
    for (const record of records) {
      expect((record.bins.v as Aerospike.Vector).toBytes()).to.eql(stored[record.bins.id as number].vector.toBytes())
    }
  }
}

// Records with exactly equal distances follow the second key, then the digest.
function expectTiesBroken (records: AerospikeRecord[], secondKey: boolean) {
  for (let j = 1; j < records.length; j++) {
    const [a, b] = [records[j - 1], records[j]]
    if (a.bins.d !== b.bins.d) continue
    if (secondKey && a.bins.g !== b.bins.g) {
      expect((a.bins.g as number) < (b.bins.g as number), `position ${j}: second key out of order`).to.be.true
    } else {
      expect(Buffer.compare(a.key.digest as Buffer, b.key.digest as Buffer) < 0, `position ${j}: tie not in digest order`).to.be.true
    }
  }
}

describe('Vector search combinations against the reference', function () {
  this.timeout(300000)
  helper.skipUnlessVersion('>= 8.2.1', this)
  skipUnlessTopKQueriesRun(this)

  let precision: string
  before(async function () { precision = await distancePrecision() })
  after(removeLoadedSets)

  it('every element type, metric and direction', async function () {
    let seed = 100
    for (const { type } of ELEMENT_TYPES) {
      for (const { metric } of METRICS) {
        for (const ascending of [true, false]) {
          const search: Search = { elementType: type, dimensions: 8, metric, ascending, k: 10, fetchVector: false, secondKey: false, inStockOnly: false, shape: 'plain' }
          await runSearch(search, ++seed, precision).catch(e => { e.message = `${describeSearch(search, seed)}: ${e.message}`; throw e })
        }
      }
    }
  })

  it('every metric, both directions and every projection, for every element type, against brute force (2,000 x 128)', async function () {
    for (const { name, type } of ELEMENT_TYPES) {
      const grid = await loadGridSet(type, 2000, 128, 400 + type)
      await expectSearchGrid(grid, type, [1, 10, 1000]).catch(e => { e.message = `${name}: ${e.message}`; throw e })
      await removeLoadedSets()
    }
  })

  it('ties on the distance follow the second key, then the digest', async function () {
    for (const secondKey of [true, false]) {
      const search: Search = { elementType: FLOAT64, dimensions: 4, metric: EUCLIDEAN_SQUARED, ascending: true, k: 60, fetchVector: false, secondKey, inStockOnly: false, shape: 'duplicates' }
      await runSearch(search, 200, precision)
    }
  })

  it('random searches over random data', async function () {
    const random = seededRandom(Number(process.env.VECTOR_SEED ?? 300))
    for (let run = 0; run < 40; run++) {
      const seed = Math.floor(random() * 1e9)
      const search = randomSearch(seededRandom(seed))
      await runSearch(search, seed, precision).catch(e => { e.message = `${describeSearch(search, seed)}: ${e.message}`; throw e })
      await removeLoadedSets()
    }
  })
})

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

import type { Query as Q } from '../../lib/aerospike.js';

import { expect } from 'chai';
import * as Aerospike from '../../lib/aerospike.js';
import * as helper from '../test_helper.ts';
import { topK, digests, inDigestOrder, indexBin, removeLoadedSets as removeIndexes, skipUnlessTopKQueriesRun } from '../topk/helpers.ts';
import {
  ELEMENT_TYPES, METRICS, makeVector, referenceDistance, roundoff, distancePrecision, loadVectors,
  removeLoadedSets, seededRandom, expectBestK
} from './helpers.ts';

const { exp, filter, operations, Vector } = Aerospike
const { DOUBLE, INTEGER } = Aerospike.orderByType
const { ASC, DESC } = Aerospike.order
const { FLOAT32, FLOAT64 } = Aerospike.vectorElementType
const { EUCLIDEAN_SQUARED, DOT_PRODUCT, COSINE_SIMILARITY } = Aerospike.vectorDistanceMetric

// The direction in which each metric ranks the most similar first.
const NEAREST_FIRST: Record<number, boolean> = { [EUCLIDEAN_SQUARED]: true, [DOT_PRODUCT]: false, [COSINE_SIMILARITY]: false }

const DIMENSIONS = 16

// Returns bins id and d (the distance to query), plus any other bins asked for,
// and orders by d, nearest first.
function bySimilarity (metric: number, query: Aerospike.Vector, alsoRead: string[] = [], flags = exp.expReadFlags.DEFAULT) {
  return (q: Q) => {
    q.ops = [
      operations.read('id'),
      exp.operations.read('d', exp.vectorDistance(metric, query, exp.binVector('v')), flags),
      ...alsoRead.map(bin => operations.read(bin))
    ]
    q.orderBy('d', DOUBLE, NEAREST_FIRST[metric] ? ASC : DESC)
  }
}

// count random vectors of one type, stored with bin id = their index, and a query vector.
async function loadRandom (elementType: number, count: number, seed: number, bins: (i: number) => Record<string, unknown> = () => ({})) {
  const random = seededRandom(seed)
  const stored = Array.from({ length: count }, () => makeVector(elementType, DIMENSIONS, () => random() * 2 - 1))
  const query = makeVector(elementType, DIMENSIONS, () => random() * 2 - 1)
  const set = await loadVectors(stored.map(s => s.vector), stored.map((_, i) => ({ id: i, ...bins(i) })))
  return { set, stored, query }
}

describe('Vector search with Top-K', function () {
  this.timeout(120000)
  helper.skipUnlessVersion('>= 8.2.1', this)
  skipUnlessTopKQueriesRun(this)

  let precision: string
  before(async function () { precision = await distancePrecision() })
  after(async function () {
    await removeIndexes()
    await removeLoadedSets()
  })

  it('returns the k nearest by every metric, as a brute-force search does (R23)', async function () {
    const { set, stored, query } = await loadRandom(FLOAT32, 2000, 1)
    for (const { name, metric } of METRICS) {
      for (const k of [1, 10, 100]) {
        const records = await topK(set, bySimilarity(metric, query.vector), k)
        const references = stored.map(s => referenceDistance(metric, s.values, query.values))
        expectBestK(records, references, k, NEAREST_FIRST[metric], DIMENSIONS, roundoff(FLOAT32, precision))
        expect(records.length, `${name} k = ${k}`).to.equal(k)
      }
    }
  })

  it('ranks vectors of every element type', async function () {
    for (const { name, type } of ELEMENT_TYPES) {
      const { set, stored, query } = await loadRandom(type, 300, 2)
      const records = await topK(set, bySimilarity(COSINE_SIMILARITY, query.vector), 20)
      const references = stored.map(s => referenceDistance(COSINE_SIMILARITY, s.values, query.values))
      expectBestK(records, references, 20, false, DIMENSIONS, roundoff(type, precision))
      expect(records.length, name).to.equal(20)
    }
  })

  it('ranks the same whether or not the vector bin is returned', async function () {
    const { set, stored, query } = await loadRandom(FLOAT32, 500, 3)
    const withoutVector = await topK(set, bySimilarity(DOT_PRODUCT, query.vector), 25)
    const withVector = await topK(set, bySimilarity(DOT_PRODUCT, query.vector, ['v']), 25)

    expect(digests(withVector)).to.eql(digests(withoutVector))
    for (const record of withoutVector) {
      expect(Object.keys(record.bins).sort()).to.eql(['d', 'id'])
    }
    for (const record of withVector) {
      const vector = record.bins.v as Aerospike.Vector
      expect(vector).to.be.instanceof(Vector)
      expect(vector.toBytes()).to.eql(stored[record.bins.id as number].vector.toBytes())
    }
  })

  it('orders by a stored bin while returning the distance (R17)', async function () {
    const { set, stored, query } = await loadRandom(FLOAT32, 200, 4, i => ({ rank: (i * 37) % 200 }))
    const records = await topK(set, q => {
      q.ops = [
        operations.read('id'),
        operations.read('rank'),
        exp.operations.read('d', exp.vectorDistance(EUCLIDEAN_SQUARED, query.vector, exp.binVector('v')), 0)
      ]
      q.orderBy('rank', INTEGER, DESC)
    }, 5)

    expect(records.map(r => r.bins.rank)).to.eql([199, 198, 197, 196, 195])
    for (const record of records) {
      const reference = referenceDistance(EUCLIDEAN_SQUARED, stored[record.bins.id as number].values, query.values)
      expect(record.bins.d).to.be.closeTo(reference.value, 1e-4)
    }
  })

  it('searches only the records that match an index and a filter (R22)', async function () {
    const categories = ['shoes', 'shirts', 'hats']
    const { set, stored, query } = await loadRandom(FLOAT32, 600, 5, i => ({ cat: categories[i % 3], stock: i % 4 }))
    await indexBin(set, 'cat', Aerospike.indexDataType.STRING)

    const records = await topK(set, q => {
      q.where(filter.equal('cat', 'shoes'))
      bySimilarity(COSINE_SIMILARITY, query.vector, ['cat', 'stock'])(q)
    }, 10, { filterExpression: exp.gt(exp.binInt('stock'), exp.int(0)) })

    // The reference ranks only in-stock shoes.
    const matches = (i: number) => i % 3 === 0 && i % 4 > 0
    const references = stored.map((s, i) => (matches(i) ? referenceDistance(COSINE_SIMILARITY, s.values, query.values) : null))
    expect(records.every(r => r.bins.cat === 'shoes' && (r.bins.stock as number) > 0)).to.be.true
    expectBestK(records, references, 10, false, DIMENSIONS, roundoff(FLOAT32, precision))
  })

  it('returns every match, ranked, when k is larger than the number of matches', async function () {
    const { set, stored, query } = await loadRandom(FLOAT64, 7, 6)
    const records = await topK(set, bySimilarity(EUCLIDEAN_SQUARED, query.vector), 1000)
    const references = stored.map(s => referenceDistance(EUCLIDEAN_SQUARED, s.values, query.values))
    expectBestK(records, references, 1000, true, DIMENSIONS, roundoff(FLOAT64, precision))
    expect(records.length).to.equal(7)
  })

  it('leaves out records whose distance is unknown, or ranks them last with EVAL_NO_FAIL (R19)', async function () {
    const good = [Vector.ofFloat32([1, 0]), Vector.ofFloat32([0, 1]), Vector.ofFloat32([1, 1])]
    const unknown = [
      Vector.ofFloat32([1, 0, 0]), // other dimensions
      Vector.ofFloat64([1, 0]), // other element type
      undefined, // no vector bin
      Buffer.from([1, 2]), // a blob
      [1, 0] // a list
    ]
    const all = [...good, ...unknown]
    const set = await loadVectors(all, all.map((_, i) => ({ id: i })))
    const query = Vector.ofFloat32([1, 0])

    // Dot products with (1, 0): 1, 0 and 1. The tie goes in digest order.
    const known = await topK(set, bySimilarity(DOT_PRODUCT, query), 10)
    expect(known.map(r => r.bins.d)).to.eql([1, 1, 0])
    expect(known.slice(0, 2).map(r => r.bins.id).sort()).to.eql([0, 2])
    expect(inDigestOrder(known.slice(0, 2))).to.be.true
    expect(known[2].bins.id).to.equal(1)

    const everything = await topK(set, bySimilarity(DOT_PRODUCT, query, [], exp.expReadFlags.EVAL_NO_FAIL), 10)
    expect(everything.length).to.equal(all.length)
    expect(everything.slice(0, 3).map(r => r.bins.d)).to.eql([1, 1, 0])
    expect(everything.slice(3).every(r => r.bins.d == null), 'unknown distances come last, without a value').to.be.true
  })

  it('returns the same records in the same order every time', async function () {
    const { set, query } = await loadRandom(FLOAT32, 1000, 8)
    const first = await topK(set, bySimilarity(COSINE_SIMILARITY, query.vector), 50)
    for (let run = 0; run < 3; run++) {
      expect(digests(await topK(set, bySimilarity(COSINE_SIMILARITY, query.vector), 50))).to.eql(digests(first))
    }
  })
})

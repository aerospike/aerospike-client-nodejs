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

/* global describe, it, before, afterEach */

// Local only, not run on CI: set AEROSPIKE_STRESS=1.

import { expect } from 'chai';
import * as Aerospike from '../../lib/aerospike.js';
import * as helper from '../test_helper.ts';
import { topK, digests, skipUnlessTopKQueriesRun } from '../topk/helpers.ts';
import {
  ELEMENT_TYPES, makeVector, referenceDistance, roundoff, distancePrecision, loadVectors, removeLoadedSets,
  removeLater, seededRandom, expectBestK, loadGridSet, expectSearchGrid, expectFilterGrid, nonFiniteVector
} from './helpers.ts';

const { exp, operations, status } = Aerospike
const { DOUBLE } = Aerospike.binDataType
const { DESC } = Aerospike.order
const { FLOAT32 } = Aerospike.vectorElementType
const { COSINE_SIMILARITY } = Aerospike.vectorDistanceMetric

const MB = 1024 * 1024

// A node answers a Top-K query only after scanning all its records: no socket or total limit.
const NO_TIMEOUT = { socketTimeout: 0, totalTimeout: 0 }

function nearest (query: Aerospike.Vector, alsoRead: string[] = []) {
  return (q: any) => {
    q.ops = [
      operations.read('id'),
      exp.operations.read('d', exp.vectorDistance(COSINE_SIMILARITY, query, exp.binVector('v')), 0),
      ...alsoRead.map(bin => operations.read(bin))
    ]
    q.orderBy('d', DOUBLE, DESC)
  }
}

describe('Vectors under stress', function () {
  this.timeout(1800000)
  helper.skipUnlessVersion('>= 8.2.1', this)
  before(function () {
    if (process.env.AEROSPIKE_STRESS !== '1') this.skip()
  })
  skipUnlessTopKQueriesRun(this)

  let precision: string
  before(async function () { precision = await distancePrecision() })
  afterEach(removeLoadedSets)

  it('finds the true 1,000 nearest of 50,000 768-dimension vectors (R23)', async function () {
    const random = seededRandom(51)
    const stored = Array.from({ length: 50000 }, () => makeVector(FLOAT32, 768, () => random() * 2 - 1))
    const query = makeVector(FLOAT32, 768, () => random() * 2 - 1)
    const set = await loadVectors(stored.map(s => s.vector), stored.map((_, i) => ({ id: i })))

    const started = Date.now()
    const records = await topK(set, nearest(query.vector), 1000, NO_TIMEOUT)
    console.log(`      3 searches over 50,000 vectors: ${Date.now() - started} ms`)
    const references = stored.map(s => referenceDistance(COSINE_SIMILARITY, s.values, query.values))
    expectBestK(records, references, 1000, false, 768, roundoff(FLOAT32, precision))
  })

  it('every metric, both directions and every projection over 50,000 768-dimension vectors, against brute force', async function () {
    const grid = await loadGridSet(FLOAT32, 50000, 768, 54)
    await expectSearchGrid(grid, FLOAT32, [100, 1000])
  })

  it('filters and computes distances without Top-K over 50,000 768-dimension vectors', async function () {
    const grid = await loadGridSet(FLOAT32, 50000, 768, 55)
    await expectFilterGrid(grid, FLOAT32)
  })

  it('returns 1,000 of the largest vectors with their bins, using memory near k times their size', async function () {
    for (const { name, type, maxDimensions, size } of ELEMENT_TYPES) {
      const random = seededRandom(52)
      const count = 1100 // above k, and small enough for a 1 GiB test namespace
      const vectors = Array.from({ length: count }, () => makeVector(type, maxDimensions, () => random() * 100).vector)
      const set = await loadVectors(vectors, vectors.map((_, i) => ({ id: i })))
      const query = makeVector(type, maxDimensions, () => random() * 100).vector

      const before = process.memoryUsage().rss
      const records = await topK(set, nearest(query, ['v']), 1000, NO_TIMEOUT)
      const grown = process.memoryUsage().rss - before

      expect(records.length, name).to.equal(1000)
      for (const record of records) {
        expect((record.bins.v as Aerospike.Vector).toBytes(), name).to.eql(vectors[record.bins.id as number].toBytes())
      }
      // Three queries ran (see topK()), each holding at most k vectors; allow headroom.
      const kVectors = 1000 * maxDimensions * size
      expect(grown / MB, `${name}: grew ${Math.round(grown / MB)} MB for k = 1,000 vectors of ${Math.round(kVectors / MB)} MB`).to.be.below(6 * kVectors / MB + 200)
      await removeLoadedSets()
    }
  })

  it('stays exact while writes and searches run together for a minute', async function () {
    const random = seededRandom(53)
    const stored = Array.from({ length: 10000 }, () => makeVector(FLOAT32, 256, () => random() * 2 - 1))
    const query = makeVector(FLOAT32, 256, () => random() * 2 - 1).vector
    const set = await loadVectors(stored.map(s => s.vector), stored.map((_, i) => ({ id: i })))
    const expected = digests(await topK(set, nearest(query), 100))
    const other = await loadVectors([undefined], [{ id: 0 }])
    removeLater(other, 1000)

    const end = Date.now() + 60000
    let searches = 0
    let writes = 0
    const searcher = async () => {
      while (Date.now() < end) {
        const q = helper.client.query(helper.namespace, set)
        nearest(query)(q)
        q.topK(100)
        expect(digests(await q.results())).to.eql(expected)
        searches++
      }
    }
    const writer = async () => {
      while (Date.now() < end) {
        await helper.client.put(new Aerospike.Key(helper.namespace, other, writes % 1000), { v: makeVector(FLOAT32, 256, () => random()).vector })
        writes++
      }
    }
    await Promise.all([searcher(), searcher(), searcher(), writer(), writer()])
    expect(searches).to.be.above(10)
  })

  it('does not keep growing in memory building float16 vectors from numbers, reading their values, or rejecting them', function () {
    const gc = (globalThis as any).gc
    if (!gc) this.skip() // needs node --expose-gc
    // 16,384 elements: a leak of the C client's vector in any of the three calls
    // would grow memory by about 64 MB a round.
    const values = new Float32Array(16384).fill(0.5)
    const rejected = new Float32Array(16384).fill(0.5)
    rejected[16383] = NaN
    const round = () => {
      for (let i = 0; i < 2000; i++) {
        expect(Aerospike.Vector.ofFloat16(values).toArray()[0]).to.equal(0.5)
        expect(() => Aerospike.Vector.ofFloat16(rejected)).to.throw('is not finite as float16')
      }
      gc()
      return process.memoryUsage().rss
    }
    round()
    const first = round()
    const last = round()
    expect((last - first) / MB, 'memory grew between rounds').to.be.below(20)
  })

  it('does not keep growing in memory over many vectors and rejected writes', async function () {
    const gc = (globalThis as any).gc
    if (!gc) this.skip() // needs node --expose-gc
    const set = await loadVectors([undefined], [{ id: 0 }])
    const key = new Aerospike.Key(helper.namespace, set, 0)
    const round = async () => {
      for (let i = 0; i < 2000; i++) {
        const vector = Aerospike.Vector.ofFloat32(new Float32Array(1024).fill(i))
        vector.toBytes()
        await helper.client.put(key, { v: nonFiniteVector(FLOAT32, [NaN]) }).catch(e => expect(e.code).to.equal(status.ERR_REQUEST_INVALID))
      }
      gc()
      return process.memoryUsage().rss
    }
    await round()
    const first = await round()
    const last = await round()
    expect((last - first) / MB, 'memory grew between rounds').to.be.below(20)
  })
})

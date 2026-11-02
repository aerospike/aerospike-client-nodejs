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

/* global describe, it, after */

import { expect } from 'chai';
import * as Aerospike from '../../lib/aerospike.js';
import * as helper from '../test_helper.ts';
import { topK, skipUnlessTopKQueriesRun } from '../topk/helpers.ts';
import {
  ELEMENT_TYPES, METRICS, makeVector, referenceDistance, loadVectors, removeLoadedSets, distanceOf, seededRandom, expectTypeError,
  loadGridSet, expectFilterGrid
} from './helpers.ts';

const { Vector, exp, operations, status } = Aerospike
const { DOUBLE } = Aerospike.orderByType
const { ASC } = Aerospike.order
const { FLOAT64 } = Aerospike.vectorElementType
const { EUCLIDEAN_SQUARED, DOT_PRODUCT, COSINE_SIMILARITY } = Aerospike.vectorDistanceMetric

const QUERY = Vector.ofFloat32([1, 0])

// Bin v values that a (1, 0) FLOAT32 query can't be compared with.
const INCOMPARABLE: Array<[string, unknown]> = [
  ['other dimensions', Vector.ofFloat32([1, 0, 0])],
  ['another element type', Vector.ofFloat64([1, 0])],
  ['a blob', Buffer.from([1, 2])],
  ['a list', [1, 0]],
  ['an integer', 5],
  ['no bin v', undefined]
]

// The ids of the records in set that a query with filterExpression returns.
async function idsMatching (set: string, filterExpression: any): Promise<number[]> {
  const records = await helper.client.query(helper.namespace, set).results({ filterExpression })
  return records.map(record => record.bins.id as number).sort((a, b) => a - b)
}

describe('Vector distance rules', function () {
  this.timeout(60000)
  helper.skipUnlessVersion('>= 8.2.1', this)
  after(removeLoadedSets)

  it('fails a single read of an unknown distance, or reads nil with EVAL_NO_FAIL (R19)', async function () {
    const set = await loadVectors(INCOMPARABLE.map(([, v]) => v), INCOMPARABLE.map(() => ({ other: 1 })))
    for (let i = 0; i < INCOMPARABLE.length; i++) {
      const name = INCOMPARABLE[i][0]
      const error = await distanceOf(set, i, DOT_PRODUCT, QUERY).then(() => null, e => e)
      expect(error, name).to.be.instanceof(Aerospike.AerospikeError)
      expect(error.code, name).to.equal(status.ERR_OP_NOT_APPLICABLE)

      const distance = exp.vectorDistance(DOT_PRODUCT, QUERY, exp.binVector('v'))
      const record = await helper.client.operate(new Aerospike.Key(helper.namespace, set, i),
        [exp.operations.read('d', distance, exp.expReadFlags.EVAL_NO_FAIL)])
      expect(record.bins.d, name).to.equal(null)
    }
  })

  it('skips records whose distance is unknown in a query filter, without an error (R19)', async function () {
    const values = [Vector.ofFloat32([2, 0]), ...INCOMPARABLE.map(([, v]) => v)]
    const set = await loadVectors(values, values.map((_, i) => ({ id: i })))
    const matchesAny = exp.ge(exp.vectorDistance(DOT_PRODUCT, QUERY, exp.binVector('v')), exp.float(-1e300))
    expect(await idsMatching(set, matchesAny)).to.eql([0])
  })

  it('keeps exactly the records past a distance threshold, for every metric (R12)', async function () {
    const random = seededRandom(21)
    const stored = Array.from({ length: 400 }, () => makeVector(FLOAT64, 8, () => random() * 2 - 1))
    const query = makeVector(FLOAT64, 8, () => random() * 2 - 1)
    const set = await loadVectors(stored.map(s => s.vector), stored.map((_, i) => ({ id: i })))

    for (const { name, metric } of METRICS) {
      const distances = stored.map(s => referenceDistance(metric, s.values, query.values).value)
      // A threshold halfway between two neighbouring distances, so rounding can't move a record across it.
      const sorted = [...distances].sort((a, b) => a - b)
      const threshold = (sorted[149] + sorted[150]) / 2
      const expected = distances.map((d, i) => [d, i]).filter(([d]) => d > threshold).map(([, i]) => i)
      const filterExpression = exp.gt(exp.vectorDistance(metric, query.vector, exp.binVector('v')), exp.float(threshold))
      expect(await idsMatching(set, filterExpression), name).to.eql(expected)
    }
  })

  it('filters and computes distances without Top-K for every element type, metric and projection (2,000 x 128)', async function () {
    for (const { name, type } of ELEMENT_TYPES) {
      const grid = await loadGridSet(type, 2000, 128, 500 + type)
      await expectFilterGrid(grid, type).catch(e => { e.message = `${name}: ${e.message}`; throw e })
      await removeLoadedSets()
    }
  })

  it('treats a distance equal to the threshold as > false and >= true', async function () {
    // (1, 2) and (3, 4): dot 11 and squared L2 8, exactly; a vector with itself: cosine 1.
    const set = await loadVectors([Vector.ofFloat32([1, 2]), Vector.ofFloat32([3, 4])], [{ id: 0 }, { id: 1 }])
    const cases: Array<[number, Aerospike.Vector, number, number[]]> = [
      [DOT_PRODUCT, Vector.ofFloat32([3, 4]), 11, [0]],
      [EUCLIDEAN_SQUARED, Vector.ofFloat32([3, 4]), 8, [0]],
      [COSINE_SIMILARITY, Vector.ofFloat32([1, 2]), 1, [0]]
    ]
    for (const [metric, query, threshold, atThreshold] of cases) {
      const distance = exp.vectorDistance(metric, query, exp.binVector('v'))
      expect(await idsMatching(set, exp.gt(distance, exp.float(threshold))), `metric ${metric} >`).to.not.include.members(atThreshold)
      expect(await idsMatching(set, exp.ge(distance, exp.float(threshold))), `metric ${metric} >=`).to.include.members(atThreshold)
    }
  })

  it('reads the same distance through operate(), batchRead() and a query', async function () {
    const random = seededRandom(22)
    const stored = Array.from({ length: 20 }, () => makeVector(FLOAT64, 32, () => random() * 2 - 1))
    const query = makeVector(FLOAT64, 32, () => random() * 2 - 1).vector
    const set = await loadVectors(stored.map(s => s.vector), stored.map((_, i) => ({ id: i })))
    const readDistance = (metric: number) => exp.operations.read('d', exp.vectorDistance(metric, query, exp.binVector('v')), 0)

    for (const { name, metric } of METRICS) {
      const single = await Promise.all(stored.map((_, i) => distanceOf(set, i, metric, query)))
      const batch = await helper.client.batchRead(stored.map((_, i) => ({
        key: new Aerospike.Key(helper.namespace, set, i), ops: [readDistance(metric)]
      })))
      const q = helper.client.query(helper.namespace, set)
      q.ops = [operations.read('id'), readDistance(metric)]
      const fromQuery: number[] = []
      for (const record of await q.results()) fromQuery[record.bins.id as number] = record.bins.d as number

      expect(batch.map(r => r.record.bins.d), `${name} batchRead`).to.eql(single)
      expect(fromQuery, `${name} query`).to.eql(single)
    }
  })

  it('counts every distance it computes, per metric, in the server statistics', async function () {
    const counters = async () => {
      const stats = await helper.client.infoAny('statistics')
      const read = (name: string) => Number(new RegExp(`vector_distance_calculations_${name}=(\\d+)`).exec(stats)![1])
      return { [DOT_PRODUCT]: read('dot_product'), [EUCLIDEAN_SQUARED]: read('euclidean_squared'), [COSINE_SIMILARITY]: read('cosine') }
    }
    const values = [Vector.ofFloat32([1, 2]), Vector.ofFloat32([3, 4]), Vector.ofFloat32([5, 6])]
    const set = await loadVectors(values, values.map((_, i) => ({ id: i })))
    for (const { name, metric } of METRICS) {
      const before = await counters()
      for (let i = 0; i < 3; i++) await distanceOf(set, i, metric, QUERY)
      const q = helper.client.query(helper.namespace, set)
      q.ops = [exp.operations.read('d', exp.vectorDistance(metric, QUERY, exp.binVector('v')), 0)]
      await q.results()
      const after = await counters()
      for (const { metric: other } of METRICS) {
        expect(after[other] - before[other], `${name}: counter of metric ${other}`).to.equal(other === metric ? 6 : 0)
      }
    }
  })

  describe('in a Top-K query', function () {
    skipUnlessTopKQueriesRun(this)

    it('ranks in the direction asked, so ASC on cosine gives the least similar first', async function () {
      const set = await loadVectors([[1, 0], [0, 1], [-1, 0], [1, 1]].map(v => Vector.ofFloat32(v)), [0, 1, 2, 3].map(id => ({ id })))
      const records = await topK(set, q => {
        q.ops = [operations.read('id'), exp.operations.read('d', exp.vectorDistance(COSINE_SIMILARITY, QUERY, exp.binVector('v')), 0)]
        q.orderBy('d', DOUBLE, ASC)
      }, 2)
      expect(records.map(r => r.bins.id)).to.eql([2, 1])
    })
  })

  it('fails cleanly when a distance is compared with an integer', async function () {
    const set = await loadVectors([Vector.ofFloat32([2, 3])])
    const error = await helper.client.get(new Aerospike.Key(helper.namespace, set, 0), {
      filterExpression: exp.gt(exp.vectorDistance(DOT_PRODUCT, QUERY, exp.binVector('v')), exp.int(1))
    }).then(() => null, e => e)
    expect(error).to.be.instanceof(Aerospike.AerospikeError)
    expect(error.code).to.equal(status.ERR_REQUEST_INVALID)
  })

  it('throws a TypeError for an unknown metric, a query that is not a Vector or a bin that is not an expression #noserver', function () {
    const bin = exp.binVector('v')
    for (const metric of [99, -1, 3, 1.5, undefined, null, 'COSINE_SIMILARITY', '1', [1], true]) {
      expectTypeError(() => exp.vectorDistance(metric as any, QUERY, bin), 'metric must be one of Aerospike.vectorDistanceMetric', String(metric))
    }
    for (const query of [undefined, null, [1, 0], new Float32Array([1, 0]), QUERY.toBytes(), { elementType: 3 }]) {
      expectTypeError(() => exp.vectorDistance(DOT_PRODUCT, query as any, bin), 'query must be a Vector', String(query))
    }
    for (const notExpression of ['v', 5, undefined, null, { bin: 'v' }, Buffer.from('v')]) {
      expectTypeError(() => exp.vectorDistance(DOT_PRODUCT, QUERY, notExpression as any), 'bin must be an expression, such as exp.binVector(name)', String(notExpression))
    }
  })
})

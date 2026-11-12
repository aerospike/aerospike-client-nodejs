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

// Local only, not run on CI: changes the server's vector-distance-precision
// setting (and puts it back). Set AEROSPIKE_SERVER_CONFIG=1.

import { expect } from 'chai';
import * as Aerospike from '../../lib/aerospike.js';
import * as helper from '../test_helper.ts';
import { topK, inDigestOrder, skipUnlessTopKQueriesRun } from '../topk/helpers.ts';
import {
  ELEMENT_TYPES, METRICS, makeVector, referenceDistance, expectNear, distancePrecision, loadVectors,
  removeLoadedSets, distanceOf, seededRandom, setPrecision
} from './helpers.ts';

const { Vector, status, exp, operations } = Aerospike
const { FLOAT64 } = Aerospike.vectorElementType
const { DOT_PRODUCT, EUCLIDEAN_SQUARED } = Aerospike.vectorDistanceMetric

describe('Vector distance precision setting', function () {
  this.timeout(120000)
  helper.skipUnlessVersion('>= 8.2.1', this)
  before(function () {
    if (process.env.AEROSPIKE_SERVER_CONFIG !== '1') this.skip()
  })

  let original: string
  before(async function () { original = await distancePrecision() })
  after(async function () {
    if (original) await setPrecision(original)
    await removeLoadedSets()
  })

  it('switches between float and double at run time, without a restart (R65)', async function () {
    const set = await loadVectors([Vector.ofInt32([16777217]), Vector.ofFloat32([1e8, 1, -1e8])])
    const sums = async () => [
      await distanceOf(set, 0, DOT_PRODUCT, Vector.ofInt32([1])),
      await distanceOf(set, 1, DOT_PRODUCT, Vector.ofFloat32([1, 1, 1]))
    ]
    await setPrecision('double')
    expect(await distancePrecision()).to.equal('double')
    expect(await sums(), 'double').to.eql([16777217, 1])
    await setPrecision('float')
    expect(await distancePrecision()).to.equal('float')
    expect(await sums(), 'float').to.eql([16777216, 0])
  })

  it('matches a double-precision reference to double precision when set to double (R65)', async function () {
    await setPrecision('double')
    const random = seededRandom(61)
    const pairs = ELEMENT_TYPES.flatMap(({ name, type }) => [1, 2, 3].map(seed => ({
      name: `${name} seed ${seed}`,
      type,
      stored: makeVector(type, 768, () => (random() * 2 - 1) * (type === Aerospike.vectorElementType.INT32 ? 1000 : 1)),
      query: makeVector(type, 768, () => (random() * 2 - 1) * (type === Aerospike.vectorElementType.INT32 ? 1000 : 1))
    })))
    const set = await loadVectors(pairs.map(p => p.stored.vector))
    for (let i = 0; i < pairs.length; i++) {
      for (const { name, metric } of METRICS) {
        const actual = await distanceOf(set, i, metric, pairs[i].query.vector)
        expectNear(actual, referenceDistance(metric, pairs[i].stored.values, pairs[i].query.values), 768, 2 ** -53, `${pairs[i].name} ${name}`)
      }
    }
  })

  it('gives FLOAT64 vectors the same double-precision distance with either setting (R66)', async function () {
    const random = seededRandom(62)
    const pairs = Array.from({ length: 5 }, () => [makeVector(FLOAT64, 768, () => random() * 2 - 1), makeVector(FLOAT64, 768, () => random() * 2 - 1)])
    const set = await loadVectors(pairs.map(([stored]) => stored.vector))
    const all = async () => {
      const out: number[] = []
      for (let i = 0; i < pairs.length; i++) for (const { metric } of METRICS) out.push(await distanceOf(set, i, metric, pairs[i][1].vector))
      return out
    }
    await setPrecision('float')
    const withFloat = await all()
    await setPrecision('double')
    expect(await all()).to.eql(withFloat)
    for (let i = 0; i < pairs.length; i++) {
      METRICS.forEach(({ name, metric }, m) => expectNear(withFloat[i * 3 + m], referenceDistance(metric, pairs[i][0].values, pairs[i][1].values), 768, 2 ** -53, name))
    }
  })

  describe('in a vector search', function () {
    skipUnlessTopKQueriesRun(this)

    it('ranks distances that differ only beyond 32-bit precision exactly with double, and ties them with float', async function () {
      // 64 elements of 1, except the first, 1 + n * 2^-23: squared distances to the
      // origin of 64 + n * 2^-22, closer together than a 32-bit float near 64 can tell.
      const order = [7, 2, 9, 0, 5, 1, 8, 3, 6, 4]
      const vectors = order.map(n => {
        const elements = new Float32Array(64).fill(1)
        elements[0] = 1 + n * 2 ** -23
        return Vector.ofFloat32(elements)
      })
      const set = await loadVectors(vectors, order.map(n => ({ n })))
      const nearestFirst = (q: any) => {
        q.ops = [operations.read('n'), exp.operations.read('d', exp.vectorDistance(EUCLIDEAN_SQUARED, Vector.ofFloat32(new Float32Array(64)), exp.binVector('v')), 0)]
        q.orderBy('d', Aerospike.binDataType.DOUBLE, Aerospike.order.ASC)
      }

      await setPrecision('double')
      const exact = await topK(set, nearestFirst, 10)
      expect(exact.map(r => r.bins.n), 'double').to.eql([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])

      await setPrecision('float')
      const tied = await topK(set, nearestFirst, 10)
      expect(tied.map(r => r.bins.d), 'float: every distance is 64').to.eql(new Array(10).fill(64))
      expect(inDigestOrder(tied), 'float: the tie goes in digest order').to.be.true
    })
  })

  it('rejects an unknown value and keeps the setting', async function () {
    await setPrecision('float')
    const error = await setPrecision('quad').then(() => null, e => e)
    expect(error).to.be.instanceof(Aerospike.AerospikeError)
    expect(error.code).to.equal(status.ERR_REQUEST_INVALID)
    expect(await distancePrecision()).to.equal('float')
  })
})

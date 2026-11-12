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
import { digests, skipUnlessTopKQueriesRun } from '../topk/helpers.ts';
import { makeVector, loadVectors, removeLoadedSets, removeLater, seededRandom, nonFiniteVector } from './helpers.ts';

const { Vector, exp, operations, batchType, status } = Aerospike
const { DOUBLE } = Aerospike.binDataType
const { DESC } = Aerospike.order
const { FLOAT32, FLOAT64 } = Aerospike.vectorElementType
const { COSINE_SIMILARITY } = Aerospike.vectorDistanceMetric

// Each failure here must end in one of three ways: an exact result, a clean
// error with a known code, or a timeout. Never a wrong or partial result.

const keyOf = (set: string, i: number) => new Aerospike.Key(helper.namespace, set, i)

// A search for the 100 records most similar to query, as a fresh query.
function search (set: string, query: Aerospike.Vector) {
  const q = helper.client.query(helper.namespace, set)
  q.ops = [operations.read('id'), exp.operations.read('d', exp.vectorDistance(COSINE_SIMILARITY, query, exp.binVector('v')), 0)]
  q.orderBy('d', DOUBLE, DESC)
  q.topK(100)
  return q
}

describe('Vector failures the client must survive', function () {
  this.timeout(120000)
  helper.skipUnlessVersion('>= 8.2.1', this)

  let set: string
  let query: Aerospike.Vector
  let expected: string[]
  before(async function () {
    const random = seededRandom(41)
    const stored = Array.from({ length: 3000 }, () => makeVector(FLOAT32, 768, () => random() * 2 - 1).vector)
    query = makeVector(FLOAT32, 768, () => random() * 2 - 1).vector
    set = await loadVectors(stored, stored.map((_, i) => ({ id: i })))
  })
  after(removeLoadedSets)

  it('writes the good vectors of a batch and rejects only the bad ones', async function () {
    const target = await loadVectors([undefined, undefined, undefined, undefined], [0, 1, 2, 3].map(id => ({ id })))
    const writes = [Vector.ofFloat32([1, 2]), nonFiniteVector(FLOAT32, [NaN]), [Vector.ofFloat32([1])], Vector.ofInt32([3])]
    const results = await helper.client.batchWrite(writes.map((v, i) => ({
      type: batchType.BATCH_WRITE, key: keyOf(target, i), ops: [operations.write('v', v as any)]
    })))
    expect(results.map(r => r.status)).to.eql([status.OK, status.ERR_REQUEST_INVALID, status.ERR_REQUEST_INVALID, status.OK])

    const stored = await helper.client.batchRead([0, 1, 2, 3].map(i => ({ key: keyOf(target, i), readAllBins: true })))
    expect((stored[0].record.bins.v as Aerospike.Vector).toBytes()).to.eql((writes[0] as Aerospike.Vector).toBytes())
    expect(stored[1].record.bins).to.eql({ id: 1 })
    expect(stored[2].record.bins).to.eql({ id: 2 })
    expect((stored[3].record.bins.v as Aerospike.Vector).toBytes()).to.eql((writes[3] as Aerospike.Vector).toBytes())
  })

  it('keeps working after many rejected writes', async function () {
    const target = await loadVectors([Vector.ofFloat32([1, 2])])
    const bad = [() => nonFiniteVector(FLOAT32, [NaN]), () => nonFiniteVector(FLOAT64, [Infinity]), () => [Vector.ofFloat32([1])]]
    for (let i = 0; i < 300; i++) {
      const error = await helper.client.put(keyOf(target, 0), { v: bad[i % 3]() } as any).then(() => null, e => e)
      expect(error?.code, `write ${i}`).to.equal(status.ERR_REQUEST_INVALID)
    }
    for (let i = 0; i < 300; i++) {
      const error = (() => { try { Vector.ofInt32([0.5]); return null } catch (e) { return e } })() as any
      expect(error?.code).to.equal(status.ERR_PARAM)
    }
    expect(((await helper.client.get(keyOf(target, 0))).bins.v as Aerospike.Vector).toBytes()).to.eql(Vector.ofFloat32([1, 2]).toBytes())
  })

  describe('during a search', function () {
    skipUnlessTopKQueriesRun(this)

    before(async function () {
      expected = digests(await search(set, query).results())
      expect(expected.length).to.equal(100)
    })

    it('times out cleanly under a short total timeout, then searches exactly', async function () {
      for (const totalTimeout of [1, 2, 5]) {
        const outcome = await search(set, query).results({ totalTimeout }).then(records => records, e => e)
        if (outcome instanceof Error) {
          expect((outcome as any).code, `totalTimeout ${totalTimeout}`).to.equal(status.ERR_TIMEOUT)
        } else {
          expect(digests(outcome as AerospikeRecord[]), `totalTimeout ${totalTimeout}: a partial result`).to.eql(expected)
        }
      }
      expect(digests(await search(set, query).results())).to.eql(expected)
    })

    it('stops cleanly when foreach() is aborted, then searches exactly', async function () {
      for (let run = 0; run < 20; run++) {
        await new Promise<void>((resolve, reject) => {
          const stream = search(set, query).foreach()
          stream.on('data', () => stream.abort())
          stream.on('error', reject)
          stream.on('end', () => resolve())
        })
      }
      expect(digests(await search(set, query).results())).to.eql(expected)
    })

    it('gives every concurrent search the exact result, or a clean refusal past the connection limit', async function () {
      const writeSet = await loadVectors([undefined], [{ id: 0 }])
      removeLater(writeSet, 300)
      const random = seededRandom(42)
      // 30 searches and 300 writes at once: more than the 100 connections per node allowed.
      const searches = Array.from({ length: 30 }, () => search(set, query).results().then(records => records, e => e))
      const writes = Array.from({ length: 300 }, (_, i) =>
        helper.client.put(keyOf(writeSet, i), { v: makeVector(FLOAT32, 768, () => random()).vector }).then(() => null, e => e))
      const [searched, written] = await Promise.all([Promise.all(searches), Promise.all(writes)])

      let exact = 0
      for (const outcome of [...searched, ...written]) {
        if (outcome instanceof Error) {
          expect((outcome as any).code).to.equal(status.ERR_NO_MORE_CONNECTIONS)
        } else if (outcome) {
          expect(digests(outcome as AerospikeRecord[])).to.eql(expected)
          exact++
        }
      }
      expect(exact, 'no search got through').to.be.above(0)
      expect(digests(await search(set, query).results())).to.eql(expected)
    })
  })
})

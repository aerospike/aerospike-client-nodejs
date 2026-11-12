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

// Local only, not run on CI: needs a multi-node cluster and AEROSPIKE_MULTI_NODE=1.
// Run it on replication factor 1 and 2.

import type { AerospikeRecord } from '../../lib/aerospike.js';

import { expect } from 'chai';
import * as Aerospike from '../../lib/aerospike.js';
import * as helper from '../test_helper.ts';
import {
  topK, digests, masterPartitions, ownerOf, waitForMigrations, skipUnlessMultiNode, skipUnlessTopKQueriesRun
} from '../topk/helpers.ts';
import {
  makeVector, referenceDistance, roundoff, distancePrecision, loadVectors, removeLoadedSets, seededRandom, expectBestK
} from './helpers.ts';

const { exp, operations, status } = Aerospike
const { DOUBLE } = Aerospike.binDataType
const { ASC, DESC } = Aerospike.order
const { FLOAT32 } = Aerospike.vectorElementType
const { EUCLIDEAN_SQUARED, COSINE_SIMILARITY } = Aerospike.vectorDistanceMetric

const DIMENSIONS = 64

// count random vectors stored with bin id, and a query vector.
async function loadRandom (count: number, seed: number) {
  const random = seededRandom(seed)
  const stored = Array.from({ length: count }, () => makeVector(FLOAT32, DIMENSIONS, () => random() * 2 - 1))
  const query = makeVector(FLOAT32, DIMENSIONS, () => random() * 2 - 1)
  const set = await loadVectors(stored.map(s => s.vector), stored.map((_, i) => ({ id: i })))
  return { set, stored, query }
}

function nearest (metric: number, query: Aerospike.Vector, ascending: boolean) {
  return (q: any) => {
    q.ops = [operations.read('id'), exp.operations.read('d', exp.vectorDistance(metric, query, exp.binVector('v')), 0)]
    q.orderBy('d', DOUBLE, ascending ? ASC : DESC)
  }
}

// Searches again and again for ms milliseconds while the test's operator changes the
// cluster. Every result must be valid; errors must have one of the allowed codes.
async function searchWhileChanging (set: string, query: Aerospike.Vector, ms: number, allowed: number[]) {
  const end = Date.now() + ms
  let results = 0
  let errors = 0
  while (Date.now() < end) {
    const q = helper.client.query(helper.namespace, set)
    nearest(COSINE_SIMILARITY, query, false)(q)
    q.topK(100)
    let records: AerospikeRecord[]
    try {
      records = await q.results({ socketTimeout: 0, totalTimeout: 30000 } as any)
    } catch (error: any) {
      expect(allowed, `${error.code}: ${error.message}`).to.include(error.code)
      errors++
      continue
    }
    const distances = records.map(r => r.bins.d as number)
    expect(records.length).to.be.at.most(100)
    expect(new Set(digests(records)).size, 'a record appeared twice').to.equal(records.length)
    expect(distances, 'out of order').to.eql([...distances].sort((a, b) => b - a))
    results++
  }
  return { results, errors }
}

describe('Vector search across several nodes', function () {
  this.timeout(600000)
  helper.skipUnlessVersion('>= 8.2.1', this)
  skipUnlessMultiNode(this, 2)
  skipUnlessTopKQueriesRun(this)

  let precision: string
  before(async function () { precision = await distancePrecision() })
  after(removeLoadedSets)

  it('merges every node\'s nearest k into the true global nearest k', async function () {
    const { set, stored, query } = await loadRandom(5000, 1)
    const masters = await masterPartitions()
    for (const [metric, ascending] of [[COSINE_SIMILARITY, false], [EUCLIDEAN_SQUARED, true]] as const) {
      for (const k of [1, 10, 100, 1000]) {
        const records = await topK(set, nearest(metric, query.vector, ascending), k)
        const references = stored.map(s => referenceDistance(metric, s.values, query.values))
        expectBestK(records, references, k, ascending, DIMENSIONS, roundoff(FLOAT32, precision))
        if (k >= 100) {
          const owners = new Set(records.map(r => ownerOf(masters, r.key.digest as Buffer)))
          expect(owners.size, 'the result must come from more than one node').to.be.above(1)
        }
      }
    }
  })

  it('reads every vector back bit for bit from whichever node owns it', async function () {
    const { set, stored } = await loadRandom(2000, 2)
    const records = await helper.client.batchRead(stored.map((_, i) => ({ key: new Aerospike.Key(helper.namespace, set, i), readAllBins: true })))
    records.forEach((r, i) => expect((r.record.bins.v as Aerospike.Vector).toBytes(), `record ${i}`).to.eql(stored[i].vector.toBytes()))
  })

  describe('while partitions migrate (AEROSPIKE_MIGRATION_TEST=1: add or remove a node during the test)', function () {
    it('returns only valid results, and the exact result once settled; vectors stay bit-identical', async function () {
      if (process.env.AEROSPIKE_MIGRATION_TEST !== '1') this.skip()
      const { set, stored, query } = await loadRandom(20000, 3)
      const { results, errors } = await searchWhileChanging(set, query.vector, 120000, [status.ERR_CLUSTER])
      expect(results, `${results} results, ${errors} errors`).to.be.above(errors)

      await waitForMigrations()
      const references = stored.map(s => referenceDistance(COSINE_SIMILARITY, s.values, query.values))
      expectBestK(await topK(set, nearest(COSINE_SIMILARITY, query.vector, false), 100), references, 100, false, DIMENSIONS, roundoff(FLOAT32, precision))
      const records = await helper.client.batchRead(stored.map((_, i) => ({ key: new Aerospike.Key(helper.namespace, set, i), readAllBins: true })))
      records.forEach((r, i) => expect((r.record.bins.v as Aerospike.Vector).toBytes(), `record ${i}`).to.eql(stored[i].vector.toBytes()))
    })
  })

  describe('while a node fails (AEROSPIKE_NODE_FAILURE_TEST=1: kill or freeze a node during the test)', function () {
    it('returns only valid results or clean errors, and the exact result once the node is back', async function () {
      if (process.env.AEROSPIKE_NODE_FAILURE_TEST !== '1') this.skip()
      const { set, stored, query } = await loadRandom(20000, 4)
      const allowed = [status.ERR_CLUSTER, status.ERR_TIMEOUT, status.ERR_CONNECTION, status.ERR_ASYNC_CONNECTION, status.ERR_SERVER_FULL]
      await searchWhileChanging(set, query.vector, 90000, allowed)

      await waitForMigrations()
      const references = stored.map(s => referenceDistance(COSINE_SIMILARITY, s.values, query.values))
      expectBestK(await topK(set, nearest(COSINE_SIMILARITY, query.vector, false), 100), references, 100, false, DIMENSIONS, roundoff(FLOAT32, precision))
    })
  })

  describe('on a mixed cluster (AEROSPIKE_MIXED_CLUSTER=1: one node older than 8.2.1)', function () {
    it('fails a vector search before sending anything', async function () {
      if (process.env.AEROSPIKE_MIXED_CLUSTER !== '1') this.skip()
      const query = helper.client.query(helper.namespace, helper.set)
      nearest(COSINE_SIMILARITY, Aerospike.Vector.ofFloat32([1, 0]), false)(query)
      query.topK(10)
      const error = await query.results().then(() => null, e => e)
      expect(error?.code).to.equal(status.ERR_PARAM)
    })

    it('either stores a vector bit for bit or rejects it cleanly, on every node', async function () {
      if (process.env.AEROSPIKE_MIXED_CLUSTER !== '1') this.skip()
      const vector = Aerospike.Vector.ofFloat32([1, 2, 3])
      for (let i = 0; i < 200; i++) {
        const key = new Aerospike.Key(helper.namespace, helper.set, `vector_mixed_${i}`)
        const error = await helper.client.put(key, { v: vector }).then(() => null, e => e)
        if (error) {
          expect(error).to.be.instanceof(Aerospike.AerospikeError)
        } else {
          expect(((await helper.client.get(key)).bins.v as Aerospike.Vector).toBytes()).to.eql(vector.toBytes())
          await helper.client.remove(key)
        }
      }
    })
  })
})

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

/* global describe, it, afterEach */

// Local only: needs a multi-node cluster and AEROSPIKE_MULTI_NODE=1. Run it twice,
// on a cluster with replication factor 1 and on one with replication factor 2.
// Setup scripts: .vectordocs/topk-test-server/ (not in the repo).

import { expect } from 'chai';
import * as Aerospike from '../../lib/aerospike.js';
import * as helper from '../test_helper.ts';
import type { OrderKey, ModelRecord } from './helpers.ts';
import {
  loadModel, loadSet, removeLoadedSets, topK, digests, referenceTopK, orderBy, masterPartitions, ownerOf, setBin,
  partitionOf, seededRandom, pick, newQuery, errorFrom, allRecords, waitForMigrations,
  skipUnlessTopKQueriesRun, skipUnlessMultiNode
} from './helpers.ts';

const { INTEGER, STRING } = Aerospike.orderByType
const { ASC, DESC } = Aerospike.order
const { DEFAULT } = Aerospike.orderByFlags
const { exp, status } = Aerospike

const byScore: OrderKey[] = [{ bin: 'score', type: INTEGER, direction: DESC, flags: DEFAULT }]
const byScoreThenName: OrderKey[] = [...byScore, { bin: 'name', type: STRING, direction: ASC, flags: DEFAULT }]
const hexDigests = (records: ModelRecord[]) => records.map(record => record.digest.toString('hex'))

// count records with a random score in [0, scores) and a random name.
function scoredRecords (count: number, scores: number, seed: number) {
  const random = seededRandom(seed)
  return Array.from({ length: count }, () => ({
    score: { type: INTEGER, value: Math.floor(random() * scores) },
    name: { type: STRING, value: pick(random, ['a', 'b', 'c', 'd']) }
  }))
}

describe('Top-K across several nodes', function () {
  this.timeout(600000)
  helper.skipUnlessVersion('>= 8.2.1', this)
  skipUnlessMultiNode(this, 2)
  skipUnlessTopKQueriesRun(this)
  afterEach(removeLoadedSets)

  it('merges every node\'s best k into the true global top k', async function () {
    const { set, model } = await loadModel(scoredRecords(3000, 1000, 1))
    const masters = await masterPartitions()
    const owners = new Set(referenceTopK(model, byScore, 100).map(r => ownerOf(masters, r.digest)))
    expect(owners.size, 'the top 100 must come from more than one node').to.be.above(1)

    for (const keys of [byScore, byScoreThenName]) {
      for (const k of [1, 10, 100, 1000]) {
        expect(digests(await topK(set, orderBy(keys), k)), `${keys.length} key(s), k = ${k}`)
          .to.eql(hexDigests(referenceTopK(model, keys, k)))
      }
    }

    // With a filter expression: each node ranks only the records it keeps.
    const filtered = model.filter(record => (record.bins.score!.value as number) >= 500)
    expect(digests(await topK(set, orderBy(byScoreThenName), 100, { filterExpression: exp.ge(exp.binInt('score'), exp.int(500)) })),
      'with a filter expression').to.eql(hexDigests(referenceTopK(filtered, byScoreThenName, 100)))

    // With a computed key, nearest to 500 first: each node computes it, then the client merges.
    const distance = model.map(record => ({
      digest: record.digest,
      bins: { dist: { type: INTEGER, value: Math.abs((record.bins.score!.value as number) - 500) } }
    }))
    const byDistance: OrderKey[] = [{ bin: 'dist', type: INTEGER, direction: ASC, flags: DEFAULT }]
    const nearest = await topK(set, q => {
      q.ops = [exp.operations.read('dist', exp.abs(exp.sub(exp.binInt('score'), exp.int(500))), 0)]
      orderBy(byDistance)(q)
    }, 100)
    expect(digests(nearest), 'with a computed key').to.eql(hexDigests(referenceTopK(distance, byDistance, 100)))
  })

  it('returns the right top k when all of it lives on one node', async function () {
    const { set, model } = await loadModel(scoredRecords(2000, 100, 2))
    const masters = await masterPartitions()
    const [node] = masters.keys()
    const onNode = model.map((record, id) => ({ record, id })).filter(({ record }) => ownerOf(masters, record.digest) === node)
    expect(onNode.length, 'the chosen node must hold at least 50 records').to.be.at.least(50)

    // Give the node's first 50 records scores above everything else.
    for (const [i, { record, id }] of onNode.slice(0, 50).entries()) {
      await setBin(set, id, 'score', 1000 + i)
      record.bins.score = { type: INTEGER, value: 1000 + i }
    }

    const top = await topK(set, orderBy(byScore), 50)
    expect(digests(top)).to.eql(hexDigests(referenceTopK(model, byScore, 50)))
    expect(top.every(r => ownerOf(masters, r.key.digest as Buffer) === node)).to.be.true

    // Only that node's 50 records pass this filter, so every other node returns nothing.
    const onlyThatNode = { filterExpression: exp.ge(exp.binInt('score'), exp.int(1000)) }
    expect(digests(await topK(set, orderBy(byScore), 60, onlyThatNode)), 'other nodes return nothing').to.eql(digests(top))
  })

  it('breaks ties across nodes by digest', async function () {
    const { set, model } = await loadModel(scoredRecords(2000, 2, 3)) // scores 0 and 1 only
    const masters = await masterPartitions()
    const expected = referenceTopK(model, byScore, 100)
    expect(new Set(expected.map(r => ownerOf(masters, r.digest))).size, 'ties must span nodes').to.be.above(1)

    expect(digests(await topK(set, orderBy(byScore), 100))).to.eql(hexDigests(expected))
  })

  it('ranks a partition subset that spans nodes', async function () {
    const { set, model } = await loadModel(scoredRecords(3000, 1000, 4))
    const masters = await masterPartitions()
    const inSubset = model.filter(record => partitionOf(record.digest) < 2048)
    const expected = referenceTopK(inSubset, byScoreThenName, 100)
    expect(new Set(expected.map(r => ownerOf(masters, r.digest))).size, 'the subset must span nodes').to.be.above(1)

    const top = await topK(set, q => {
      q.partitions(0, 2048)
      orderBy(byScoreThenName)(q)
    }, 100)
    expect(digests(top)).to.eql(hexDigests(expected))
  })

  describe('at scale', function () {
    skipUnlessMultiNode(this, 5)

    it('5+ nodes, 300,000 records, k = 1,000', async function () {
      const { set, model } = await loadModel(scoredRecords(300000, 10000, 5))
      // A node replies only after scanning all its records, so allow a long socket wait.
      const patient = { socketTimeout: 0, totalTimeout: 300000 }

      for (const keys of [byScore, byScoreThenName]) {
        const top = await topK(set, orderBy(keys), 1000, patient)
        expect(top).to.have.length(1000)
        expect(digests(top), `${keys.length} key(s)`).to.eql(hexDigests(referenceTopK(model, keys, 1000)))
      }
    })

    it('with a short socket timeout, returns the right top k or a timeout, never a wrong result', async function () {
      const { set, model } = await loadModel(scoredRecords(300000, 10000, 7))
      const expected = hexDigests(referenceTopK(model, byScoreThenName, 1000))

      // Short socket timeouts make nodes time out mid-scan, so the client retries and the node rescans.
      for (const socketTimeout of [20, 100, 500]) {
        for (let attempt = 0; attempt < 5; attempt++) {
          const query = helper.client.query(helper.namespace, set)
          orderBy(byScoreThenName)(query)
          query.topK(1000)
          const policy = { socketTimeout, totalTimeout: 60000, maxRetries: 3 }
          const label = `socketTimeout ${socketTimeout} ms, attempt ${attempt}`
          try {
            expect(digests(await query.results(policy as any)), label).to.eql(expected)
          } catch (error: any) {
            if (error.name === 'AssertionError') throw error
            expect(error.code, `${label}: ${error.message}`).to.equal(status.ERR_TIMEOUT)
          }
        }
      }
    })
  })

  describe('on a mixed cluster (AEROSPIKE_MIXED_CLUSTER=1: one node older than 8.2.1)', function () {
    it('fails before sending anything', async function () {
      if (process.env.AEROSPIKE_MIXED_CLUSTER !== '1') this.skip()
      const query = newQuery()
      query.orderBy('score', INTEGER, DESC)
      query.topK(10)

      const error = await errorFrom(() => query.results())
      expect(error, 'expected an error').to.not.be.null
      expect(error.code).to.equal(status.ERR_PARAM)
      expect(error.message).to.equal('order_by/top_k is not supported by all nodes in the cluster')
    })

    it('still runs ordinary queries', async function () {
      if (process.env.AEROSPIKE_MIXED_CLUSTER !== '1') this.skip()
      const set = await loadSet(Array.from({ length: 100 }, (_, n) => ({ n })))
      expect(await allRecords(set)).to.have.length(100)
    })
  })

  describe('while partitions migrate (AEROSPIKE_MIGRATION_TEST=1: add or remove a node during the test)', function () {
    it('never returns a record twice, more than k records, or records out of order; exact once settled', async function () {
      if (process.env.AEROSPIKE_MIGRATION_TEST !== '1') this.skip()
      const { set, model } = await loadModel(scoredRecords(20000, 1000, 6))

      // Keep querying for two minutes; meanwhile, add or remove a node to start migrations.
      // While partitions change owner, any query (Top-K or not) can fail with ERR_CLUSTER
      // ("partition unavailable"); applications retry. Every result that does come back
      // must still be valid.
      const end = Date.now() + 120000
      let runs = 0
      let unavailable = 0
      while (Date.now() < end) {
        const query = helper.client.query(helper.namespace, set)
        orderBy(byScore)(query)
        query.topK(100)
        let top
        try {
          top = await query.results({ socketTimeout: 0, totalTimeout: 60000 } as any)
        } catch (error: any) {
          expect(error.code, `run ${runs}: ${error.message}`).to.equal(status.ERR_CLUSTER)
          unavailable++
          continue
        }
        const scores = top.map(record => record.bins.score as number)

        expect(top.length, `run ${runs}`).to.be.at.most(100)
        expect(new Set(digests(top)).size, `run ${runs}: a record appeared twice`).to.equal(top.length)
        expect(scores, `run ${runs}: out of order`).to.eql([...scores].sort((a, b) => b - a))
        runs++
      }
      expect(runs, `${runs} results, ${unavailable} partition-unavailable errors`).to.be.above(unavailable)

      // Once migrations finish, the result must be exactly right again.
      await waitForMigrations()
      expect(digests(await topK(set, orderBy(byScore), 100)), 'after migrations settle')
        .to.eql(hexDigests(referenceTopK(model, byScore, 100)))
    })
  })
})

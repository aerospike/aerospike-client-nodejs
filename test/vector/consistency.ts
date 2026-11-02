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

// Runs only when the test namespace has strong consistency on (enterprise server).
// The node-loss test also needs a multi-node cluster and AEROSPIKE_NODE_FAILURE_TEST=1
// (kill or freeze a node while it runs).

import { expect } from 'chai';
import * as Aerospike from '../../lib/aerospike.js';
import * as helper from '../test_helper.ts';
import { makeVector, loadVectors, removeLoadedSets, removeLater, seededRandom } from './helpers.ts';

const { Vector, status } = Aerospike
const { FLOAT32 } = Aerospike.vectorElementType

const LINEARIZE = { readModeSC: Aerospike.policy.readModeSC.LINEARIZE }

const bytesOf = (record: Aerospike.AerospikeRecord) => (record.bins.v as Aerospike.Vector).toBytes()

describe('Vectors with strong consistency', function () {
  this.timeout(600000)
  helper.skipUnlessVersion('>= 8.2.1', this)
  before(async function () {
    const config = await helper.client.infoAny(`get-config:context=namespace;id=${helper.namespace}`)
    if (!/strong-consistency=true/.test(config)) this.skip()
  })
  after(removeLoadedSets)

  it('reads the last acknowledged vector with linearizable reads (R53)', async function () {
    const random = seededRandom(81)
    const set = await loadVectors(Array.from({ length: 50 }, () => undefined), Array.from({ length: 50 }, (_, i) => ({ id: i })))
    for (let round = 0; round < 5; round++) {
      for (let i = 0; i < 50; i++) {
        const key = new Aerospike.Key(helper.namespace, set, i)
        const vector = makeVector(FLOAT32, 64, () => random()).vector
        await helper.client.put(key, { v: vector })
        expect(bytesOf(await helper.client.get(key, LINEARIZE as any)), `round ${round} record ${i}`).to.eql(vector.toBytes())
      }
    }
  })

  it('makes a transaction\'s vectors visible on commit, and discards them on abort', async function () {
    const before = [Vector.ofFloat32([1, 1]), Vector.ofFloat32([2, 2]), Vector.ofFloat32([3, 3])]
    const set = await loadVectors(before)
    const keys = before.map((_, i) => new Aerospike.Key(helper.namespace, set, i))
    const after = [Vector.ofFloat64([9, 9]), Vector.ofInt32([8]), Vector.ofFloat16([0x3c00])]

    for (const outcome of ['abort', 'commit'] as const) {
      const txn = new Aerospike.Transaction()
      for (let i = 0; i < keys.length; i++) await helper.client.put(keys[i], { v: after[i] }, null, { txn } as any)
      for (let i = 0; i < keys.length; i++) {
        expect(bytesOf(await helper.client.get(keys[i], { txn } as any)), `inside the transaction, record ${i}`).to.eql(after[i].toBytes())
      }
      if (outcome === 'abort') {
        expect(await helper.client.abort(txn)).to.equal(Aerospike.Transaction.abortStatus.OK)
      } else {
        expect(await helper.client.commit(txn)).to.equal(Aerospike.Transaction.commitStatus.OK)
      }
      const expected = outcome === 'abort' ? before : after
      for (let i = 0; i < keys.length; i++) {
        expect(bytesOf(await helper.client.get(keys[i], LINEARIZE as any)), `after ${outcome}, record ${i}`).to.eql(expected[i].toBytes())
      }
    }
  })

  it('rejects an invalid vector inside a transaction and keeps the records on abort', async function () {
    const original = Vector.ofFloat32([1, 2])
    const set = await loadVectors([original, original])
    const keys = [0, 1].map(i => new Aerospike.Key(helper.namespace, set, i))
    const txn = new Aerospike.Transaction()
    await helper.client.put(keys[0], { v: Vector.ofFloat32([5, 6]) }, null, { txn } as any)
    const error = await helper.client.put(keys[1], { v: Vector.ofFloat32([NaN]) }, null, { txn } as any).then(() => null, e => e)
    expect(error?.code).to.equal(status.ERR_REQUEST_INVALID)
    await helper.client.abort(txn)
    for (const key of keys) {
      expect(bytesOf(await helper.client.get(key, LINEARIZE as any))).to.eql(original.toBytes())
    }
  })

  describe('while a node fails (AEROSPIKE_NODE_FAILURE_TEST=1: kill or freeze a node during the test)', function () {
    it('loses no acknowledged vector write (R53)', async function () {
      if (process.env.AEROSPIKE_NODE_FAILURE_TEST !== '1') this.skip()
      const random = seededRandom(82)
      const set = await loadVectors([undefined], [{ id: 0 }])
      removeLater(set, 500)
      const acknowledged = new Map<number, Buffer>()
      const allowed = [status.ERR_CLUSTER, status.ERR_TIMEOUT, status.ERR_CONNECTION, status.ERR_ASYNC_CONNECTION]
      let failures = 0

      const end = Date.now() + 90000
      for (let n = 0; Date.now() < end; n++) {
        const i = n % 500
        const vector = makeVector(FLOAT32, 64, () => random()).vector
        try {
          await helper.client.put(new Aerospike.Key(helper.namespace, set, i), { v: vector }, null, { totalTimeout: 5000 } as any)
          acknowledged.set(i, vector.toBytes())
        } catch (error: any) {
          // In doubt or refused: the record may hold either value, so stop checking it.
          expect(allowed.concat(status.ERR_NO_MORE_CONNECTIONS), `${error.code}: ${error.message}`).to.include(error.code)
          acknowledged.delete(i)
          failures++
        }
      }

      // Once the node is back and the cluster has settled, every acknowledged write must be there.
      await new Promise(resolve => setTimeout(resolve, 20000))
      for (const [i, bytes] of acknowledged) {
        const record = await helper.client.get(new Aerospike.Key(helper.namespace, set, i), { ...LINEARIZE, totalTimeout: 10000 } as any)
        expect(bytesOf(record), `record ${i}`).to.eql(bytes)
      }
      expect(acknowledged.size, `${failures} writes failed`).to.be.above(0)
    })
  })
})

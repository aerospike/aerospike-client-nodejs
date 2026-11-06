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
import { ELEMENT_TYPES, makeVector, loadVectors, removeLoadedSets, seededRandom } from './helpers.ts';

const { Vector, exp, operations, batchType, status } = Aerospike
const { FLOAT16, INT32, FLOAT32, FLOAT64 } = Aerospike.vectorElementType

// The particle types binType() reports.
const VECTOR_TYPE = 16
const BLOB_TYPE = 4

const keyOf = (set: string, i: number) => new Aerospike.Key(helper.namespace, set, i)

// Checks that value is a Vector with the same bytes as expected.
function expectSameVector (value: unknown, expected: Aerospike.Vector, label = '') {
  expect(value, label).to.be.instanceof(Vector)
  expect((value as Aerospike.Vector).toBytes(), label).to.eql(expected.toBytes())
}

// Edge values and 768 random elements of each type.
function testVectors () {
  const random = seededRandom(31)
  return [
    Vector.ofFloat16Bits([0x0000, 0x8000, 0x0001, 0x0400, 0x3c00, 0x7bff, 0xfbff]),
    Vector.ofInt32([-(2 ** 31), 2 ** 31 - 1, 0, -1]),
    Vector.ofFloat32([3.4028234663852886e38, -3.4028234663852886e38, 1.1754943508222875e-38, 1.401298464324817e-45, -0, 0.1]),
    Vector.ofFloat64([Number.MAX_VALUE, -Number.MAX_VALUE, Number.MIN_VALUE, 2.2250738585072014e-308, -0, 0.1]),
    ...[FLOAT16, INT32, FLOAT32, FLOAT64].map(type => makeVector(type, 768, () => (random() * 2 - 1) * (type === INT32 ? 1e9 : 1)).vector)
  ]
}

describe('Vector write and read paths', function () {
  this.timeout(60000)
  helper.skipUnlessVersion('>= 8.2.1', this)
  after(removeLoadedSets)

  it('reads back every element type bit for bit, edge values included (R1, R2, R3, R61, R62)', async function () {
    const vectors = testVectors()
    const set = await loadVectors(vectors)
    for (let i = 0; i < vectors.length; i++) {
      const record = await helper.client.get(keyOf(set, i))
      expectSameVector(record.bins.v, vectors[i], `vector ${i}`)
      expect((record.bins.v as Aerospike.Vector).elementType).to.equal(vectors[i].elementType)
    }
  })

  it('stores the most dimensions each element type holds (R6)', async function () {
    const random = seededRandom(32)
    const vectors = ELEMENT_TYPES.map(({ type, maxDimensions }) => makeVector(type, maxDimensions, () => random() * 100).vector)
    const set = await loadVectors(vectors)
    for (let i = 0; i < vectors.length; i++) {
      const record = await helper.client.get(keyOf(set, i))
      expectSameVector(record.bins.v, vectors[i], ELEMENT_TYPES[i].name)
    }
  })

  it('stores the same bytes through put(), operate() and batchWrite()', async function () {
    const vectors = testVectors()
    const set = await loadVectors(vectors.map(() => undefined), vectors.map(() => ({ id: 0 })))
    const half = vectors.length >> 1
    for (let i = 0; i < half; i++) {
      await helper.client.operate(keyOf(set, i), [operations.write('v', vectors[i])])
    }
    const results = await helper.client.batchWrite(vectors.slice(half).map((v, j) => ({
      type: batchType.BATCH_WRITE, key: keyOf(set, half + j), ops: [operations.write('v', v)]
    })))
    expect(results.every(r => r.status === status.OK)).to.be.true

    for (let i = 0; i < vectors.length; i++) {
      expectSameVector((await helper.client.get(keyOf(set, i))).bins.v, vectors[i], `vector ${i}`)
    }
  })

  it('returns a Vector from every read path', async function () {
    const vectors = testVectors()
    const set = await loadVectors(vectors, vectors.map((_, i) => ({ id: i })))
    const reads: Array<[string, (i: number) => Promise<unknown>]> = [
      ['get()', async i => (await helper.client.get(keyOf(set, i))).bins.v],
      ['select()', async i => (await helper.client.select(keyOf(set, i), ['v'])).bins.v],
      ['operate() read', async i => (await helper.client.operate(keyOf(set, i), [operations.read('v')])).bins.v],
      ['batchRead() all bins', async i => (await helper.client.batchRead([{ key: keyOf(set, i), readAllBins: true }]))[0].record.bins.v],
      ['batchRead() one bin', async i => (await helper.client.batchRead([{ key: keyOf(set, i), bins: ['v'] }]))[0].record.bins.v],
      ['batchGet()', async i => (await helper.client.batchGet([keyOf(set, i)]))[0].record.bins.v],
      ['batchSelect()', async i => (await helper.client.batchSelect([keyOf(set, i)], ['v']))[0].record.bins.v]
    ]
    for (const [path, read] of reads) {
      for (let i = 0; i < vectors.length; i++) {
        expectSameVector(await read(i), vectors[i], `${path} vector ${i}`)
      }
    }

    const fromQuery = await helper.client.query(helper.namespace, set).results()
    const fromScan = await helper.client.scan(helper.namespace, set).results()
    for (const [path, records] of [['query', fromQuery], ['scan', fromScan]] as const) {
      expect(records.length, path).to.equal(vectors.length)
      for (const record of records) {
        expectSameVector(record.bins.v, vectors[record.bins.id as number], `${path} vector ${record.bins.id}`)
      }
    }
  })

  it('keeps typed arrays and Buffers as blobs and arrays as lists', async function () {
    const set = await loadVectors([Vector.ofFloat32([1, 2])], [{ f32: new Float32Array([1, 2]), buf: Buffer.from([1, 2]), list: [1, 2] }])
    const { bins } = await helper.client.get(keyOf(set, 0))
    expect(bins.f32).to.eql(Buffer.from(new Float32Array([1, 2]).buffer))
    expect(bins.buf).to.eql(Buffer.from([1, 2]))
    expect(bins.list).to.eql([1, 2])

    const types = await helper.client.operate(keyOf(set, 0), ['v', 'f32', 'buf'].map(bin => exp.operations.read(bin, exp.binType(bin), 0)))
    expect(types.bins).to.eql({ v: VECTOR_TYPE, f32: BLOB_TYPE, buf: BLOB_TYPE })
  })

  it('leaves the other bins of a record unchanged when a vector bin is added (R51)', async function () {
    const others = { n: 42, s: 'text', list: [1, 'two', [3]], map: { a: 1, b: [2] }, blob: Buffer.from([9, 8]) }
    const set = await loadVectors([undefined], [others])
    await helper.client.operate(keyOf(set, 0), [operations.write('v', Vector.ofFloat32([1, 2, 3]))])
    const { bins } = await helper.client.get(keyOf(set, 0))
    expect({ ...bins, v: undefined }).to.eql({ ...others, v: undefined })
    expectSameVector(bins.v, Vector.ofFloat32([1, 2, 3]))
  })

  it('holds several vector bins of different types in one record', async function () {
    const vectors = testVectors()
    const bins = Object.fromEntries(vectors.map((v, i) => [`v${i}`, v]))
    const set = await loadVectors([undefined], [bins])
    const record = await helper.client.get(keyOf(set, 0))
    for (const [bin, vector] of Object.entries(bins)) {
      expectSameVector(record.bins[bin], vector, bin)
    }
  })

  it('copies a vector bin with a write expression, as a vector', async function () {
    const vector = Vector.ofFloat32([1, 2, 3])
    const set = await loadVectors([vector])
    await helper.client.operate(keyOf(set, 0), [exp.operations.write('copy', exp.binVector('v'), 0)])
    const { bins } = await helper.client.get(keyOf(set, 0))
    expectSameVector(bins.copy, vector)
    const types = await helper.client.operate(keyOf(set, 0), [exp.operations.read('t', exp.binType('copy'), 0)])
    expect(types.bins.t).to.equal(VECTOR_TYPE)
  })

  it('writes, reads and computes a distance on a vector in one operate()', async function () {
    const set = await loadVectors([undefined], [{ n: 1 }])
    const record = await helper.client.operate(keyOf(set, 0), [
      operations.write('v', Vector.ofInt32([3, 4])),
      operations.read('v'),
      exp.operations.read('d', exp.vectorDistance(Aerospike.vectorDistanceMetric.DOT_PRODUCT, Vector.ofInt32([2, 1]), exp.binVector('v')), 0)
    ])
    expectSameVector(record.bins.v, Vector.ofInt32([3, 4]))
    expect(record.bins.d).to.equal(10)
  })

  it('returns Vectors page by page from paginated queries and scans', async function () {
    const vectors = Array.from({ length: 50 }, (_, i) => Vector.ofFloat32([i, -i]))
    const set = await loadVectors(vectors, vectors.map((_, i) => ({ id: i })))
    const seen: number[] = []
    const query = helper.client.query(helper.namespace, set, { paginate: true, maxRecords: 20 } as any)
    for (let page = 0; page < 10; page++) {
      for (const record of await query.results()) {
        expectSameVector(record.bins.v, vectors[record.bins.id as number])
        seen.push(record.bins.id as number)
      }
      if (!query.hasNextPage()) break
    }
    expect(seen.sort((a, b) => a - b)).to.eql(vectors.map((_, i) => i))

    const scan = helper.client.scan(helper.namespace, set, { paginate: true } as any)
    const scanned = await scan.results({ maxRecords: 30 } as any)
    expect(scanned.length).to.equal(30)
    for (const record of scanned) expectSameVector(record.bins.v, vectors[record.bins.id as number])
  })

  it('keeps a vector through replace, generation checks, touch, a stored key and batch remove', async function () {
    const vector = Vector.ofFloat64([0.25, -8])
    const set = await loadVectors([Vector.ofFloat32([1]), Vector.ofFloat32([2])], [{ n: 1 }, { n: 2 }])
    const key = keyOf(set, 0)

    await helper.client.put(key, { v: vector }, null, { exists: Aerospike.policy.exists.REPLACE, key: Aerospike.policy.key.SEND } as any)
    let record = await helper.client.get(key)
    expect(Object.keys(record.bins)).to.eql(['v'])
    expect(record.key.key).to.equal(0)
    expectSameVector(record.bins.v, vector)

    await helper.client.put(key, { v: vector }, { gen: record.gen }, { gen: Aerospike.policy.gen.EQ } as any)
    const stale = await helper.client.put(key, { v: vector }, { gen: record.gen }, { gen: Aerospike.policy.gen.EQ } as any).then(() => null, e => e)
    expect(stale?.code).to.equal(status.ERR_RECORD_GENERATION)

    await helper.client.operate(key, [operations.touch(5000)])
    record = await helper.client.get(key)
    expect(record.ttl).to.be.within(4990, 5000)
    expectSameVector(record.bins.v, vector)

    const removed = await helper.client.batchRemove([key, keyOf(set, 1)])
    expect(removed.map(r => r.status)).to.eql([status.OK, status.OK])
    expect(await helper.client.exists(key)).to.be.false
  })

  it('removes a vector bin written as null, and the record when deleted (R11)', async function () {
    const set = await loadVectors([Vector.ofFloat32([1, 2])], [{ n: 1 }])
    await helper.client.put(keyOf(set, 0), { v: null } as any)
    expect((await helper.client.get(keyOf(set, 0))).bins).to.eql({ n: 1 })

    await helper.client.put(keyOf(set, 0), { v: Vector.ofFloat32([1, 2]) })
    await helper.client.remove(keyOf(set, 0))
    expect(await helper.client.exists(keyOf(set, 0))).to.be.false
  })
})

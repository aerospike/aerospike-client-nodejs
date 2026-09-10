// *****************************************************************************
// Copyright 2013-2026 Aerospike, Inc.
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

/* eslint-env mocha */
/* global expect */

import type { Vector as Vec, status as statusModule, Client, Key as K, AerospikeRecord, exp as expModule, operations, query as queryModule } from '../lib/aerospike.js';
import * as Aerospike from '../lib/aerospike.js';

import { expect } from 'chai';
import * as helper from './test_helper.ts';

const Vector: typeof Vec = Aerospike.Vector
const status: typeof statusModule = Aerospike.status
const exp: typeof expModule = Aerospike.exp
const op: typeof operations = Aerospike.operations
const orderByType: typeof queryModule.orderByType = Aerospike.query.orderByType
const order: typeof queryModule.order = Aerospike.query.order

describe('Aerospike.Vector #noserver', function () {
  describe('static factories', function () {
    it('creates a FLOAT32 vector from a plain array', function () {
      const v: Vec = Vector.ofFloat32([0.5, -1.25, 3.0])

      expect(v).to.be.instanceof(Vector)
      expect(v.elementType).to.equal(Vector.ElementType.FLOAT32)
      expect(v.dimensions).to.equal(3)
      expect(Array.from(v.elements as Float32Array)).to.eql([0.5, -1.25, 3.0])
      expect(v.version).to.equal(Vector.VERSION)
    })

    it('creates a FLOAT64 vector from a plain array', function () {
      const v: Vec = Vector.ofFloat64([1.1, 2.2, 3.3])

      expect(v.elementType).to.equal(Vector.ElementType.FLOAT64)
      expect(Array.from(v.elements as Float64Array)).to.eql([1.1, 2.2, 3.3])
    })

    it('creates an INT32 vector from a plain array', function () {
      const v: Vec = Vector.ofInt32([-5, 0, 7, 12345])

      expect(v.elementType).to.equal(Vector.ElementType.INT32)
      expect(Array.from(v.elements as Int32Array)).to.eql([-5, 0, 7, 12345])
    })

    it('creates a FLOAT16 vector from raw bit patterns', function () {
      // 0x3c00 = 1.0, 0xbc00 = -1.0, 0x4000 = 2.0 (IEEE 754 half precision)
      const v: Vec = Vector.ofFloat16([0x3c00, 0xbc00, 0x4000])

      expect(v.elementType).to.equal(Vector.ElementType.FLOAT16)
      expect(Array.from(v.elements as Uint16Array)).to.eql([0x3c00, 0xbc00, 0x4000])
    })

    it('accepts an already-typed array', function () {
      const v: Vec = Vector.ofFloat32(Float32Array.from([1, 2, 3]))
      expect(Array.from(v.elements as Float32Array)).to.eql([1, 2, 3])
    })

    it('rejects a non-array-like value', function () {
      const fn = () => Vector.ofFloat32('not an array' as any)
      expect(fn).to.throw()
      try {
        fn()
      } catch (error: any) {
        expect(error.code).to.equal(status.ERR_PARAM)
      }
    })
  })

  describe('validation', function () {
    it('rejects an empty vector', function () {
      const fn = () => Vector.ofFloat32([])
      expect(fn).to.throw(/at least one element/)
    })

    it('rejects a vector exceeding the per-type dimension cap', function () {
      // FLOAT64 caps out at 32,768 dimensions (256KB / 8 bytes).
      const tooLong = new Float64Array(32769)
      const fn = () => Vector.ofFloat64(tooLong)
      expect(fn).to.throw(/exceeds the maximum/)
    })

    it('accepts a vector at exactly the per-type dimension cap', function () {
      // FLOAT32/INT32 cap out at 65,536 dimensions (256KB / 4 bytes).
      const atCap = new Float32Array(65536)
      const v: Vec = Vector.ofFloat32(atCap)
      expect(v.dimensions).to.equal(65536)
    })

    it('rejects NaN elements for float types', function () {
      const fn = () => Vector.ofFloat32([1.0, NaN, 3.0])
      expect(fn).to.throw(/finite number/)
    })

    it('rejects Infinity elements for float types', function () {
      const fn = () => Vector.ofFloat64([1.0, Infinity, 3.0])
      expect(fn).to.throw(/finite number/)
    })

    it('rejects out-of-range int32 elements', function () {
      const fn = () => Vector.ofInt32([2147483648])
      expect(fn).to.throw(/not a valid int32 value/)
    })

    it('rejects non-integer int32 elements', function () {
      const fn = () => Vector.ofInt32([1.5])
      expect(fn).to.throw(/not a valid int32 value/)
    })

    it('rejects out-of-range float16 bit patterns', function () {
      const fn = () => Vector.ofFloat16([0x10000])
      expect(fn).to.throw(/not a valid float16 bit pattern/)
    })

    it('raises errors with AerospikeError ERR_PARAM semantics', function () {
      try {
        Vector.ofFloat32([])
        expect.fail('expected an error to be thrown')
      } catch (error: any) {
        expect(error.code).to.equal(status.ERR_PARAM)
      }
    })
  })

  describe('#toBuffer() / Vector.fromBuffer()', function () {
    it('round-trips a FLOAT32 vector', function () {
      const v: Vec = Vector.ofFloat32([0.5, -1.25, 3.0])
      const buf: Buffer = v.toBuffer()
      const roundTripped: Vec = Vector.fromBuffer(buf)

      expect(roundTripped.elementType).to.equal(v.elementType)
      expect(roundTripped.version).to.equal(v.version)
      expect(Array.from(roundTripped.elements as Float32Array)).to.eql(Array.from(v.elements as Float32Array))
    })

    it('round-trips a FLOAT64 vector', function () {
      const v: Vec = Vector.ofFloat64([1.1, 2.2, 3.3])
      const roundTripped: Vec = Vector.fromBuffer(v.toBuffer())
      expect(Array.from(roundTripped.elements as Float64Array)).to.eql(Array.from(v.elements as Float64Array))
    })

    it('round-trips an INT32 vector', function () {
      const v: Vec = Vector.ofInt32([-5, 0, 7, 12345])
      const roundTripped: Vec = Vector.fromBuffer(v.toBuffer())
      expect(Array.from(roundTripped.elements as Int32Array)).to.eql(Array.from(v.elements as Int32Array))
    })

    it('round-trips a FLOAT16 vector', function () {
      const v: Vec = Vector.ofFloat16([0x3c00, 0xbc00, 0x4000])
      const roundTripped: Vec = Vector.fromBuffer(v.toBuffer())
      expect(Array.from(roundTripped.elements as Uint16Array)).to.eql(Array.from(v.elements as Uint16Array))
    })

    it('produces an 8-byte header followed by little-endian element data', function () {
      const v: Vec = Vector.ofInt32([1, 2])
      const buf: Buffer = v.toBuffer()

      expect(buf.length).to.equal(8 + 2 * 4)
      expect(buf.readUInt8(0)).to.equal(Vector.VERSION) // version
      expect(buf.readUInt8(1)).to.equal(Vector.ElementType.INT32) // element_type
      expect(buf.readUInt32LE(2)).to.equal(2) // dimensions
      expect(buf.readUInt16LE(6)).to.equal(0) // reserved
      expect(buf.readInt32LE(8)).to.equal(1)
      expect(buf.readInt32LE(12)).to.equal(2)
    })

    it('rejects a buffer shorter than the header', function () {
      const fn = () => Vector.fromBuffer(Buffer.alloc(4))
      expect(fn).to.throw(/smaller than the 8-byte header/)
    })

    it('rejects a buffer with an unknown element type', function () {
      const buf = Buffer.alloc(8)
      buf.writeUInt8(1, 0) // version
      buf.writeUInt8(0xff, 1) // unknown element type
      const fn = () => Vector.fromBuffer(buf)
      expect(fn).to.throw(/unknown element type code/)
    })

    it('rejects a buffer that is too short for its declared dimensions', function () {
      const buf = Buffer.alloc(8)
      buf.writeUInt8(1, 0) // version
      buf.writeUInt8(Vector.ElementType.FLOAT64, 1)
      buf.writeUInt32LE(10, 2) // claims 10 elements, but no data follows
      const fn = () => Vector.fromBuffer(buf)
      expect(fn).to.throw(/smaller than expected/)
    })

    it('rejects a non-Buffer argument', function () {
      const fn = () => Vector.fromBuffer('not a buffer' as any)
      expect(fn).to.throw(/requires a Buffer/)
    })
  })

  describe('#elementBytes()', function () {
    it('returns element data only, without the 8-byte header', function () {
      const v: Vec = Vector.ofInt32([1, 2, 3])
      const bytes: Buffer = v.elementBytes()

      expect(bytes.length).to.equal(3 * 4)
      expect(bytes.readInt32LE(0)).to.equal(1)
      expect(bytes.readInt32LE(4)).to.equal(2)
      expect(bytes.readInt32LE(8)).to.equal(3)
    })

    it('matches the tail of toBuffer() (i.e. the header-stripped payload)', function () {
      const v: Vec = Vector.ofFloat32([0.5, -1.25, 3.0])
      const full: Buffer = v.toBuffer()
      const elementsOnly: Buffer = v.elementBytes()

      expect(full.subarray(8)).to.eql(elementsOnly)
    })
  })
})

// Server integration tests: put/get round-trips, nested vectors, operate(),
// batch reads, and vectorDist + Top-K KNN queries against a live cluster.
describe('Aerospike.Vector - server integration', function () {
  const client: Client = helper.client
  const testSet = 'test/vector-' + Math.floor(Math.random() * 100000)

  const keys: K[] = []
  function key (id: string | number): K {
    const k = new Aerospike.Key(helper.namespace, testSet, id)
    keys.push(k)
    return k
  }

  after(async function () {
    await Promise.all(keys.map(k => client.remove(k).catch(() => {})))
  })

  describe('put/get round-trip', function () {
    it('round-trips a FLOAT32 vector bin', async function () {
      const k = key('f32')
      const v = Vector.ofFloat32([1.5, -2.25, 3.14159, 0.0])
      await client.put(k, { v })

      const record: AerospikeRecord = await client.get(k)
      const got = record.bins.v as Vec
      expect(got).to.be.instanceof(Vector)
      expect(got.elementType).to.equal(Vector.ElementType.FLOAT32)
      expect(got.dimensions).to.equal(4)
      const elements = Array.from(got.elements as Float32Array)
      expect(elements[0]).to.be.closeTo(1.5, 1e-6)
      expect(elements[1]).to.be.closeTo(-2.25, 1e-6)
      expect(elements[2]).to.be.closeTo(3.14159, 1e-4)
      expect(elements[3]).to.be.closeTo(0.0, 1e-6)
    })

    it('round-trips an INT32 vector bin', async function () {
      const k = key('i32')
      const v = Vector.ofInt32([-2147483648, -5, 0, 2147483647])
      await client.put(k, { v })

      const record: AerospikeRecord = await client.get(k)
      const got = record.bins.v as Vec
      expect(got.elementType).to.equal(Vector.ElementType.INT32)
      expect(Array.from(got.elements as Int32Array)).to.eql([-2147483648, -5, 0, 2147483647])
    })

    it('round-trips a FLOAT64 vector bin', async function () {
      const k = key('f64')
      const v = Vector.ofFloat64([3.14159265358979, -0.5, 1e300])
      await client.put(k, { v })

      const record: AerospikeRecord = await client.get(k)
      const got = record.bins.v as Vec
      expect(got.elementType).to.equal(Vector.ElementType.FLOAT64)
      expect(Array.from(got.elements as Float64Array)).to.eql([3.14159265358979, -0.5, 1e300])
    })

    it('round-trips a FLOAT16 vector bin (raw bit patterns)', async function () {
      const k = key('f16')
      const v = Vector.ofFloat16([0x3c00, 0xbc00, 0x4000, 0x0000])
      await client.put(k, { v })

      const record: AerospikeRecord = await client.get(k)
      const got = record.bins.v as Vec
      expect(got.elementType).to.equal(Vector.ElementType.FLOAT16)
      expect(Array.from(got.elements as Uint16Array)).to.eql([0x3c00, 0xbc00, 0x4000, 0x0000])
    })

    it('round-trips a vector nested in a list', async function () {
      const k = key('list')
      const v = Vector.ofFloat32([1.5, -2.25, 3.14159])
      await client.put(k, { l: ['label', v] })

      const record: AerospikeRecord = await client.get(k)
      const got = (record.bins.l as any[])[1] as Vec
      expect(got).to.be.instanceof(Vector)
      expect(got.elementType).to.equal(Vector.ElementType.FLOAT32)
      expect(got.dimensions).to.equal(3)
    })

    it('round-trips a vector nested in a map', async function () {
      const k = key('map')
      const v = Vector.ofFloat64([9.0, -0.5])
      await client.put(k, { m: { k: v } })

      const record: AerospikeRecord = await client.get(k)
      const got = (record.bins.m as any).k as Vec
      expect(got).to.be.instanceof(Vector)
      expect(got.elementType).to.equal(Vector.ElementType.FLOAT64)
      expect(Array.from(got.elements as Float64Array)).to.eql([9.0, -0.5])
    })

    it('overwrite replaces the element type and dimensions', async function () {
      const k = key('overwrite')
      await client.put(k, { v: Vector.ofFloat32([1, 2, 3, 4]) })
      await client.put(k, { v: Vector.ofInt32([9, -9]) })

      const record: AerospikeRecord = await client.get(k)
      const got = record.bins.v as Vec
      expect(got.elementType).to.equal(Vector.ElementType.INT32)
      expect(got.dimensions).to.equal(2)
      expect(Array.from(got.elements as Int32Array)).to.eql([9, -9])
    })

    it('selective bin reads only return the requested vector bin', async function () {
      const k = key('selective')
      await client.put(k, {
        wanted: Vector.ofFloat32([1, 2]),
        other: Vector.ofInt32([5, 6, 7])
      })

      const record: AerospikeRecord = await client.operate(k, [op.read('wanted')])
      expect(record.bins.wanted).to.be.instanceof(Vector)
      expect(record.bins.other).to.be.undefined
    })

    it('supports operate() write_vector/read', async function () {
      const k = key('operate')
      const v = Vector.ofFloat64([1.1, 2.2, 3.3])
      const result: AerospikeRecord = await client.operate(k, [op.write('v', v), op.read('v')])

      const got = result.bins.v as Vec
      expect(got.elementType).to.equal(Vector.ElementType.FLOAT64)
      expect(Array.from(got.elements as Float64Array)).to.eql([1.1, 2.2, 3.3])
    })

    it('supports CDT list_get/map_get_by_key reads of nested vectors', async function () {
      const k = key('cdt')
      await client.put(k, {
        list: [Vector.ofFloat32([1.0, 2.0])],
        map: { v: Vector.ofInt32([-1, 0, 1]) }
      })

      const result: AerospikeRecord = await client.operate(k, [
        Aerospike.lists.get('list', 0),
        Aerospike.maps.getByKey('map', 'v', Aerospike.maps.returnType.VALUE)
      ])
      const listResult = result.bins.list as Vec
      const mapResult = result.bins.map as Vec
      expect(listResult).to.be.instanceof(Vector)
      expect(listResult.elementType).to.equal(Vector.ElementType.FLOAT32)
      expect(mapResult.elementType).to.equal(Vector.ElementType.INT32)
      expect(Array.from(mapResult.elements as Int32Array)).to.eql([-1, 0, 1])
    })

    it('supports batchRead across multiple vector bins of different types', async function () {
      const k1 = key('batch1')
      const k2 = key('batch2')
      await client.put(k1, { embedding: Vector.ofFloat32([1, 2, 3]) })
      await client.put(k2, { embedding: Vector.ofInt32([10, 20]) })

      const results = await client.batchRead([
        { key: k1, readAllBins: true },
        { key: k2, readAllBins: true }
      ])

      expect(results[0].status).to.equal(status.AEROSPIKE_OK)
      expect(results[1].status).to.equal(status.AEROSPIKE_OK)
      const v1 = results[0].record.bins.embedding as Vec
      const v2 = results[1].record.bins.embedding as Vec
      expect(v1.elementType).to.equal(Vector.ElementType.FLOAT32)
      expect(Array.from(v1.elements as Float32Array)).to.eql([1, 2, 3])
      expect(v2.elementType).to.equal(Vector.ElementType.INT32)
      expect(Array.from(v2.elements as Int32Array)).to.eql([10, 20])
    })
  })

  describe('exp.vectorDist expression', function () {
    it('returns zero distance for a vector compared to itself (Euclidean)', async function () {
      const k = key('dist-self')
      const embedding = Vector.ofFloat32([0.1, 0.2, 0.3, 0.4])
      await client.put(k, { embedding })

      const distExpr = exp.vectorDist(exp.vectorDistanceMetric.EUCLIDEAN, embedding, exp.binVector('embedding'))
      const result: AerospikeRecord = await client.operate(k, [exp.operations.read('dist', distExpr, 0)])
      expect(result.bins.dist as number).to.be.closeTo(0.0, 1e-9)
    })
  })

  // Combines Vector + exp.vectorDist + Query#orderBy/#topK end-to-end.
  describe('KNN query (exp.vectorDist + Query#orderBy/#topK)', function () {
    helper.skipUnlessSupportsFeature(Aerospike.features.QUERY_ORDER_BY, this)

    const knnSet = testSet + '-knn'
    const DIMS = 4
    const knnKeys: K[] = []

    before(async function () {
      for (let i = 0; i < 20; i++) {
        const k = new Aerospike.Key(helper.namespace, knnSet, i)
        knnKeys.push(k)
        const vec = Vector.ofFloat32([i, 1.0, 0.0, 0.0])
        await client.put(k, { id: i, vec })
      }
    })

    after(async function () {
      await Promise.all(knnKeys.map(k => client.remove(k)))
    })

    async function knnQuery (metric: number, queryVector: Vec, direction: number): Promise<number[]> {
      const ops = [
        op.read('id'),
        exp.operations.read('distance', exp.vectorDist(metric, queryVector, exp.binVector('vec')), 0)
      ]
      const q = client.query(helper.namespace, knnSet, { ops })
      q.orderBy('distance', orderByType.DOUBLE, direction)
      q.topK(5)
      const records = await q.results()
      return records.map(r => r.bins.id as number)
    }

    it('ranks by Euclidean squared distance, ascending (nearest first)', async function () {
      const queryVector = Vector.ofFloat32([7.3, 1.0, 0.0, 0.0])
      const ids = await knnQuery(exp.vectorDistanceMetric.EUCLIDEAN, queryVector, order.ASC)
      expect(ids).to.eql([7, 8, 6, 9, 5])
    })

    it('ranks by dot product, descending (largest first)', async function () {
      const queryVector = Vector.ofFloat32([1.0, 0.0, 0.0, 0.0])
      const ids = await knnQuery(exp.vectorDistanceMetric.DOT_PRODUCT, queryVector, order.DESC)
      expect(ids).to.eql([19, 18, 17, 16, 15])
    })

    it('ranks by cosine similarity, descending (most similar first)', async function () {
      const queryVector = Vector.ofFloat32([1.0, 1.0, 0.0, 0.0])
      const ids = await knnQuery(exp.vectorDistanceMetric.COSINE, queryVector, order.DESC)
      expect(ids).to.eql([1, 2, 3, 4, 5])
    })
  })
})

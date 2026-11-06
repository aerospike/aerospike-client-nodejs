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

import { expect } from 'chai';
import * as Aerospike from '../../lib/aerospike.js';
import * as helper from '../test_helper.ts';
import { loadVectors, removeLoadedSets, nonFiniteVector } from './helpers.ts';

const { Vector, status } = Aerospike

// The module is test/vector_udf.lua: the client runs a stream UDF's last stage
// from the test folder.
const MODULE = 'vector_udf'

const VECTORS: Array<[string, Aerospike.Vector]> = [
  ['FLOAT16', Vector.ofFloat16Bits([0x3c00, 0xc000, 0x7bff])],
  ['INT32', Vector.ofInt32([7, -9, 2 ** 31 - 1])],
  ['FLOAT32', Vector.ofFloat32([0.5, -1.25, 3.4028234663852886e38])],
  ['FLOAT64', Vector.ofFloat64([0.1, 0.2, Number.MIN_VALUE])]
]

const call = (key: Aerospike.Key, funcname: string, args: unknown[] = [], policy: any = null) =>
  helper.client.apply(key, { module: MODULE, funcname, args } as any, policy)

describe('Vectors in UDFs', function () {
  this.timeout(60000)
  helper.skipUnlessVersion('>= 8.2.1', this)

  before(() => helper.udf.register(`${MODULE}.lua`))
  after(async function () {
    await removeLoadedSets()
    await helper.udf.remove(`${MODULE}.lua`)
  })

  it('returns a vector argument as the same Vector (R76)', async function () {
    const set = await loadVectors([undefined], [{ n: 1 }])
    const key = new Aerospike.Key(helper.namespace, set, 0)
    for (const [name, vector] of VECTORS) {
      const result = await call(key, 'echo', [vector])
      expect(result, name).to.be.instanceof(Vector)
      expect((result as Aerospike.Vector).toBytes(), name).to.eql(vector.toBytes())
    }
  })

  it('gives a record UDF the stored vector as bytes, and returns it as a Vector', async function () {
    const set = await loadVectors(VECTORS.map(([, v]) => v))
    for (let i = 0; i < VECTORS.length; i++) {
      const [name, vector] = VECTORS[i]
      const key = new Aerospike.Key(helper.namespace, set, i)
      expect(await call(key, 'describe_v'), name).to.equal(`userdata:${vector.toBytes().length}`)
      expect(((await call(key, 'read_v')) as Aerospike.Vector).toBytes(), name).to.eql(vector.toBytes())
    }
  })

  it('stores a vector a UDF writes as a vector, and applies the same checks', async function () {
    const set = await loadVectors(VECTORS.map(() => undefined), VECTORS.map(() => ({ n: 1 })))
    for (let i = 0; i < VECTORS.length; i++) {
      const [name, vector] = VECTORS[i]
      const key = new Aerospike.Key(helper.namespace, set, i)
      await call(key, 'write_v', [vector])
      const stored = (await helper.client.get(key)).bins.v
      expect(stored, name).to.be.instanceof(Vector)
      expect((stored as Aerospike.Vector).toBytes(), name).to.eql(vector.toBytes())
    }

    const key = new Aerospike.Key(helper.namespace, set, 0)
    const error = await call(key, 'write_v', [nonFiniteVector(Aerospike.vectorElementType.FLOAT32, [NaN])], { errorDetailVerbosity: Aerospike.errorDetailVerbosity.MESSAGE }).then(() => null, e => e)
    expect(error).to.be.instanceof(Aerospike.AerospikeError)
    expect(error.code).to.equal(status.ERR_REQUEST_INVALID)
    expect(error.message).to.match(/vector: elements must be finite \(no NaN or infinity\)$/)
  })

  it('writes vectors with batchWrite() UDF calls, as vectors', async function () {
    const set = await loadVectors(VECTORS.map(() => undefined), VECTORS.map(() => ({ n: 1 })))
    const results = await helper.client.batchWrite(VECTORS.map(([, vector], i) => ({
      type: Aerospike.batchType.BATCH_APPLY,
      key: new Aerospike.Key(helper.namespace, set, i),
      udf: { module: MODULE, funcname: 'write_v', args: [vector] }
    } as any)))
    expect(results.map(r => r.status)).to.eql(VECTORS.map(() => status.OK))
    for (let i = 0; i < VECTORS.length; i++) {
      const stored = (await helper.client.get(new Aerospike.Key(helper.namespace, set, i))).bins.v as Aerospike.Vector
      expect(stored.toBytes(), VECTORS[i][0]).to.eql(VECTORS[i][1].toBytes())
    }
  })

  it('returns a vector from batchApply() as the same Vector (R76)', async function () {
    const set = await loadVectors([undefined], [{ n: 1 }])
    const keys = [new Aerospike.Key(helper.namespace, set, 0)]
    for (const [name, vector] of VECTORS) {
      const results = await helper.client.batchApply(keys, { module: MODULE, funcname: 'echo', args: [vector] } as any)
      expect(results[0].record.bins.SUCCESS, name).to.be.instanceof(Vector)
      expect((results[0].record.bins.SUCCESS as Aerospike.Vector).toBytes(), name).to.eql(vector.toBytes())
    }
  })

  it('passes a vector through a stream UDF as identical bytes, returned as a Vector (R72)', async function () {
    for (const [name, vector] of VECTORS) {
      const set = await loadVectors([vector])
      const query = () => helper.client.query(helper.namespace, set)
      expect(await query().apply(MODULE, 'stream_describe_v'), name).to.equal(`userdata:${vector.toBytes().length}`)

      const applied = await query().apply(MODULE, 'stream_v')
      expect(applied, `${name}: apply()`).to.be.instanceof(Vector)
      expect((applied as Aerospike.Vector).toBytes(), name).to.eql(vector.toBytes())

      const streamed = await new Promise<unknown[]>((resolve, reject) => {
        const values: unknown[] = []
        const q = query()
        q.setUdf(MODULE, 'stream_v')
        const stream = q.foreach()
        stream.on('data', (record: any) => values.push(record.bins))
        stream.on('error', reject)
        stream.on('end', () => resolve(values))
      })
      expect(streamed.length, `${name}: foreach()`).to.equal(1)
      expect((streamed[0] as Aerospike.Vector).toBytes(), `${name}: foreach()`).to.eql(vector.toBytes())
    }
  })
})

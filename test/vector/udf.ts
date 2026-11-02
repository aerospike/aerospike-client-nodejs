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
import { loadVectors, removeLoadedSets } from './helpers.ts';

const { Vector, status } = Aerospike

// The module is test/vector_udf.lua: the client runs a stream UDF's last stage
// from the test folder.
const MODULE = 'vector_udf'

const VECTORS: Array<[string, Aerospike.Vector]> = [
  ['FLOAT16', Vector.ofFloat16([0x3c00, 0xc000, 0x7bff])],
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
    const error = await call(key, 'write_v', [Vector.ofFloat32([NaN])], { errorDetailVerbosity: Aerospike.errorDetailVerbosity.MESSAGE }).then(() => null, e => e)
    expect(error).to.be.instanceof(Aerospike.AerospikeError)
    expect(error.code).to.equal(status.ERR_REQUEST_INVALID)
    expect(error.message).to.match(/vector: elements must be finite \(no NaN or infinity\)$/)
  })

  it('passes a vector through a stream UDF as identical bytes (R72)', async function () {
    for (const [name, vector] of VECTORS) {
      const set = await loadVectors([vector])
      const query = () => helper.client.query(helper.namespace, set)
      expect(await query().apply(MODULE, 'stream_describe_v'), name).to.equal(`userdata:${vector.toBytes().length}`)
      const result = await query().apply(MODULE, 'stream_v')
      expect(Buffer.isBuffer(result), `${name}: expected bytes`).to.be.true
      expect(result, name).to.eql(vector.toBytes())
    }
  })
})

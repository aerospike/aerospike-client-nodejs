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
import { loadVectors, removeLoadedSets, nonFiniteVector } from './helpers.ts';

const { Vector, operations, lists, maps, status } = Aerospike
const { FLOAT16, FLOAT32, FLOAT64 } = Aerospike.vectorElementType

// Ask the server to explain its rejections.
const DETAILS = { errorDetailVerbosity: Aerospike.errorDetailVerbosity.MESSAGE }

const ORIGINAL = Vector.ofFloat32([1, 2])

// Runs a write that the server must reject, and checks the code, the server's
// message (after the node address) and that the record is unchanged.
async function expectRejected (write: (key: Aerospike.Key) => Promise<unknown>, code: number, message: string, label: string) {
  const set = await loadVectors([ORIGINAL], [{ l: [1], m: { a: 1 } }])
  const key = new Aerospike.Key(helper.namespace, set, 0)
  const before = await helper.client.get(key)

  const error = await write(key).then(() => null, e => e)
  expect(error, `${label}: expected an error`).to.be.instanceof(Aerospike.AerospikeError)
  expect(error.code, label).to.equal(code)
  if (message) expect(error.message, label).to.match(new RegExp(` ${message.replace(/[()[\]]/g, '\\$&')}$`))

  const after = await helper.client.get(key)
  expect(after.bins, `${label}: the record changed`).to.eql(before.bins)
}

describe('Vector rules the server enforces', function () {
  this.timeout(60000)
  helper.skipUnlessVersion('>= 8.2.1', this)
  after(removeLoadedSets)

  // The builders reject these first (values.ts); vectors made from bytes reach the server.
  it('rejects NaN and infinite elements of every float type (R8, R10)', async function () {
    const message = 'vector: elements must be finite (no NaN or infinity)'
    const vectors: Array<[string, Aerospike.Vector]> = [
      ['FLOAT16 NaN', nonFiniteVector(FLOAT16, [0x3c00, 0x7e00])],
      ['FLOAT16 infinity', nonFiniteVector(FLOAT16, [0xfc00])],
      ['FLOAT32 NaN', nonFiniteVector(FLOAT32, [1, NaN])],
      ['FLOAT32 infinity', nonFiniteVector(FLOAT32, [Infinity])],
      ['FLOAT64 NaN', nonFiniteVector(FLOAT64, [NaN])],
      ['FLOAT64 -infinity', nonFiniteVector(FLOAT64, [0, -Infinity])]
    ]
    for (const [name, vector] of vectors) {
      await expectRejected(key => helper.client.put(key, { v: vector }, null, DETAILS), status.ERR_REQUEST_INVALID, message, `put ${name}`)
      await expectRejected(key => helper.client.operate(key, [operations.write('v', vector)], null, DETAILS), status.ERR_REQUEST_INVALID, message, `operate ${name}`)
    }
  })

  it('rejects them with code 4 when no error details are asked for', async function () {
    await expectRejected(key => helper.client.put(key, { v: nonFiniteVector(FLOAT32, [NaN]) }), status.ERR_REQUEST_INVALID, '', 'no details')
  })

  it('rejects a vector inside a list or a map, at any depth (R71)', async function () {
    const vector = Vector.ofFloat32([1])
    const bins: Array<[string, Record<string, unknown>]> = [
      ['in a list', { l: [1, vector] }],
      ['as a map value', { m: { a: vector } }],
      ['deep inside', { l: [[{ a: [vector] }]] }]
    ]
    for (const [name, value] of bins) {
      await expectRejected(key => helper.client.put(key, value as any, null, DETAILS), status.ERR_REQUEST_INVALID, 'list/map cannot hold a vector', name)
    }
  })

  it('rejects list and map operations that would add a vector (R71)', async function () {
    const vector = Vector.ofFloat32([1])
    const ops: Array<[string, any, string]> = [
      ['list append', lists.append('l', vector), 'list_append: list/map cannot hold a vector'],
      ['map value', maps.put('m', 'b', vector), 'map_add: invalid value - list/map cannot hold a vector'],
      ['map key', maps.put('m', vector, 1), 'map_add: invalid key - list/map cannot hold a vector']
    ]
    for (const [name, op, message] of ops) {
      await expectRejected(key => helper.client.operate(key, [op], null, DETAILS), status.ERR_REQUEST_INVALID, message, name)
    }
  })

  it('rejects append, prepend, increment and list operations on a vector bin (R56)', async function () {
    const ops: Array<[string, any, string]> = [
      ['append', operations.append('v', 'x'), 'cannot append/prepend to a vector bin - write the whole vector'],
      ['append a blob', operations.append('v', Buffer.from([1])), 'cannot append/prepend to a vector bin - write the whole vector'],
      ['prepend', operations.prepend('v', 'x'), 'cannot append/prepend to a vector bin - write the whole vector'],
      ['increment', operations.incr('v', 1), 'cannot increment a vector bin'],
      ['list append', lists.append('v', 1), 'list modify requires list bin, got bin type vector']
    ]
    for (const [name, op, message] of ops) {
      await expectRejected(key => helper.client.operate(key, [op], null, DETAILS), status.ERR_BIN_INCOMPATIBLE_TYPE, message, name)
    }
  })

  it('replaces a vector with a whole new vector of any type or size', async function () {
    const set = await loadVectors([ORIGINAL])
    const key = new Aerospike.Key(helper.namespace, set, 0)
    for (const vector of [Vector.ofFloat64([1, 2, 3]), Vector.ofInt32([7]), Vector.ofFloat16Bits(new Array(1000).fill(0x3c00))]) {
      await helper.client.operate(key, [operations.write('v', vector)])
      expect(((await helper.client.get(key)).bins.v as Aerospike.Vector).toBytes()).to.eql(vector.toBytes())
    }
  })
})

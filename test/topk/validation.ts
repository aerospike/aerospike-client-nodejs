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

/* global describe, it */

import type { Query as Q } from '../../lib/aerospike.js';

import { expect } from 'chai';
import * as Aerospike from '../../lib/aerospike.js';

const { orderByType, order, orderByFlags, AerospikeError, status } = Aerospike
const { INTEGER, STRING } = orderByType
const { ASC, DESC } = order

// A query that is never sent: these tests only check what happens before sending.
function newQuery (): Q {
  return new Aerospike.Query(null as any, 'test', 'demo')
}

// Runs fn and returns what it threw or rejected with, or null.
async function errorFrom (fn: () => unknown): Promise<any> {
  try {
    await fn()
    return null
  } catch (error) {
    return error
  }
}

// 'type' = TypeError (wrong JS type); 'param' = AerospikeError with ERR_PARAM (broken rule).
function expectError (error: any, kind: 'type' | 'param', message: string) {
  expect(error, 'expected an error').to.not.be.null
  if (kind === 'type') {
    expect(error).to.be.instanceof(TypeError)
  } else {
    expect(error).to.be.instanceof(AerospikeError)
    expect(error.code).to.equal(status.ERR_PARAM)
  }
  expect(error.message).to.equal(message)
}

const BIN_MESSAGE = 'Order key bin name must be at most 15 characters'
const NUL_MESSAGE = 'Order key bin name must not contain NUL'
const TWO_KEYS_MESSAGE = 'A query can have at most 2 order keys'

// Every method that sends a query checks the Top-K settings first.
const METHODS: Array<[string, (query: Q) => unknown]> = [
  ['foreach', query => query.foreach()],
  ['results', query => query.results()],
  ['apply', query => query.apply('module', 'fn')],
  ['background', query => query.background('module', 'fn')],
  ['operate', query => query.operate([])]
]

describe('Top-K validation #noserver', function () {
  it('exports the order-by enums with the C client values', function () {
    expect(orderByType).to.eql({ INTEGER: 1, DOUBLE: 2, STRING: 3, BYTES: 4 })
    expect(order).to.eql({ ASC: 0, DESC: 1 })
    expect(orderByFlags).to.eql({ DEFAULT: 0, CASE_INSENSITIVE: 1 })
  })

  describe('setters', function () {
    it('orderBy sets the first key, with flags defaulting to DEFAULT', function () {
      const query = newQuery()
      query.orderBy('score', INTEGER, DESC)

      expect(query.orderByKeys).to.eql([{ bin: 'score', type: INTEGER, direction: DESC, flags: orderByFlags.DEFAULT }])
      expect(query.topKLimit).to.be.undefined
    })

    it('thenOrderBy adds a second key, or the first if none is set', function () {
      const query = newQuery()
      query.thenOrderBy('a', INTEGER, ASC)
      query.thenOrderBy('b', STRING, DESC, orderByFlags.CASE_INSENSITIVE)

      expect(query.orderByKeys).to.eql([
        { bin: 'a', type: INTEGER, direction: ASC, flags: orderByFlags.DEFAULT },
        { bin: 'b', type: STRING, direction: DESC, flags: orderByFlags.CASE_INSENSITIVE }
      ])
    })

    it('orderBy again replaces both keys and keeps k; topK again replaces k', function () {
      const query = newQuery()
      query.orderBy('a', INTEGER, ASC)
      query.thenOrderBy('b', INTEGER, ASC)
      query.topK(5)
      query.orderBy('c', STRING, DESC)
      query.topK(7)

      expect(query.orderByKeys.map(key => key.bin)).to.eql(['c'])
      expect(query.topKLimit).to.equal(7)
    })

    it('thenOrderBy rejects a third key and keeps the first two', function () {
      const query = newQuery()
      query.orderBy('a', INTEGER, ASC)
      query.thenOrderBy('b', INTEGER, ASC)

      let error: any = null
      try { query.thenOrderBy('c', INTEGER, ASC) } catch (e) { error = e }

      expectError(error, 'param', TWO_KEYS_MESSAGE)
      expect(query.orderByKeys.map(key => key.bin)).to.eql(['a', 'b'])
    })
  })

  describe('setter arguments', function () {
    it('bin must be a string of at most 15 bytes, without NUL', async function () {
      const cases: Array<[unknown, 'type' | 'param', string]> = [
        [undefined, 'type', 'bin must be a string'],
        [null, 'type', 'bin must be a string'],
        [1, 'type', 'bin must be a string'],
        [['a'], 'type', 'bin must be a string'],
        ['a'.repeat(16), 'param', BIN_MESSAGE],
        ['é'.repeat(8), 'param', BIN_MESSAGE], // 8 characters, but 16 bytes
        ['sc\0re', 'param', NUL_MESSAGE],
        ['\0', 'param', NUL_MESSAGE]
      ]
      for (const [bin, kind, message] of cases) {
        expectError(await errorFrom(() => newQuery().orderBy(bin as any, INTEGER, ASC)), kind, message)
        expectError(await errorFrom(() => newQuery().thenOrderBy(bin as any, INTEGER, ASC)), kind, message)
      }

      for (const bin of ['', 'a'.repeat(15), 'é'.repeat(7)]) { // 'é' x 7 is 14 bytes
        expect(() => newQuery().orderBy(bin, INTEGER, ASC), `bin '${bin}'`).to.not.throw()
      }
    })

    it('type, direction and flags must be unsigned 32-bit integers', async function () {
      const messages = {
        type: 'type must be one of Aerospike.orderByType',
        direction: 'direction must be one of Aerospike.order',
        flags: 'flags must be a combination of Aerospike.orderByFlags'
      }
      const badValues: Array<[unknown, 'type' | 'param']> = [
        [undefined, 'type'], [null, 'type'], ['1', 'type'], [1.5, 'type'], [NaN, 'type'],
        [Infinity, 'type'], [1n, 'type'], [-1, 'param'], [2 ** 32, 'param']
      ]
      for (const [value, kind] of badValues) {
        const v = value as any
        expectError(await errorFrom(() => newQuery().orderBy('a', v, ASC)), kind, messages.type)
        expectError(await errorFrom(() => newQuery().orderBy('a', INTEGER, v)), kind, messages.direction)
        if (value !== undefined) { // undefined flags means DEFAULT
          expectError(await errorFrom(() => newQuery().orderBy('a', INTEGER, ASC, v)), kind, messages.flags)
        }
      }

      // Values outside the enums are left to the C client, which rejects them when the query runs.
      for (const value of [0, 5, 2 ** 32 - 1]) {
        expect(() => newQuery().orderBy('a', value, value, value), `value ${value}`).to.not.throw()
      }
    })

    it('k must be an unsigned 32-bit integer', async function () {
      const message = 'k must be a non-negative integer'
      const badValues: Array<[unknown, 'type' | 'param']> = [
        [undefined, 'type'], [null, 'type'], ['10', 'type'], [1.5, 'type'], [NaN, 'type'],
        [Infinity, 'type'], [10n, 'type'], [-1, 'param'], [2 ** 32, 'param']
      ]
      for (const [k, kind] of badValues) {
        expectError(await errorFrom(() => newQuery().topK(k as any)), kind, message)
      }

      // The 1 to 1,000 range is left to the C client, which rejects it when the query runs.
      for (const k of [0, 1, 1000, 1001, 2 ** 32 - 1]) {
        expect(() => newQuery().topK(k), `k ${k}`).to.not.throw()
      }
    })
  })

  describe('settings assigned directly, checked by every method before sending', function () {
    const key = { bin: 'a', type: INTEGER, direction: ASC, flags: orderByFlags.DEFAULT }

    it('rejects bad orderByKeys', async function () {
      const cases: Array<[string, unknown, 'type' | 'param', string]> = [
        ['not an array', key, 'type', 'orderByKeys must be an array'],
        ['an entry that is not an object', ['a'], 'type', 'Each order key must be an object'],
        ['a null entry', [null], 'type', 'Each order key must be an object'],
        ['an entry without flags', [{ bin: 'a', type: INTEGER, direction: ASC }], 'type', 'flags must be a combination of Aerospike.orderByFlags'],
        ['a bin that is too long', [{ ...key, bin: 'a'.repeat(16) }], 'param', BIN_MESSAGE],
        ['a bin with NUL', [{ ...key, bin: 'sc\0re' }], 'param', NUL_MESSAGE],
        ['a negative type', [{ ...key, type: -1 }], 'param', 'type must be one of Aerospike.orderByType'],
        ['three keys', [key, key, key], 'param', TWO_KEYS_MESSAGE]
      ]
      for (const [method, run] of METHODS) {
        for (const [name, orderByKeys, kind, message] of cases) {
          const query = newQuery()
          query.orderByKeys = orderByKeys as any
          const error = await errorFrom(() => run(query))
          expect(error, `${method}() with ${name}`).to.not.be.null
          expectError(error, kind, message)
        }
      }
    })

    it('rejects a bad topKLimit', async function () {
      const message = 'topKLimit must be a non-negative integer'
      const cases: Array<[unknown, 'type' | 'param']> = [
        ['10', 'type'], [1.5, 'type'], [NaN, 'type'], [-1, 'param'], [2 ** 32, 'param']
      ]
      for (const [method, run] of METHODS) {
        for (const [topKLimit, kind] of cases) {
          const query = newQuery()
          query.topKLimit = topKLimit as any
          const error = await errorFrom(() => run(query))
          expect(error, `${method}() with topKLimit ${String(topKLimit)}`).to.not.be.null
          expectError(error, kind, message)
        }
      }
    })
  })
})

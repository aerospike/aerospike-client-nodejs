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
import { newQuery, errorFrom, streamErrorFrom } from './helpers.ts';

const { orderByType, order, orderByFlags, AerospikeError, status } = Aerospike
const { INTEGER, STRING } = orderByType
const { ASC, DESC } = order

// A query that is never sent: the setters only store what they're given.
function unsentQuery (): Q {
  return new Aerospike.Query(null as any, 'test', 'demo')
}

// Every method that runs a query, with how it reports a bad Top-K setting:
// results() and foreach() report an AerospikeError with ERR_PARAM; apply(),
// background() and operate() throw a TypeError, as for any other bad query setting.
const METHODS: Array<[string, 'param' | 'type', (query: Q) => Promise<any>]> = [
  ['results', 'param', query => errorFrom(() => query.results())],
  ['foreach', 'param', query => streamErrorFrom(query)],
  ['apply', 'type', query => errorFrom(() => query.apply('module', 'fn'))],
  ['background', 'type', query => errorFrom(() => query.background('module', 'fn'))],
  ['operate', 'type', query => errorFrom(() => query.operate([Aerospike.operations.write('x', 1)]))]
]

// Sets up a query with configure, runs it every way, and checks each reports message.
async function expectRejectedEverywhere (configure: (query: Q) => void, message: string, label: string) {
  for (const [method, kind, run] of METHODS) {
    const query = newQuery()
    configure(query)
    const error = await run(query)
    const where = `${label}, ${method}()`
    expect(error, `${where}: expected an error`).to.not.be.null
    if (kind === 'type') {
      expect(error, where).to.be.instanceof(TypeError)
    } else {
      expect(error, where).to.be.instanceof(AerospikeError)
      expect(error.code, where).to.equal(status.ERR_PARAM)
    }
    expect(error.message, where).to.equal(message)
  }
}

describe('Top-K settings #noserver', function () {
  it('exports the order-by enums with the C client values', function () {
    expect(orderByType).to.eql({ INTEGER: 1, DOUBLE: 2, STRING: 3, BYTES: 4 })
    expect(order).to.eql({ ASC: 0, DESC: 1 })
    expect(orderByFlags).to.eql({ DEFAULT: 0, CASE_INSENSITIVE: 1 })
  })

  it('orderBy sets the first key, with flags defaulting to DEFAULT', function () {
    const query = unsentQuery()
    query.orderBy('score', INTEGER, DESC)

    expect(query.orderByKeys).to.eql([{ bin: 'score', type: INTEGER, direction: DESC, flags: orderByFlags.DEFAULT }])
    expect(query.topKLimit).to.be.undefined
  })

  it('thenOrderBy adds keys after the first, or the first if none is set', function () {
    const query = unsentQuery()
    query.thenOrderBy('a', INTEGER, ASC)
    query.thenOrderBy('b', STRING, DESC, orderByFlags.CASE_INSENSITIVE)
    query.thenOrderBy('c', INTEGER, ASC) // a third key is stored; the query rejects it when it runs

    expect(query.orderByKeys).to.eql([
      { bin: 'a', type: INTEGER, direction: ASC, flags: orderByFlags.DEFAULT },
      { bin: 'b', type: STRING, direction: DESC, flags: orderByFlags.CASE_INSENSITIVE },
      { bin: 'c', type: INTEGER, direction: ASC, flags: orderByFlags.DEFAULT }
    ])
  })

  it('orderBy again replaces all keys and keeps k; topK again replaces k', function () {
    const query = unsentQuery()
    query.orderBy('a', INTEGER, ASC)
    query.thenOrderBy('b', INTEGER, ASC)
    query.topK(5)
    query.orderBy('c', STRING, DESC)
    query.topK(7)

    expect(query.orderByKeys.map(key => key.bin)).to.eql(['c'])
    expect(query.topKLimit).to.equal(7)
  })

  it('setters store any value and never throw; values are checked when the query runs', function () {
    const query = unsentQuery()
    expect(() => query.orderBy(1 as any, 'x' as any, -1 as any, 1.5 as any)).to.not.throw()
    expect(() => query.thenOrderBy('sc\0re', INTEGER, ASC)).to.not.throw()
    expect(() => query.topK('10' as any)).to.not.throw()
  })
})

// Checks the Node client makes itself, in setup_options(), before the C client
// sees the query: JS value types, and a NUL that would cut a bin name short.
// Every Top-K rule beyond these is the C client's (see rejections.ts).
describe('Top-K settings checked by the Node client when the query runs', function () {
  const keyWith = (changes: object) => (query: Q) => {
    query.orderByKeys = [{ bin: 'a', type: INTEGER, direction: ASC, flags: orderByFlags.DEFAULT, ...changes }]
    query.topK(10)
  }

  it('bin must be a string without NUL', async function () {
    for (const bin of [undefined, null, 1, ['a']]) {
      await expectRejectedEverywhere(keyWith({ bin }), 'Order key bin must be a string', `bin ${String(bin)}`)
    }
    for (const bin of ['sc\0re', '\0']) {
      await expectRejectedEverywhere(keyWith({ bin }), 'Order key bin name must not contain NUL', `bin ${JSON.stringify(bin)}`)
    }
  })

  it('type, direction and flags must be unsigned 32-bit integers', async function () {
    const messages = {
      type: 'Order key type must be one of Aerospike.orderByType',
      direction: 'Order key direction must be one of Aerospike.order',
      flags: 'Order key flags must be a combination of Aerospike.orderByFlags'
    }
    for (const value of [undefined, null, '1', 1.5, NaN, Infinity, -1, 2 ** 32]) {
      for (const [field, message] of Object.entries(messages)) {
        await expectRejectedEverywhere(keyWith({ [field]: value }), message, `${field} ${String(value)}`)
      }
    }
  })

  it('orderByKeys must be an array of objects', async function () {
    const cases: Array<[string, unknown, string]> = [
      ['not an array', { bin: 'a' }, 'orderByKeys must be an array'],
      ['an entry that is not an object', ['a'], 'Each order key must be an object'],
      ['a null entry', [null], 'Each order key must be an object']
    ]
    for (const [name, orderByKeys, message] of cases) {
      await expectRejectedEverywhere(query => { query.orderByKeys = orderByKeys as any; query.topK(10) }, message, name)
    }
  })

  it('k must be an unsigned 32-bit integer', async function () {
    for (const k of ['10', 1.5, NaN, -1, 2 ** 32]) {
      await expectRejectedEverywhere(query => { query.orderBy('a', INTEGER, ASC); query.topK(k as any) },
        'topK must be an integer from 1 to 1000', `k ${String(k)}`)
    }
  })
})

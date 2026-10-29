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

/* global expect, describe, it */

import type { Query as Q } from '../lib/aerospike.js';

import { expect } from 'chai';
import * as Aerospike from '../lib/aerospike.js';
import * as helper from './test_helper.ts';

const { orderByType, order, orderByFlags, AerospikeError, status } = Aerospike

function newQuery (): Q {
  return new Aerospike.Query(null as any, 'test', 'demo')
}

describe('Query Top-K settings #noserver', function () {
  describe('Aerospike.orderByType', function () {
    it('matches the C client values', function () {
      expect(orderByType).to.eql({ INTEGER: 1, DOUBLE: 2, STRING: 3, BYTES: 4 })
    })
  })

  describe('Aerospike.order', function () {
    it('matches the C client values', function () {
      expect(order).to.eql({ ASC: 0, DESC: 1 })
    })
  })

  describe('Aerospike.orderByFlags', function () {
    it('matches the C client values', function () {
      expect(orderByFlags).to.eql({ DEFAULT: 0, CASE_INSENSITIVE: 1 })
    })
  })

  describe('new Query()', function () {
    it('has no order keys and no k', function () {
      const query = newQuery()

      expect(query.orderByKeys).to.eql([])
      expect(query.topKLimit).to.be.undefined
    })
  })

  describe('query.orderBy()', function () {
    it('sets the first order key', function () {
      const query = newQuery()
      query.orderBy('score', orderByType.DOUBLE, order.DESC, orderByFlags.DEFAULT)

      expect(query.orderByKeys).to.eql([
        { bin: 'score', type: orderByType.DOUBLE, direction: order.DESC, flags: orderByFlags.DEFAULT }
      ])
    })

    it('defaults flags to DEFAULT', function () {
      const query = newQuery()
      query.orderBy('name', orderByType.STRING, order.ASC)

      expect(query.orderByKeys[0].flags).to.equal(orderByFlags.DEFAULT)
    })

    it('replaces both order keys and keeps k', function () {
      const query = newQuery()
      query.orderBy('a', orderByType.INTEGER, order.DESC)
      query.thenOrderBy('b', orderByType.INTEGER, order.ASC)
      query.topK(5)
      query.orderBy('c', orderByType.STRING, order.ASC, orderByFlags.CASE_INSENSITIVE)

      expect(query.orderByKeys).to.eql([
        { bin: 'c', type: orderByType.STRING, direction: order.ASC, flags: orderByFlags.CASE_INSENSITIVE }
      ])
      expect(query.topKLimit).to.equal(5)
    })

    it('accepts a bin name of 15 characters', function () {
      const query = newQuery()
      query.orderBy('a'.repeat(15), orderByType.INTEGER, order.ASC)

      expect(query.orderByKeys[0].bin).to.equal('a'.repeat(15))
    })

    it('throws a parameter error if the bin name is longer than 15 characters', function () {
      const query = newQuery()

      expect(() => query.orderBy('a'.repeat(16), orderByType.INTEGER, order.ASC))
        .to.throw(AerospikeError).with.property('code', status.ERR_PARAM)
    })

    it('throws if the bin name is not a string', function () {
      const query = newQuery()

      expect(() => query.orderBy(1 as any, orderByType.INTEGER, order.ASC)).to.throw(TypeError)
    })

    it('throws if type, direction or flags is not an integer', function () {
      const query = newQuery()

      expect(() => query.orderBy('a', 'INTEGER' as any, order.ASC)).to.throw(TypeError)
      expect(() => query.orderBy('a', orderByType.INTEGER, undefined as any)).to.throw(TypeError)
      expect(() => query.orderBy('a', orderByType.INTEGER, order.ASC, 'x' as any)).to.throw(TypeError)
    })
  })

  describe('query.thenOrderBy()', function () {
    it('adds an order key after the first', function () {
      const query = newQuery()
      query.orderBy('a', orderByType.INTEGER, order.DESC)
      query.thenOrderBy('b', orderByType.DOUBLE, order.ASC)

      expect(query.orderByKeys.map(key => key.bin)).to.eql(['a', 'b'])
    })

    it('sets the first order key when called before orderBy', function () {
      const query = newQuery()
      query.thenOrderBy('b', orderByType.DOUBLE, order.ASC)

      expect(query.orderByKeys).to.eql([
        { bin: 'b', type: orderByType.DOUBLE, direction: order.ASC, flags: orderByFlags.DEFAULT }
      ])
    })

    it('throws a parameter error for a third key, and keeps the first two', function () {
      const query = newQuery()
      query.orderBy('a', orderByType.INTEGER, order.DESC)
      query.thenOrderBy('b', orderByType.INTEGER, order.DESC)

      expect(() => query.thenOrderBy('c', orderByType.INTEGER, order.DESC))
        .to.throw(AerospikeError).with.property('code', status.ERR_PARAM)
      expect(query.orderByKeys.map(key => key.bin)).to.eql(['a', 'b'])
    })
  })

  describe('query.topK()', function () {
    it('sets k', function () {
      const query = newQuery()
      query.topK(10)

      expect(query.topKLimit).to.equal(10)
    })

    it('replaces k', function () {
      const query = newQuery()
      query.topK(10)
      query.topK(20)

      expect(query.topKLimit).to.equal(20)
    })

    it('throws if k is not an integer', function () {
      const query = newQuery()

      expect(() => query.topK(1.5)).to.throw(TypeError)
      expect(() => query.topK('10' as any)).to.throw(TypeError)
    })
  })

  describe('checks before the query runs', function () {
    const runners: Array<[string, (query: Q) => unknown]> = [
      ['foreach', query => query.foreach()],
      ['apply', query => query.apply('udf', 'fn')],
      ['background', query => query.background('udf', 'fn')],
      ['operate', query => query.operate([])]
    ]

    runners.forEach(([name, run]) => {
      describe(`query.${name}()`, function () {
        it('throws a parameter error for more than two order keys assigned directly', function () {
          const query = newQuery()
          const key = { bin: 'a', type: orderByType.INTEGER, direction: order.ASC, flags: orderByFlags.DEFAULT }
          query.orderByKeys = [key, key, key]

          expect(() => run(query)).to.throw(AerospikeError).with.property('code', status.ERR_PARAM)
        })

        it('throws a parameter error for a bin name that is too long assigned directly', function () {
          const query = newQuery()
          query.orderByKeys = [{ bin: 'a'.repeat(16), type: orderByType.INTEGER, direction: order.ASC, flags: orderByFlags.DEFAULT }]

          expect(() => run(query)).to.throw(AerospikeError).with.property('code', status.ERR_PARAM)
        })

        it('throws a TypeError for an order key that is not an object assigned directly', function () {
          const query = newQuery()
          query.orderByKeys = ['a' as any]

          expect(() => run(query)).to.throw(TypeError)
        })

        it('throws a TypeError for an order key without flags assigned directly', function () {
          const query = newQuery()
          query.orderByKeys = [{ bin: 'a', type: orderByType.INTEGER, direction: order.ASC } as any]

          expect(() => run(query)).to.throw(TypeError)
        })

        it('throws a TypeError for a non-integer topKLimit assigned directly', function () {
          const query = newQuery()
          query.topKLimit = 2.5

          expect(() => run(query)).to.throw(TypeError)
        })
      })
    })

    describe('query.results()', function () {
      it('rejects with a parameter error for more than two order keys assigned directly', async function () {
        const query = newQuery()
        const key = { bin: 'a', type: orderByType.INTEGER, direction: order.ASC, flags: orderByFlags.DEFAULT }
        query.orderByKeys = [key, key, key]

        const error = await query.results().then(() => null, error => error)
        expect(error).to.be.instanceof(AerospikeError)
        expect(error.code).to.equal(status.ERR_PARAM)
      })

      it('rejects with a TypeError for an order key that is not an object assigned directly', async function () {
        const query = newQuery()
        query.orderByKeys = ['a' as any]

        const error = await query.results().then(() => null, error => error)
        expect(error).to.be.instanceof(TypeError)
      })
    })
  })
})

describe('Query Top-K settings in native code', function () {
  // A negative topKLimit passes the JS integer check and is rejected when the
  // native layer reads the query; the error must reach the caller.
  function negativeK (): Q {
    const query = helper.client.query(helper.namespace, helper.set)
    query.orderBy('a', orderByType.INTEGER, order.DESC)
    query.topKLimit = -1
    return query
  }

  it('reports invalid settings as a parameter error from query.results()', async function () {
    const error = await negativeK().results().then(() => null, error => error)

    expect(error).to.be.instanceof(AerospikeError)
    expect(error.code).to.equal(status.ERR_PARAM)
    expect(error.message).to.include('Top-K settings invalid')
  })

  it('reports invalid settings as a parameter error from query.background()', async function () {
    const error = await negativeK().background('udf', 'fn').then(() => null, error => error)

    expect(error).to.be.instanceof(AerospikeError)
    expect(error.code).to.equal(status.ERR_PARAM)
    expect(error.message).to.include('Top-K settings invalid')
  })
})

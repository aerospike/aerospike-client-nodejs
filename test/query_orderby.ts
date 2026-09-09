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

import type { Query as Q, query as queryModule, status as statusModule } from '../lib/aerospike.js';
import * as Aerospike from '../lib/aerospike.js';

import { expect } from 'chai';

const Query: typeof Q = Aerospike.Query
const status: typeof statusModule = Aerospike.status
const orderByType: typeof queryModule.orderByType = Aerospike.query.orderByType
const order: typeof queryModule.order = Aerospike.query.order
const orderByFlags: typeof queryModule.orderByFlags = Aerospike.query.orderByFlags

// Query#orderBy/Query#topK's own argument checks, and Query#foreach's
// assertValidOrderBy pre-flight checks that throw before any command is
// dispatched, run entirely synchronously and require no live cluster - see
// docs/design/vector-phase-1-client-design.md §4.3.2. To keep this suite
// #noserver-safe, every case below either (a) throws synchronously before
// ever reaching the native layer, or (b) only inspects Query state
// (orderByBin/topKLimit) without calling foreach()/results() - actually
// executing a query, even against a deliberately unconnected client, is
// intentionally out of scope here.
//
// Aerospike.client() (no config) constructs an unconnected client - see
// the equivalent pattern in test/client.ts - which is enough to build
// Query instances directly (bypassing Client#query's own connected-check)
// without requiring a live server.
function newQuery (options?: object): Q {
  const client = Aerospike.client()
  return new Query(client, 'test', 'demo', options as any)
}

describe('Query#orderBy / Query#topK #noserver', function () {
  describe('Query#orderBy', function () {
    it('stores the order key with defaults for direction/flags', function () {
      const query = newQuery()
      query.orderBy('score', orderByType.INTEGER)

      expect(query.orderByBin).to.eql({
        binName: 'score',
        type: orderByType.INTEGER,
        direction: order.DESC,
        flags: orderByFlags.NONE
      })
    })

    it('stores an explicit direction and flags', function () {
      const query = newQuery()
      query.orderBy('name', orderByType.STRING, order.ASC, orderByFlags.CASE_INSENSITIVE)

      expect(query.orderByBin).to.eql({
        binName: 'name',
        type: orderByType.STRING,
        direction: order.ASC,
        flags: orderByFlags.CASE_INSENSITIVE
      })
    })

    it('rejects a bin name longer than 14 characters', function () {
      const query = newQuery()
      const fn = () => query.orderBy('this_name_is_way_too_long', orderByType.INTEGER)
      expect(fn).to.throw(/14-character limit/)
    })

    it('rejects a missing type', function () {
      const query = newQuery()
      // @ts-expect-error - intentionally omitting the required `type` argument
      const fn = () => query.orderBy('score')
      expect(fn).to.throw(/requires a type declaration/)
    })

    it('rejects a type that is not one of the four', function () {
      const query = newQuery()
      const fn = () => query.orderBy('score', 999 as unknown as queryModule.orderByType)
      expect(fn).to.throw(/orderBy type must be one of/)
    })

    it('rejects an invalid direction', function () {
      const query = newQuery()
      const fn = () => query.orderBy('score', orderByType.INTEGER, 999 as unknown as queryModule.order)
      expect(fn).to.throw(/orderBy direction must be ASC or DESC/)
    })

    it('rejects CASE_INSENSITIVE with a non-STRING type', function () {
      const query = newQuery()
      const fn = () => query.orderBy('score', orderByType.INTEGER, order.ASC, orderByFlags.CASE_INSENSITIVE)
      expect(fn).to.throw(/CASE_INSENSITIVE is only valid with type STRING/)
    })

    it('raises errors with AerospikeError ERR_PARAM semantics', function () {
      const query = newQuery()
      try {
        query.orderBy('score', 999 as unknown as queryModule.orderByType)
        expect.fail('expected an error to be thrown')
      } catch (error: any) {
        expect(error.code).to.equal(status.ERR_PARAM)
      }
    })
  })

  describe('Query#topK', function () {
    it('requires orderBy() to have been called first', function () {
      const query = newQuery()
      const fn = () => query.topK(10)
      expect(fn).to.throw(/topK\(\) requires orderBy\(\) to be called first/)
    })

    it('stores a valid k once orderBy() has been called', function () {
      const query = newQuery()
      query.orderBy('score', orderByType.INTEGER)
      query.topK(10)
      expect(query.topKLimit).to.equal(10)
    })

    it('rejects k below the minimum', function () {
      const query = newQuery()
      query.orderBy('score', orderByType.INTEGER)
      const fn = () => query.topK(0)
      expect(fn).to.throw(/topK must be in \[1, 1000\]/)
    })

    it('rejects k above the maximum', function () {
      const query = newQuery()
      query.orderBy('score', orderByType.INTEGER)
      const fn = () => query.topK(1001)
      expect(fn).to.throw(/topK must be in \[1, 1000\]/)
    })

    it('rejects a non-integer k', function () {
      const query = newQuery()
      query.orderBy('score', orderByType.INTEGER)
      const fn = () => query.topK(1.5)
      expect(fn).to.throw(/topK must be in \[1, 1000\]/)
    })

    it('accepts k at the boundaries [1, 1000]', function () {
      const query1 = newQuery()
      query1.orderBy('score', orderByType.INTEGER)
      query1.topK(1)
      expect(query1.topKLimit).to.equal(1)

      const query2 = newQuery()
      query2.orderBy('score', orderByType.INTEGER)
      query2.topK(1000)
      expect(query2.topKLimit).to.equal(1000)
    })
  })

  describe('Query#foreach pre-flight validation', function () {
    it('rejects orderBy() without a matching topK()', function () {
      const query = newQuery()
      query.orderBy('score', orderByType.INTEGER)
      const fn = () => query.foreach()
      expect(fn).to.throw(/requires topK\(\) to also be called/)
    })

    it('rejects an orderBy bin that is not in the query projection', function () {
      const query = newQuery({ select: ['a', 'b'] })
      query.orderBy('score', orderByType.INTEGER)
      query.topK(5)
      const fn = () => query.foreach()
      expect(fn).to.throw(/is not in projection/)
    })

    it('rejects orderBy/topK combined with paginate', function () {
      const query = newQuery({ paginate: true, maxRecords: 10 })
      query.orderBy('score', orderByType.INTEGER)
      query.topK(5)
      const fn = () => query.foreach()
      expect(fn).to.throw(/cannot be combined with paginate/)
    })

    it('rejects orderBy/topK combined with a stream UDF', function () {
      const query = newQuery()
      query.orderBy('score', orderByType.INTEGER)
      query.topK(5)
      query.setUdf('someModule', 'someFunction')
      const fn = () => query.foreach()
      expect(fn).to.throw(/incompatible with aggregate UDFs/)
    })
  })

  describe('background-query entry points', function () {
    it('Query#apply rejects a query with orderBy/topK set', function () {
      const query = newQuery()
      query.orderBy('score', orderByType.INTEGER)
      query.topK(5)
      const fn = () => query.apply('someModule', 'someFunction')
      expect(fn).to.throw(/only valid on foreground/)
    })

    it('Query#background rejects a query with orderBy/topK set', function () {
      const query = newQuery()
      query.orderBy('score', orderByType.INTEGER)
      query.topK(5)
      const fn = () => query.background('someModule', 'someFunction')
      expect(fn).to.throw(/only valid on foreground/)
    })

    it('Query#operate rejects a query with orderBy/topK set', function () {
      const query = newQuery()
      query.orderBy('score', orderByType.INTEGER)
      query.topK(5)
      const fn = () => query.operate([])
      expect(fn).to.throw(/only valid on foreground/)
    })
  })
})

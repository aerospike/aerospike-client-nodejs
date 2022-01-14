// *****************************************************************************
// Copyright 2021 Aerospike, Inc.
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

const Aerospike = require('../lib/aerospike')
const exp = Aerospike.expressions
const op = Aerospike.operations
const lists = Aerospike.lists
const GeoJSON = Aerospike.GeoJSON

const FILTERED_OUT = Aerospike.status.FILTERED_OUT

const helper = require('./test_helper')
const keygen = helper.keygen

describe('Aerospike.expressions', function () {
  helper.skipUnlessVersion('>= 5.0.0', this)

  const client = helper.client

  async function createRecord (bins, meta = null) {
    const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exp' })()
    await client.put(key, bins, meta)
    return key
  }

  async function testNoMatch (key, filterExpression) {
    const rejectPolicy = { filterExpression }
    let operationSuccessful = false
    try {
      await client.remove(key, rejectPolicy)
      operationSuccessful = true
    } catch (error) {
      expect(error.code).to.eq(FILTERED_OUT, `Received unexpected error code with message "${error.message}"`)
    }
    if (operationSuccessful) {
      expect.fail('Test no-match: Operation should have not have been executed due to failed expression match')
    }
  }

  async function testMatch (key, filterExpression) {
    const passPolicy = { filterExpression }
    await client.remove(key, passPolicy)
  }

  async function applyExp (key, bin, expression) {
    const policy = { filterExpression: expression }
    const ops = [op.read(bin)]
    const result = await client.operate(key, ops, {}, policy)
    return result.bins[bin]
  }

  it('builds up a filter expression value', function () {
    const filter = exp.eq(exp.binInt('intVal'), exp.int(42))
    expect(filter).to.be.an('array')
  })

  describe('comparison expressions', function () {
    describe('eq on int bin', function () {
      it('evaluates to true if an integer bin equals the given value', async function () {
        const key = await createRecord({ intVal: 42 })

        await testNoMatch(key, exp.eq(exp.binInt('intVal'), exp.int(37)))
        await testMatch(key, exp.eq(exp.binInt('intVal'), exp.int(42)))
      })
    })

    describe('eq on blob bin', function () {
      it('evaluates to true if a blob bin matches a value', async function () {
        const key = await createRecord({ blob: Buffer.from([1, 2, 3]) })

        await testNoMatch(key, exp.eq(exp.binBlob('blob'), exp.bytes(Buffer.from([4, 5, 6]))))
        await testMatch(key, exp.eq(exp.binBlob('blob'), exp.bytes(Buffer.from([1, 2, 3]))))
      })
    })

    describe('ne on int bin', function () {
      it('evaluates to true if an integer bin does not equal the given value', async function () {
        const key = await createRecord({ intVal: 42 })

        await testNoMatch(key, exp.ne(exp.binInt('intVal'), exp.int(42)))
        await testMatch(key, exp.ne(exp.binInt('intVal'), exp.int(37)))
      })
    })

    describe('gt on float bin', function () {
      it('evaluates to true if a float bin value is greater than the given value', async function () {
        const key = await createRecord({ pi: Math.PI })

        await testNoMatch(key, exp.gt(exp.binFloat('pi'), exp.float(4.5678)))
        await testMatch(key, exp.gt(exp.binFloat('pi'), exp.float(1.2345)))
      })
    })

    describe('regex - regular expression comparisons', function () {
      it('matches a string value with a regular expression', async function () {
        const key = await createRecord({ title: 'Star Wars' })

        await testNoMatch(key, exp.cmpRegex(0, 'Treck$', exp.binStr('title')))
        await testMatch(key, exp.cmpRegex(0, '^Star', exp.binStr('title')))
      })

      it('matches a string value with a regular expression - case insensitive', async function () {
        const key = await createRecord({ title: 'Star Wars' })

        await testNoMatch(key, exp.cmpRegex(Aerospike.regex.ICASE, 'trEcK$', exp.binStr('title')))
        await testMatch(key, exp.cmpRegex(Aerospike.regex.ICASE, '^sTaR', exp.binStr('title')))
      })
    })

    describe('geo - geospatial comparisons', function () {
      it('matches if the point is contained within the region', async function () {
        const key = await createRecord({ location: new GeoJSON.Point(103.913, 1.308) })

        await testNoMatch(key, exp.cmpGeo(exp.binGeo('location'), exp.geo(new GeoJSON.Circle(9.78, 53.55, 50000))))
        await testMatch(key, exp.cmpGeo(exp.binGeo('location'), exp.geo(new GeoJSON.Circle(103.875, 1.297, 10000))))
      })

      it('matches if the region contains the point', async function () {
        const key = await createRecord({ location: new GeoJSON.Point(103.913, 1.308) })

        await testNoMatch(key, exp.cmpGeo(exp.geo(new GeoJSON.Circle(9.78, 53.55, 50000)), exp.binGeo('location')))
        await testMatch(key, exp.cmpGeo(exp.geo(new GeoJSON.Circle(103.875, 1.297, 10000)), exp.binGeo('location')))
      })
    })
  })

  describe('list expressions', function () {
    describe('list size', function () {
      it('matches the size of a list value', async function () {
        const key = await createRecord({ tags: ['blue', 'green', 'yellow'] })

        await testNoMatch(key, exp.eq(exp.lists.size(exp.binList('tags')), exp.int(5)))
        await testMatch(key, exp.eq(exp.lists.size(exp.binList('tags')), exp.int(3)))
      })
    })

    describe('getByValue', function () {
      it('matches the count of the matched list values', async function () {
        const key = await createRecord({ tags: ['blue', 'green', 'yellow', 'green'] })

        await testNoMatch(key, exp.eq(exp.lists.getByValue(exp.binList('tags'), exp.str('green'), lists.returnType.COUNT), exp.int(1)))
        await testMatch(key, exp.eq(exp.lists.getByValue(exp.binList('tags'), exp.str('green'), lists.returnType.COUNT), exp.int(2)))
      })
    })

    describe('getByValueRange', function () {
      it('matches the count of the matched range of list values', async function () {
        const key = await createRecord({ values: [53, 16, 94, 38, 25, 88, 48] })

        await testNoMatch(key, exp.eq(exp.lists.getByValueRange(exp.binList('values'), exp.int(25), exp.int(50), lists.returnType.COUNT), exp.int(1)))
        await testMatch(key, exp.eq(exp.lists.getByValueRange(exp.binList('values'), exp.int(25), exp.int(50), lists.returnType.COUNT), exp.int(3)))
      })
    })

    describe('getByValueList', function () {
      it('matches the count of the matched values', async function () {
        const key = await createRecord({ values: [53, 16, 94, 38, 25, 88, 88, 48, 16] })

        await testNoMatch(key, exp.eq(exp.lists.getByValueList(exp.binList('values'), exp.list([88, 94]), lists.returnType.COUNT), exp.int(2)))
        await testMatch(key, exp.eq(exp.lists.getByValueList(exp.binList('values'), exp.list([88, 94]), lists.returnType.COUNT), exp.int(3)))
      })
    })

    describe('getByRelRankRangeToEnd', function () {
      it('selects list items nearest to value and greater by relative rank', async function () {
        const key = await createRecord({ values: [53, 16, 94, 38, 25, 88, 88, 48, 16] })

        await testNoMatch(key, exp.eq(exp.lists.getByRelRankRangeToEnd(exp.binList('values'), exp.int(38), exp.int(1), lists.returnType.VALUE), exp.list([38, 48, 53, 88, 88, 94])))
        await testMatch(key, exp.eq(exp.lists.getByRelRankRangeToEnd(exp.binList('values'), exp.int(38), exp.int(1), lists.returnType.VALUE), exp.list([48, 53, 88, 88, 94])))
      })
    })

    describe('getByRelRankRange', function () {
      it('selects list items nearest to value and greater by relative rank with a count limit', async function () {
        const key = await createRecord({ values: [53, 16, 94, 38, 25, 88, 88, 48, 16] })

        await testNoMatch(key, exp.eq(exp.lists.getByRelRankRange(exp.binList('values'), exp.int(38), exp.int(1), exp.int(3), lists.returnType.VALUE), exp.list([38, 48, 53])))
        await testMatch(key, exp.eq(exp.lists.getByRelRankRange(exp.binList('values'), exp.int(38), exp.int(1), exp.int(3), lists.returnType.VALUE), exp.list([48, 53, 88])))
      })
    })

    describe('getByIndex', function () {
      it('selects item identified by index', async function () {
        const key = await createRecord({ values: ['Singapore', 'Hamburg', 'San Francisco', 'Tokyo'] })

        await testNoMatch(key, exp.eq(exp.lists.getByIndex(exp.binList('values'), exp.int(2), exp.type.STR, lists.returnType.VALUE), exp.str('Hamburg')))
        await testMatch(key, exp.eq(exp.lists.getByIndex(exp.binList('values'), exp.int(2), exp.type.STR, lists.returnType.VALUE), exp.str('San Francisco')))
      })
    })

    describe('getByIndexRangeToEnd', function () {
      it('selects list items starting at specified index to the end of the list', async function () {
        const key = await createRecord({ values: ['Singapore', 'Hamburg', 'San Francisco', 'Tokyo'] })

        await testNoMatch(key, exp.eq(exp.lists.getByIndexRangeToEnd(exp.binList('values'), exp.int(2), lists.returnType.VALUE), exp.list(['Hamburg', 'San Francisco'])))
        await testMatch(key, exp.eq(exp.lists.getByIndexRangeToEnd(exp.binList('values'), exp.int(2), lists.returnType.VALUE), exp.list(['San Francisco', 'Tokyo'])))
      })
    })

    describe('getByIndexRange', function () {
      it('selects "count" list items starting at specified index', async function () {
        const key = await createRecord({ values: ['Singapore', 'Hamburg', 'San Francisco', 'Tokyo'] })

        await testNoMatch(key, exp.eq(exp.lists.getByIndexRange(exp.binList('values'), exp.int(2), exp.int(1), lists.returnType.VALUE), exp.list(['Hamburg'])))
        await testMatch(key, exp.eq(exp.lists.getByIndexRange(exp.binList('values'), exp.int(2), exp.int(1), lists.returnType.VALUE), exp.list(['San Francisco'])))
      })
    })

    describe('getByRank', function () {
      it('selects list item identified by rank', async function () {
        const key = await createRecord({ values: [83, 39, 49, 20, 42, 41, 98] })

        await testNoMatch(key, exp.eq(exp.lists.getByRank(exp.binList('values'), exp.int(2), exp.type.INT, lists.returnType.VALUE), exp.int(42)))
        await testMatch(key, exp.eq(exp.lists.getByRank(exp.binList('values'), exp.int(2), exp.type.INT, lists.returnType.VALUE), exp.int(41)))
      })
    })

    describe('getByRankRangeToEnd', function () {
      it('selects list items starting at specified rank to the last ranked item', async function () {
        const key = await createRecord({ values: [83, 39, 49, 20, 42, 41, 98] })

        await testNoMatch(key, exp.eq(exp.lists.getByRankRangeToEnd(exp.binList('values'), exp.int(2), lists.returnType.VALUE), exp.list([39, 41, 42, 49, 83, 98])))
        await testMatch(key, exp.eq(exp.lists.getByRankRangeToEnd(exp.binList('values'), exp.int(2), lists.returnType.VALUE), exp.list([41, 42, 49, 83, 98])))
      })
    })

    describe('getByRankRange', function () {
      it('selects "count" list items starting at specified rank', async function () {
        const key = await createRecord({ values: [83, 39, 49, 20, 42, 41, 98] })

        await testNoMatch(key, exp.eq(exp.lists.getByRankRange(exp.binList('values'), exp.int(2), exp.int(2), lists.returnType.VALUE), exp.list([39, 41, 42])))
        await testMatch(key, exp.eq(exp.lists.getByRankRange(exp.binList('values'), exp.int(2), exp.int(2), lists.returnType.VALUE), exp.list([42, 41])))
      })
    })

    describe('append', function () {
      it('appends an element at the end of the list', async function () {
        const key = await createRecord({ values: [83, 39, 49] })
        //const list_policy = { list_pol: []}

        const result = await applyExp(key, 'values', exp.lists.append(exp.binList('values'), exp.int(2)))
        expect(result).to.eql([83, 39, 49, 2])
      })
    })
  })

  describe('map expressions', function () {
    describe('map size', function () {
      it('returns the map size', async function () {
        const key = await createRecord({ map: { john: 42, malcom: 73, susan: 27 } })

        await testNoMatch(key, exp.eq(exp.maps.size(exp.binMap('map')), exp.int(2)))
        await testMatch(key, exp.eq(exp.maps.size(exp.binMap('map')), exp.int(3)))
      })
    })
  })

  describe('binExists', function () {
    it('evaluates to true if the bin with the given name exists', async function () {
      const key = await createRecord({ foo: 'bar' })

      await testNoMatch(key, exp.binExists('fox'))
      await testMatch(key, exp.binExists('foo'))
    })
  })

  describe('ttl', function () {
    helper.skipUnlessSupportsTtl(this)

    it('evaluates to true if the record ttl matches expectations', async function () {
      const key = await createRecord({ foo: 'bar' }, { ttl: 1000 })

      await testNoMatch(key, exp.eq(exp.ttl(), exp.int(0)))
      await testMatch(key, exp.gt(exp.ttl(), exp.int(0)))
    })
  })

  describe('voidTime', function () {
    helper.skipUnlessSupportsTtl(this)

    it('evaluates to true if the record void time matches expectations', async function () {
      const key = await createRecord({ foo: 'bar' }, { ttl: 1000 })

      const now = Date.now() * 1000000 // nanoseconds
      await testNoMatch(key, exp.lt(exp.voidTime(), exp.int(now)))
      await testMatch(key, exp.gt(exp.voidTime(), exp.int(now)))
    })
  })

  describe('not', function () {
    it('evaluates to true if the expression evaluates to false', async function () {
      const key = await createRecord({ a: 1, b: 2, c: 3 })

      await testNoMatch(key, exp.not(exp.binExists('a')))
      await testMatch(key, exp.not(exp.binExists('d')))
    })
  })

  describe('and', function () {
    it('evaluates to true if all expressions evaluate to true', async function () {
      const key = await createRecord({ a: 1, b: 2, c: 3 })

      await testNoMatch(key, exp.and(exp.binExists('a'), exp.binExists('d')))
      await testMatch(key, exp.and(exp.binExists('a'), exp.binExists('b')))
    })
  })

  describe('or', function () {
    it('evaluates to true if any expression evaluates to true', async function () {
      const key = await createRecord({ a: 1, b: 2, c: 3 })

      await testNoMatch(key, exp.or(exp.binExists('d'), exp.binExists('e')))
      await testMatch(key, exp.or(exp.binExists('a'), exp.binExists('d')))
    })
  })
})

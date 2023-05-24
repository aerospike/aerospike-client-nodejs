// *****************************************************************************
// Copyright 2022-2023 Aerospike, Inc.
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
const exp = Aerospike.exp
const maps = Aerospike.maps
const op = Aerospike.operations
const Context = Aerospike.cdt.Context
const helper = require('./test_helper')
const keygen = helper.keygen
const tempBin = 'ExpVar'
const FILTERED_OUT = Aerospike.status.FILTERED_OUT

describe('Aerospike.exp_operations', function () {
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

  const orderMap = (bin, order, ctx) => {
    const policy = new Aerospike.MapPolicy({ order })
    const setMapPolicy = maps.setPolicy(bin, policy)
    if (ctx) setMapPolicy.withContext(ctx)
    return client.operate(setMapPolicy)
  }

  const orderByKey = (bin, ctx) => orderMap(bin, maps.order.KEY_ORDERED, ctx)

  it('builds up a filter expression value', function () {
    const filter = exp.eq(exp.binInt('intVal'), exp.int(42))
    expect(filter).to.be.an('array')
  })

  describe('map expressions', function () {
    describe('clear', function () {
      it('removes all items in a map', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.clear(
              exp.binMap('tags')),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: {} })
      })

      it('selects item identified by index inside nested map', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })

        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.clear(
              exp.binMap('tags'),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: {} } })
      })
    })

    describe('getByIndex', function () {
      it('selects item identified by index', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        const ops = [
          exp.operations.read(tempBin,
            exp.maps.getByIndex(
              exp.binMap('tags'),
              exp.int(2),
              exp.type.INT,
              maps.returnType.COUNT),
            0),
          op.read('tags')
        ]
        await client.operate(key, ops, {})

        await testNoMatch(key, exp.eq(
          exp.maps.getByIndex(
            exp.binMap('tags'),
            exp.int(2),
            exp.type.INT,
            maps.returnType.COUNT),
          exp.int(0)))
        await testMatch(key, exp.eq(
          exp.maps.getByIndex(
            exp.binMap('tags'),
            exp.int(2),
            exp.type.INT,
            maps.returnType.COUNT),
          exp.int(1)))
      })

      it('selects item identified by index inside nested map', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        orderByKey('tags')
        orderByKey('tags', context)
        await testNoMatch(key, exp.eq(
          exp.maps.getByIndex(
            exp.binMap('tags'),
            exp.int(2),
            exp.type.AUTO,
            maps.returnType.COUNT,
            context),
          exp.int(0)))
        await testMatch(key, exp.eq(
          exp.maps.getByIndex(
            exp.binMap('tags'),
            exp.int(3),
            exp.type.AUTO,
            maps.returnType.COUNT,
            context),
          exp.int(1)))
      })
    })

    describe('getByIndexRange', function () {
      it('selects "count" map items starting at specified index', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        await testNoMatch(key, exp.eq(
          exp.maps.getByIndexRange(
            exp.binMap('tags'),
            exp.int(5),
            exp.int(0),
            maps.returnType.COUNT),
          exp.int(0)))
        await testMatch(key, exp.eq(
          exp.maps.getByIndexRange(
            exp.binMap('tags'),
            exp.int(5),
            exp.int(0),
            maps.returnType.COUNT),
          exp.int(3)))
      })

      it('selects "count" map items starting at specified nested index', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        orderByKey('tags')
        orderByKey('tags', context)
        await testNoMatch(key, exp.eq(
          exp.maps.getByIndexRange(
            exp.binMap('tags'),
            exp.int(6),
            exp.int(0),
            maps.returnType.COUNT,
            context),
          exp.int(0)))
        await testMatch(key, exp.eq(
          exp.maps.getByIndexRange(
            exp.binMap('tags'),
            exp.int(6),
            exp.int(0),
            maps.returnType.COUNT,
            context),
          exp.int(4)))
      })
    })

    describe('getByIndexRangeToEnd', function () {
      it('selects map items starting at specified index to the end of the map', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        await testNoMatch(key, exp.eq(
          exp.maps.getByIndexRangeToEnd(
            exp.binMap('tags'),
            exp.int(0),
            maps.returnType.COUNT),
          exp.int(0)))
        await testMatch(key, exp.eq(
          exp.maps.getByIndexRangeToEnd(
            exp.binMap('tags'),
            exp.int(0),
            maps.returnType.COUNT),
          exp.int(3)))
      })

      it('selects map items starting at specified index to the end of the map', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        orderByKey('tags')
        orderByKey('tags', context)
        await testNoMatch(key, exp.eq(
          exp.maps.getByIndexRangeToEnd(
            exp.binMap('tags'),
            exp.int(0),
            maps.returnType.COUNT,
            context),
          exp.int(0)))
        await testMatch(key, exp.eq(
          exp.maps.getByIndexRangeToEnd(
            exp.binMap('tags'),
            exp.int(0),
            maps.returnType.COUNT,
            context),
          exp.int(4)))
      })
    })

    describe('getByKey', function () {
      it('matches the count of the matched map values', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })
        await testNoMatch(key, exp.eq(exp.maps.getByKey(exp.binMap('tags'), exp.str('a'), exp.type.AUTO, maps.returnType.COUNT), exp.int(2)))
        await testMatch(key, exp.eq(exp.maps.getByKey(exp.binMap('tags'), exp.str('a'), exp.type.AUTO, maps.returnType.COUNT), exp.int(1)))
      })

      it('matches the count of the matched map values of a nested map', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        await testNoMatch(key, exp.eq(exp.maps.getByKey(exp.binMap('tags'), exp.str('d'), exp.type.AUTO, maps.returnType.COUNT, context), exp.int(2)))
        await testMatch(key, exp.eq(exp.maps.getByKey(exp.binMap('tags'), exp.str('d'), exp.type.AUTO, maps.returnType.COUNT, context), exp.int(1)))
      })
    })

    describe('getByKeyRange', function () {
      it('matches the count of the matched map values', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })
        await testNoMatch(key, exp.eq(exp.maps.getByKeyRange(exp.binMap('tags'), exp.str('c'), exp.str('a'), maps.returnType.COUNT), exp.int(3)))
        await testMatch(key, exp.eq(exp.maps.getByKeyRange(exp.binMap('tags'), exp.str('c'), exp.str('a'), maps.returnType.COUNT), exp.int(2)))
      })

      it('matches the count of the matched map values of a nested map', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        await testNoMatch(key, exp.eq(exp.maps.getByKeyRange(exp.binMap('tags'), exp.str('g'), exp.str('d'), maps.returnType.COUNT, context), exp.int(4)))
        await testMatch(key, exp.eq(exp.maps.getByKeyRange(exp.binMap('tags'), exp.str('g'), exp.str('d'), maps.returnType.COUNT, context), exp.int(3)))
      })
    })

    describe('getByKeyRelIndexRange', function () {
      it('matches the count of the matched map values', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', d: 'yellow' } })
        await testNoMatch(key, exp.eq(exp.maps.getByKeyRelIndexRange(exp.binMap('tags'), exp.int(3), exp.int(0), exp.str('b'), maps.returnType.COUNT), exp.int(1)))
        await testMatch(key, exp.eq(exp.maps.getByKeyRelIndexRange(exp.binMap('tags'), exp.int(3), exp.int(0), exp.str('b'), maps.returnType.COUNT), exp.int(2)))
      })

      it('matches the count of the matched map values of a nested map', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', g: 'white', h: 'black' } } })
        const context = new Context().addMapKey('nested')
        await testNoMatch(key, exp.eq(exp.maps.getByKeyRelIndexRange(exp.binMap('tags'), exp.int(3), exp.int(0), exp.str('g'), maps.returnType.COUNT, context), exp.int(1)))
        await testMatch(key, exp.eq(exp.maps.getByKeyRelIndexRange(exp.binMap('tags'), exp.int(3), exp.int(0), exp.str('g'), maps.returnType.COUNT, context), exp.int(2)))
      })
    })
    /*
    describe('getByKeyRelIndexRangeToEnd', function () {
      it('matches the count of the matched map values', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', d: 'yellow' } })
        await testNoMatch(key, exp.eq(exp.maps.getByKeyRelIndexRangeToEnd(exp.binMap('tags'), exp.int(0), exp.str('b'), maps.returnType.COUNT), exp.int(1)))
        await testMatch(key, exp.eq(exp.maps.getByKeyRelIndexRangeToEnd(exp.binMap('tags'), exp.int(0), exp.str('b'), maps.returnType.COUNT), exp.int(2)))
      })

      it('matches the count of the matched map values of a nested map', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', g: 'white', h: 'black' } } })
        const context = new Context().addMapKey('nested')
        await testNoMatch(key, exp.eq(exp.maps.getByKeyRelIndexRangeToEnd(exp.binMap('tags'),  exp.int(0), exp.str('e'), maps.returnType.COUNT, context), exp.int(2)))
        await testMatch(key, exp.eq(exp.maps.getByKeyRelIndexRangeToEnd(exp.binMap('tags'), exp.int(0), exp.str('e'),  maps.returnType.COUNT, context), exp.int(3)))
      })
    })
*/
    describe('getByRank', function () {
      it('selects map item identified by rank', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', d: 5, c: 'yellow' } })

        const ops = [
          exp.operations.read(tempBin,
            exp.maps.getByRank(
              exp.binMap('tags'),
              exp.int(0),
              exp.type.INT,
              maps.returnType.COUNT),
            0),
          op.read('tags')
        ]
        await client.operate(key, ops, {})

        await testNoMatch(key, exp.eq(
          exp.maps.getByRank(
            exp.binMap('tags'),
            exp.int(0),
            exp.type.INT,
            maps.returnType.COUNT),
          exp.int(0)))
        await testMatch(key, exp.eq(
          exp.maps.getByRank(
            exp.binMap('tags'),
            exp.int(0),
            exp.type.INT,
            maps.returnType.COUNT),
          exp.int(1)))
      })

      it('selects map item identified by rank within a nested map', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', d: 5, c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.read(tempBin,
            exp.maps.getByRank(
              exp.binMap('tags'),
              exp.int(0),
              exp.type.INT,
              maps.returnType.COUNT),
            0),
          op.read('tags')
        ]
        await client.operate(key, ops, {})

        await testNoMatch(key, exp.eq(
          exp.maps.getByRank(
            exp.binMap('tags'),
            exp.int(0),
            exp.type.INT,
            maps.returnType.COUNT,
            context),
          exp.int(0)))
        await testMatch(key, exp.eq(
          exp.maps.getByRank(
            exp.binMap('tags'),
            exp.int(0),
            exp.type.INT,
            maps.returnType.COUNT,
            context),
          exp.int(1)))
      })
    })

    describe('getByRankRange', function () {
      it('selects "count" map items starting at specified rank', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        await testNoMatch(key, exp.eq(
          exp.maps.getByRankRange(
            exp.binMap('tags'),
            exp.int(4),
            exp.int(0),
            maps.returnType.COUNT),
          exp.int(0)))
        await testMatch(key, exp.eq(
          exp.maps.getByRankRange(
            exp.binMap('tags'),
            exp.int(4),
            exp.int(0),
            maps.returnType.COUNT),
          exp.int(3)))
      })

      it('selects "count" map items starting at specified rank in nested context', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        await testNoMatch(key, exp.eq(
          exp.maps.getByRankRange(
            exp.binMap('tags'),
            exp.int(5),
            exp.int(0),
            maps.returnType.COUNT,
            context),
          exp.int(0)))
        await testMatch(key, exp.eq(
          exp.maps.getByRankRange(
            exp.binMap('tags'),
            exp.int(5),
            exp.int(0),
            maps.returnType.COUNT,
            context),
          exp.int(4)))
      })
    })

    describe('getByRankRangeToEnd', function () {
      it('selects map items starting at specified rank to the last ranked item', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        await testNoMatch(key, exp.eq(
          exp.maps.getByRankRangeToEnd(
            exp.binMap('tags'),
            exp.int(0),
            maps.returnType.COUNT),
          exp.int(0)))
        await testMatch(key, exp.eq(
          exp.maps.getByRankRangeToEnd(
            exp.binMap('tags'),
            exp.int(0),
            maps.returnType.COUNT),
          exp.int(3)))
      })

      it('selects map items starting at specified rank to the last ranked item in a nested context', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        await testNoMatch(key, exp.eq(
          exp.maps.getByRankRangeToEnd(
            exp.binMap('tags'),
            exp.int(0),
            maps.returnType.COUNT,
            context),
          exp.int(0)))
        await testMatch(key, exp.eq(
          exp.maps.getByRankRangeToEnd(
            exp.binMap('tags'),
            exp.int(0),
            maps.returnType.COUNT,
            context),
          exp.int(4)))
      })
    })
  })

  describe('getByValue', function () {
    it('matches the count of the matched map values', async function () {
      const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

      await testNoMatch(key, exp.eq(exp.maps.getByValue(exp.binMap('tags'), exp.str('green'), maps.returnType.COUNT), exp.int(2)))
      await testMatch(key, exp.eq(exp.maps.getByValue(exp.binMap('tags'), exp.str('green'), maps.returnType.COUNT), exp.int(1)))
    })

    it('matches the count of the matched map values of a nested map', async function () {
      const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
      const context = new Context().addMapKey('nested')
      await testNoMatch(key, exp.eq(exp.maps.getByValue(exp.binMap('tags'), exp.str('orange'), maps.returnType.COUNT, context), exp.int(2)))
      await testMatch(key, exp.eq(exp.maps.getByValue(exp.binMap('tags'), exp.str('orange'), maps.returnType.COUNT, context), exp.int(1)))
    })
  })

  /*
  describe('getByValueList', function () {
    it('matches the count of the matched values', async function () {
      const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

      await testNoMatch(key, exp.eq(exp.maps.getByValueList(exp.binMap('tags'), exp.list([exp.str('green'), exp.str('yellow')]), maps.returnType.COUNT), exp.int(3)))
      await testMatch(key, exp.eq(exp.maps.getByValueList(exp.binMap('tags'), exp.list([exp.str('green'), exp.str('yellow')]), maps.returnType.COUNT), exp.int(2)))
    })

    it('matches the count of the matched values', async function () {
      const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
      const context = new Context().addMapKey('nested')

      await testNoMatch(key, exp.eq(exp.maps.getByValueList(exp.binMap('tags'), exp.list([exp.str('orange'), exp.str('white')]), maps.returnType.COUNT, context), exp.int(3)))
      await testMatch(key, exp.eq(exp.maps.getByValueList(exp.binMap('tags'), exp.list([exp.str('orange'), exp.str('white')]), maps.returnType.COUNT, context), exp.int(2)))
    })
  })
*/

  describe('getByValueRange', function () {
    it('matches the count of the matched range of map values', async function () {
      const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

      await testNoMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.str('yellow'), exp.str('blue'), maps.returnType.COUNT), exp.int(3)))

      await testMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.str('yellow'), exp.str('blue'), maps.returnType.COUNT), exp.int(2)))
    })

    it('matches the count of the matched range of map values in a nested context', async function () {
      const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
      const context = new Context().addMapKey('nested')
      await testNoMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.str('white'), exp.str('black'), maps.returnType.COUNT, context), exp.int(4)))

      await testMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.str('white'), exp.str('black'), maps.returnType.COUNT, context), exp.int(3)))
    })
  })

  describe('getByValueRelRankRange', function () {
    it('selects map items nearest to value and greater by relative rank with a count limit', async function () {
      const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

      await testNoMatch(key, exp.eq(
        exp.maps.getByValueRelRankRange(
          exp.binMap('tags'),
          exp.int(2),
          exp.int(0),
          exp.str('yellow'),
          maps.returnType.COUNT),
        exp.int(0)))
      await testMatch(key, exp.eq(
        exp.maps.getByValueRelRankRange(
          exp.binMap('tags'),
          exp.int(2),
          exp.int(0),
          exp.str('yellow'),
          maps.returnType.COUNT),
        exp.int(1)))
    })

    it('selects map items nearest to value and greater by relative rank with a count limit in a nested context', async function () {
      const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
      const context = new Context().addMapKey('nested')
      await testNoMatch(key, exp.eq(
        exp.maps.getByValueRelRankRange(
          exp.binMap('tags'),
          exp.int(2),
          exp.int(0),
          exp.str('pink'),
          maps.returnType.COUNT,
          context),
        exp.int(0)))
      await testMatch(key, exp.eq(
        exp.maps.getByValueRelRankRange(
          exp.binMap('tags'),
          exp.int(2),
          exp.int(0),
          exp.str('pink'),
          maps.returnType.COUNT,
          context),
        exp.int(2)))
    })
  })

  describe('getByValueRelRankRangeToEnd', function () {
    it('selects map items nearest to value and greater by relative rank', async function () {
      const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

      await testNoMatch(key, exp.eq(exp.maps.getByValueRelRankRangeToEnd(
        exp.binMap('tags'),
        exp.int(0),
        exp.str('yellow'),
        maps.returnType.COUNT),
      exp.int(0)))
      await testMatch(key, exp.eq(exp.maps.getByValueRelRankRangeToEnd(
        exp.binMap('tags'),
        exp.int(0),
        exp.str('yellow'),
        maps.returnType.COUNT),
      exp.int(1)))
    })

    it('selects map items nearest to value and greater by relative rank in a nested context', async function () {
      const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
      const context = new Context().addMapKey('nested')
      await testNoMatch(key, exp.eq(exp.maps.getByValueRelRankRangeToEnd(
        exp.binMap('tags'),
        exp.int(0),
        exp.str('orange'),
        maps.returnType.COUNT,
        context),
      exp.int(0)))
      await testMatch(key, exp.eq(exp.maps.getByValueRelRankRangeToEnd(
        exp.binMap('tags'),
        exp.int(0),
        exp.str('orange'),
        maps.returnType.COUNT,
        context),
      exp.int(3)))
    })
  })

  describe('putItems', function () {
    it('writes map values to a specified map', async function () {
      const key = await createRecord({ map: { c: 1, b: 2, a: 3 }, map2: { f: 1, e: 2, d: 3 } })
      const ops = [
        exp.operations.write('map',
          exp.maps.putItems(exp.binMap('map'), exp.binMap('map2')),
          0),
        op.read('map')
      ]
      const result = await client.operate(key, ops, {})
      expect(result.bins.map).to.eql({ a: 3, b: 2, c: 1, d: 3, e: 2, f: 1 })
    })

    it('writes map values from exp.map expression to specified map', async function () {
      const key = await createRecord({ map: { c: 1, b: 2, a: 3 } })
      const ops = [
        exp.operations.write('map',
          exp.maps.putItems(exp.binMap('map'), exp.map({ f: 1, e: 2, d: 3 })),
          0),
        op.read('map')
      ]
      const result = await client.operate(key, ops, {})
      expect(result.bins.map).to.eql({ a: 3, b: 2, c: 1, d: 3, e: 2, f: 1 })
    })

    it('writes map values originating from nested map to a specified map', async function () {
      const key = await createRecord({ map: { c: 1, b: 2, a: 3, nested: { g: 4 } }, map2: { f: 1, e: 2, d: 3 } })
      const context = new Context().addMapKey('nested')
      const ops = [
        exp.operations.write('map',
          exp.maps.putItems(exp.binMap('map'), exp.binMap('map2'), null, context),
          0),
        op.read('map')
      ]
      const result = await client.operate(key, ops, {})
      expect(result.bins.map.nested).to.eql({ d: 3, e: 2, f: 1, g: 4 })
    })
  })

  describe('size', function () {
    it('returns the map size', async function () {
      const key = await createRecord({ map: { john: 42, malcom: 73, susan: 27 } })

      await testNoMatch(key, exp.eq(exp.maps.size(exp.binMap('map')), exp.int(2)))
      await testMatch(key, exp.eq(exp.maps.size(exp.binMap('map')), exp.int(3)))
    })

    it('returns the map size from a nested map', async function () {
      const key = await createRecord({ map: { john: 42, malcom: 73, susan: 27, nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
      const context = new Context().addMapKey('nested')
      await testNoMatch(key, exp.eq(exp.maps.size(exp.binMap('map'), context), exp.int(2)))
      await testMatch(key, exp.eq(exp.maps.size(exp.binMap('map'), context), exp.int(4)))
    })
  })
})

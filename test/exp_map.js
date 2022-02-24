// *****************************************************************************
// Copyright 2022 Aerospike, Inc.
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

  it('builds up a filter expression value', function () {
    const filter = exp.eq(exp.binInt('intVal'), exp.int(42))
    expect(filter).to.be.an('array')
  })

  describe('map expressions', function () {
    describe('map size', function () {
      it('returns the map size', async function () {
        const key = await createRecord({ map: { john: 42, malcom: 73, susan: 27 } })

        await testNoMatch(key, exp.eq(exp.maps.size(exp.binMap('map')), exp.int(2)))
        await testMatch(key, exp.eq(exp.maps.size(exp.binMap('map')), exp.int(3)))
      })
    })
    describe('map bin putItems expression', function () {
      it('evaluates exp_write op to true if temp bin equals to combined maps', async function () {
        const key = await createRecord({ map: { c: 1, b: 2, a: 3 }, map2: { f: 1, e: 2, d: 3 } })
        const ops = [
          exp.operations.write('map',
            exp.maps.putItems(exp.binMap('map'), exp.binMap('map2')),
            0),
          op.read('map')
        ]
        const result = await client.operate(key, ops, {})
        // console.log(result)
        expect(result.bins.map).to.eql({ a: 3, b: 2, c: 1, d: 3, e: 2, f: 1 })
      })
    })

    describe('getByValue', function () {
      it('matches the count of the matched map values', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        await testNoMatch(key, exp.eq(exp.maps.getByValue(exp.binMap('tags'), exp.str('green'), maps.returnType.COUNT), exp.int(2)))
        await testMatch(key, exp.eq(exp.maps.getByValue(exp.binMap('tags'), exp.str('green'), maps.returnType.COUNT), exp.int(1)))
      })
    })

    describe('getByValueRange', function () {
      it('matches the count of the matched range of map values', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        await testNoMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.str('yellow'), exp.str('blue'), maps.returnType.COUNT), exp.int(3)))
        const ops = [
          exp.operations.read(tempBin,
            exp.maps.getByValueRange(
              exp.binMap('tags'),
              exp.str('yellow'),
              exp.str('blue'),
              maps.returnType.COUNT),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})
        console.log(result)

        await testMatch(key, exp.eq(exp.maps.getByValueRange(exp.binMap('tags'), exp.str('yellow'), exp.str('blue'), maps.returnType.COUNT), exp.int(2)))
      })
    })

    describe('getByValueList', function () {
      it('matches the count of the matched values', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        const ops = [
          exp.operations.read(tempBin,
            exp.maps.getByValueList(
              exp.binMap('tags'),
              exp.list(['yellow', 'blue']),
              maps.returnType.KEY),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})
        console.log(result)

        await testNoMatch(key, exp.eq(exp.maps.getByValueList(exp.binMap('tags'), exp.list(['green', 'yellow']), maps.returnType.COUNT), exp.int(3)))
        await testMatch(key, exp.eq(exp.maps.getByValueList(exp.binMap('tags'), exp.list(['green', 'yellow']), maps.returnType.COUNT), exp.int(0)))
      })
    })

    describe('getByValueRelRankRangeToEnd', function () {
      it('selects map items nearest to value and greater by relative rank', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        const ops = [
          exp.operations.read(tempBin,
            exp.maps.getByValueRelRankRangeToEnd(
              exp.binMap('tags'),
              exp.int(0),
              exp.str('yellow'),
              maps.returnType.COUNT),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})
        console.log(result)

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
    })

    describe('getByRelRankRange', function () {
      it('selects map items nearest to value and greater by relative rank with a count limit', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        const ops = [
          exp.operations.read(tempBin,
            exp.maps.getByValueRelRankRange(
              exp.binMap('tags'),
              exp.int(2),
              exp.int(0),
              exp.str('yellow'),
              maps.returnType.KEY),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})
        console.log(result)

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
        const result = await client.operate(key, ops, {})
        console.log(result)

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
    })

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
        const result = await client.operate(key, ops, {})
        console.log(result)

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
    })
  })
})

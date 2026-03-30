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
const op = Aerospike.operations
const lists = Aerospike.lists
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

  it('builds up a filter expression value', function () {
    const filter = exp.eq(exp.binInt('intVal'), exp.int(42))
    expect(filter).to.be.an('array')
  })
  describe('list expressions', function () {
    describe('list size', function () {
      it('matches the size of a list value', async function () {
        const key = await createRecord({ tags: ['blue', 'green', 'yellow'] })

        await testNoMatch(key, exp.eq(exp.lists.size(exp.binList('tags')), exp.int(5)))
        await testMatch(key, exp.eq(exp.lists.size(exp.binList('tags')), exp.int(3)))
      })
    })

    describe('list size with context', function () {
      it('matches the size of a list value within a nested context', async function () {
        const key = await createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })
        const context = new Context().addListIndex(2)
        await testNoMatch(key, exp.eq(exp.lists.size(exp.binList('tags'), context), exp.int(5)))
        await testMatch(key, exp.eq(exp.lists.size(exp.binList('tags'), context), exp.int(4)))
      })
    })

    describe('clear', function () {
      it('removes all items in a map', async function () {
        const key = await createRecord({ tags: ['blue', 'green', 'yellow'] })

        const ops = [
          exp.operations.write('tags',
            exp.lists.clear(
              exp.binList('tags')),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: [] })
      })

      it('selects item identified by index inside nested map', async function () {
        const key = await createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })

        const context = new Context().addListIndex(2)
        const ops = [
          exp.operations.write('tags',
            exp.lists.clear(
              exp.binList('tags'),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: ['blue', 'green', []] })
      })
    })

    describe('removeByValue', function () {
      it('removes list item by value', async function () {
        const key = await createRecord({ tags: ['blue', 'green', 'yellow'] })

        const ops = [
          exp.operations.write('tags',
            exp.lists.removeByValue(
              exp.binList('tags'),
              exp.str('green')),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: ['blue', 'yellow'] })
      })

      it('removes list item by value in a cdt context', async function () {
        const key = await createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })
        const context = new Context().addListIndex(2)
        const ops = [
          exp.operations.write('tags',
            exp.lists.removeByValue(
              exp.binList('tags'),
              exp.str('white'),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: ['blue', 'green', ['orange', 'pink', 'black']] })
      })
    })

    describe('removeByValueList', function () {
      it('removes list item by value list', async function () {
        const key = await createRecord({ tags: ['blue', 'green', 'yellow'] })

        const ops = [
          exp.operations.write('tags',
            exp.lists.removeByValueList(
              exp.binList('tags'),
              exp.list(['green', 'yellow'])),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: ['blue'] })
      })

      it('removes list item by value list in a cdt context', async function () {
        const key = await createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })
        const context = new Context().addListIndex(2)
        const ops = [
          exp.operations.write('tags',
            exp.lists.removeByValueList(
              exp.binList('tags'),
              exp.list(['orange', 'white']),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: ['blue', 'green', ['pink', 'black']] })
      })
    })

    describe('removeByValueRange', function () {
      it('removes list item by value range', async function () {
        const key = await createRecord({ tags: ['blue', 'green', 'yellow'] })

        const ops = [
          exp.operations.write('tags',
            exp.lists.removeByValueRange(
              exp.binList('tags'),
              exp.str('green'),
              exp.str('blue')),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: ['green', 'yellow'] })
      })

      it('removes list item by value range in a cdt context', async function () {
        const key = await createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })
        const context = new Context().addListIndex(2)
        const ops = [
          exp.operations.write('tags',
            exp.lists.removeByValueRange(
              exp.binList('tags'),
              exp.str('pink'),
              exp.str('black'),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: ['blue', 'green', ['pink', 'white']] })
      })
    })

    describe('removeByRelRankRangeToEnd', function () {
      it('removes list item by value relative rank range to end', async function () {
        const key = await createRecord({ tags: ['blue', 'green', 'yellow'] })

        const ops = [
          exp.operations.write('tags',
            exp.lists.removeByRelRankRangeToEnd(
              exp.binList('tags'),
              exp.int(1),
              exp.str('blue')),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: ['blue'] })
      })

      it('removes list item by value relative rank range to end in a cdt context', async function () {
        const key = await createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })
        const context = new Context().addListIndex(2)
        const ops = [
          exp.operations.write('tags',
            exp.lists.removeByRelRankRangeToEnd(
              exp.binList('tags'),
              exp.int(1),
              exp.str('orange'),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: ['blue', 'green', ['orange', 'black']] })
      })
    })

    describe('removeByRelRankRange', function () {
      it('removes list item by value relative rank range', async function () {
        const key = await createRecord({ tags: ['blue', 'green', 'yellow'] })

        const ops = [
          exp.operations.write('tags',
            exp.lists.removeByRelRankRange(
              exp.binList('tags'),
              exp.int(1),
              exp.int(-1),
              exp.str('green')),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: ['green', 'yellow'] })
      })

      it('removes list item by value relative rank range in a cdt context', async function () {
        const key = await createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })
        const context = new Context().addListIndex(2)
        const ops = [
          exp.operations.write('tags',
            exp.lists.removeByRelRankRange(
              exp.binList('tags'),
              exp.int(1),
              exp.int(-1),
              exp.str('pink'),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: ['blue', 'green', ['pink', 'white', 'black']] })
      })
    })

    describe('removeByIndex', function () {
      it('removes a list item by index', async function () {
        const key = await createRecord({ tags: ['blue', 'green', 'yellow'] })
        const ops = [
          exp.operations.write('tags',
            exp.lists.removeByIndex(
              exp.binList('tags'),
              exp.int(1)),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})
        expect(result.bins).to.eql({ tags: ['blue', 'yellow'] })
      })

      it('removes a list item by index in a cdt context in a cdt context', async function () {
        const key = await createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })
        const context = new Context().addListIndex(2)
        const ops = [
          exp.operations.write('tags',
            exp.lists.removeByIndex(
              exp.binList('tags'),
              exp.int(1),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})
        expect(result.bins).to.eql({ tags: ['blue', 'green', ['orange', 'white', 'black']] })
      })
    })

    describe('removeByIndexRangeToEnd', function () {
      it('removes a list item by index range to end', async function () {
        const key = await createRecord({ tags: ['blue', 'green', 'yellow'] })

        const ops = [
          exp.operations.write('tags',
            exp.lists.removeByIndexRangeToEnd(
              exp.binList('tags'),
              exp.int(1)),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: ['blue'] })
      })

      it('removes a list item by index range to end in a cdt context in a cdt context', async function () {
        const key = await createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })
        const context = new Context().addListIndex(2)
        const ops = [
          exp.operations.write('tags',
            exp.lists.removeByIndexRangeToEnd(
              exp.binList('tags'),
              exp.int(1),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: ['blue', 'green', ['orange']] })
      })
    })

    describe('removeByIndexRange', function () {
      it('removes a list item by index range', async function () {
        const key = await createRecord({ tags: ['blue', 'green', 'yellow'] })

        const ops = [
          exp.operations.write('tags',
            exp.lists.removeByIndexRange(
              exp.binList('tags'),
              exp.int(2),
              exp.int(0)),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: ['yellow'] })
      })

      it('removes a list item by index range in a cdt context', async function () {
        const key = await createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })
        const context = new Context().addListIndex(2)
        const ops = [
          exp.operations.write('tags',
            exp.lists.removeByIndexRange(
              exp.binList('tags'),
              exp.int(2),
              exp.int(0),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: ['blue', 'green', ['white', 'black']] })
      })
    })

    describe('removeByRank', function () {
      it('removes a list item by rank', async function () {
        const key = await createRecord({ tags: ['yellow', 'green', 'blue'] })

        const ops = [
          exp.operations.write('tags',
            exp.lists.removeByRank(
              exp.binList('tags'),
              exp.int(2)),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: ['green', 'blue'] })
      })

      it('removes a list item by rank in a cdt context', async function () {
        const key = await createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })
        const context = new Context().addListIndex(2)
        const ops = [
          exp.operations.write('tags',
            exp.lists.removeByRank(
              exp.binList('tags'),
              exp.int(2),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: ['blue', 'green', ['orange', 'white', 'black']] })
      })
    })

    describe('removeByRankRangeToEnd', function () {
      it('removes a list item by rank range to end', async function () {
        const key = await createRecord({ tags: ['yellow', 'green', 'blue'] })

        const ops = [
          exp.operations.write('tags',
            exp.lists.removeByRankRangeToEnd(
              exp.binList('tags'),
              exp.int(1)),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: ['blue'] })
      })

      it('removes a list item by rank range to end in a cdt context', async function () {
        const key = await createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })
        const context = new Context().addListIndex(2)
        const ops = [
          exp.operations.write('tags',
            exp.lists.removeByRankRangeToEnd(
              exp.binList('tags'),
              exp.int(1),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: ['blue', 'green', ['black']] })
      })
    })

    describe('removeByRankRange', function () {
      it('removes a list item by rank range', async function () {
        const key = await createRecord({ tags: ['yellow', 'green', 'blue'] })

        const ops = [
          exp.operations.write('tags',
            exp.lists.removeByRankRange(
              exp.binList('tags'),
              exp.int(2),
              exp.int(0)),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: ['yellow'] })
      })

      it('removes a list item by rank range in a cdt context', async function () {
        const key = await createRecord({ tags: ['blue', 'green', ['orange', 'pink', 'white', 'black']] })
        const context = new Context().addListIndex(2)
        const ops = [
          exp.operations.write('tags',
            exp.lists.removeByRankRange(
              exp.binList('tags'),
              exp.int(2),
              exp.int(0),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: ['blue', 'green', ['pink', 'white']] })
      })
    })

    describe('getByValue', function () {
      it('matches the count of the matched list values', async function () {
        const key = await createRecord({ tags: ['blue', 'green', 'yellow', 'green'] })

        await testNoMatch(key, exp.eq(exp.lists.getByValue(exp.binList('tags'), exp.str('green'), lists.returnType.COUNT), exp.int(1)))
        await testMatch(key, exp.eq(exp.lists.getByValue(exp.binList('tags'), exp.str('green'), lists.returnType.COUNT), exp.int(2)))
      })
    })

    describe('getByValue with context', function () {
      it('matches the count of the matched list values', async function () {
        const key = await createRecord({ tags: ['blue', 'green', 'yellow', 'green', ['orange', 'pink', 'white', 'black', 'pink']] })
        const context = new Context().addListIndex(4)
        await testNoMatch(key, exp.eq(exp.lists.getByValue(exp.binList('tags'), exp.str('pink'), lists.returnType.COUNT, context), exp.int(1)))
        await testMatch(key, exp.eq(exp.lists.getByValue(exp.binList('tags'), exp.str('pink'), lists.returnType.COUNT, context), exp.int(2)))
      })
    })

    describe('getByValueRange', function () {
      it('matches the count of the matched range of list values', async function () {
        const key = await createRecord({ values: [53, 16, 94, 38, 25, 88, 48] })

        await testNoMatch(key, exp.eq(exp.lists.getByValueRange(exp.binList('values'), exp.int(25), exp.int(50), lists.returnType.COUNT), exp.int(1)))
        await testMatch(key, exp.eq(exp.lists.getByValueRange(exp.binList('values'), exp.int(25), exp.int(50), lists.returnType.COUNT), exp.int(3)))
      })
    })

    describe('getByValueRange with context', function () {
      it('matches the count of the matched range of list values', async function () {
        const key = await createRecord({ values: [53, 16, 94, 38, 25, 88, 48, [1, 92, 94, 96]] })
        const context = new Context().addListIndex(7)
        await testNoMatch(key, exp.eq(exp.lists.getByValueRange(exp.binList('values'), exp.int(90), exp.int(99), lists.returnType.COUNT, context), exp.int(1)))
        await testMatch(key, exp.eq(exp.lists.getByValueRange(exp.binList('values'), exp.int(90), exp.int(99), lists.returnType.COUNT, context), exp.int(3)))
      })
    })

    describe('getByValueList', function () {
      it('matches the count of the matched values', async function () {
        const key = await createRecord({ values: [53, 16, 94, 38, 25, 88, 88, 48, 16] })

        await testNoMatch(key, exp.eq(exp.lists.getByValueList(exp.binList('values'), exp.list([88, 94]), lists.returnType.COUNT), exp.int(2)))
        await testMatch(key, exp.eq(exp.lists.getByValueList(exp.binList('values'), exp.list([88, 94]), lists.returnType.COUNT), exp.int(3)))
      })
    })

    describe('getByValueList with context', function () {
      it('matches the count of the matched values', async function () {
        const key = await createRecord({ values: [53, 16, 94, 38, 25, 88, 88, 48, 16, [0, 1, 2, 73, 74, 73, 74]] })
        const context = new Context().addListIndex(9)
        await testNoMatch(key, exp.eq(exp.lists.getByValueList(exp.binList('values'), exp.list([73, 74]), lists.returnType.COUNT, context), exp.int(2)))
        await testMatch(key, exp.eq(exp.lists.getByValueList(exp.binList('values'), exp.list([73, 74]), lists.returnType.COUNT, context), exp.int(4)))
      })
    })

    describe('getByRelRankRangeToEnd', function () {
      it('selects list items nearest to value and greater by relative rank', async function () {
        const key = await createRecord({ values: [53, 16, 94, 38, 25, 88, 88, 48, 16] })

        await testNoMatch(key, exp.eq(exp.lists.getByRelRankRangeToEnd(exp.binList('values'), exp.int(38), exp.int(1), lists.returnType.VALUE), exp.list([38, 48, 53, 88, 88, 94])))
        await testMatch(key, exp.eq(exp.lists.getByRelRankRangeToEnd(exp.binList('values'), exp.int(38), exp.int(1), lists.returnType.VALUE), exp.list([48, 53, 88, 88, 94])))
      })
    })

    describe('getByRelRankRangeToEnd with context', function () {
      it('selects list items nearest to value and greater by relative rank', async function () {
        const key = await createRecord({ values: [53, 16, [2, 12, 14, 17]] })
        const context = new Context().addListIndex(2)
        await testNoMatch(key, exp.eq(exp.lists.getByRelRankRangeToEnd(exp.binList('values'), exp.int(12), exp.int(1), lists.returnType.VALUE, context), exp.list([16, 53])))
        await testMatch(key, exp.eq(exp.lists.getByRelRankRangeToEnd(exp.binList('values'), exp.int(12), exp.int(1), lists.returnType.VALUE, context), exp.list([14, 17])))
      })
    })

    describe('getByRelRankRange', function () {
      it('selects list items nearest to value and greater by relative rank with a count limit', async function () {
        const key = await createRecord({ values: [53, 16, 94, 38, 25, 88, 88, 48, 16] })

        await testNoMatch(key, exp.eq(exp.lists.getByRelRankRange(exp.binList('values'), exp.int(38), exp.int(1), exp.int(3), lists.returnType.VALUE), exp.list([38, 48, 53])))
        await testMatch(key, exp.eq(exp.lists.getByRelRankRange(exp.binList('values'), exp.int(38), exp.int(1), exp.int(3), lists.returnType.VALUE), exp.list([48, 53, 88])))
      })
    })

    describe('getByRelRankRange with context', function () {
      it('selects list items nearest to value and greater by relative rank with a count limit', async function () {
        const key = await createRecord({ values: [53, 16, 94, [30, 40, 45, 20]] })
        const context = new Context().addListIndex(3)
        await testNoMatch(key, exp.eq(exp.lists.getByRelRankRange(exp.binList('values'), exp.int(30), exp.int(1), exp.int(3), lists.returnType.VALUE, context), exp.list([94])))
        await testMatch(key, exp.eq(exp.lists.getByRelRankRange(exp.binList('values'), exp.int(30), exp.int(1), exp.int(3), lists.returnType.VALUE, context), exp.list([40, 45])))
      })
    })

    describe('getByIndex', function () {
      it('selects item identified by index', async function () {
        const key = await createRecord({ values: ['Singapore', 'Hamburg', 'San Francisco', 'Tokyo'] })

        await testNoMatch(key, exp.eq(exp.lists.getByIndex(exp.binList('values'), exp.int(2), exp.type.STR, lists.returnType.VALUE), exp.str('Hamburg')))
        await testMatch(key, exp.eq(exp.lists.getByIndex(exp.binList('values'), exp.int(2), exp.type.STR, lists.returnType.VALUE), exp.str('San Francisco')))
      })
    })

    describe('getByIndex with context', function () {
      it('selects item identified by index within nested context', async function () {
        const key = await createRecord({ values: ['Singapore', 'Hamburg', 'San Francisco', 'Tokyo', ['Firth', 'Hickman', 'Palmyra']] })
        const context = new Context().addListIndex(4)
        await testNoMatch(key, exp.eq(exp.lists.getByIndex(exp.binList('values'), exp.int(2), exp.type.STR, lists.returnType.VALUE, context), exp.str('San Francisco')))
        await testMatch(key, exp.eq(exp.lists.getByIndex(exp.binList('values'), exp.int(2), exp.type.STR, lists.returnType.VALUE, context), exp.str('Palmyra')))
      })
    })

    describe('getByIndexRangeToEnd', function () {
      it('selects list items starting at specified index to the end of the list', async function () {
        const key = await createRecord({ values: ['Singapore', 'Hamburg', 'San Francisco', 'Tokyo'] })

        await testNoMatch(key, exp.eq(exp.lists.getByIndexRangeToEnd(exp.binList('values'), exp.int(2), lists.returnType.VALUE), exp.list(['Hamburg', 'San Francisco'])))
        await testMatch(key, exp.eq(exp.lists.getByIndexRangeToEnd(exp.binList('values'), exp.int(2), lists.returnType.VALUE), exp.list(['San Francisco', 'Tokyo'])))
      })
    })

    describe('getByIndexRangeToEnd with context', function () {
      it('selects list items starting at specified index to the end of the list', async function () {
        const key = await createRecord({ values: ['Singapore', 'Hamburg', 'San Francisco', 'Tokyo', ['Firth', 'Hickman', 'Palmyra']] })
        const context = new Context().addListIndex(4)
        await testNoMatch(key, exp.eq(exp.lists.getByIndexRangeToEnd(exp.binList('values'), exp.int(1), lists.returnType.VALUE, context), exp.list(['Hamburg', 'San Francisco', 'Tokyo'])))
        await testMatch(key, exp.eq(exp.lists.getByIndexRangeToEnd(exp.binList('values'), exp.int(1), lists.returnType.VALUE, context), exp.list(['Hickman', 'Palmyra'])))
      })
    })

    describe('getByIndexRange', function () {
      it('selects "count" list items starting at specified index', async function () {
        const key = await createRecord({ values: ['Singapore', 'Hamburg', 'San Francisco', 'Tokyo'] })

        await testNoMatch(key, exp.eq(exp.lists.getByIndexRange(exp.binList('values'), exp.int(2), exp.int(1), lists.returnType.VALUE), exp.list(['Hamburg'])))
        await testMatch(key, exp.eq(exp.lists.getByIndexRange(exp.binList('values'), exp.int(2), exp.int(1), lists.returnType.VALUE), exp.list(['San Francisco'])))
      })
    })

    describe('getByIndexRange with context', function () {
      it('selects "count" list items starting at specified index', async function () {
        const key = await createRecord({ values: ['Singapore', 'Hamburg', 'San Francisco', 'Tokyo', ['Firth', 'Hickman', 'Palmyra']] })
        const context = new Context().addListIndex(4)
        await testNoMatch(key, exp.eq(exp.lists.getByIndexRange(exp.binList('values'), exp.int(0), exp.int(2), lists.returnType.VALUE, context), exp.list(['Singapore', 'Hamburg'])))
        await testMatch(key, exp.eq(exp.lists.getByIndexRange(exp.binList('values'), exp.int(0), exp.int(2), lists.returnType.VALUE, context), exp.list(['Firth', 'Hickman'])))
      })
    })

    describe('getByRank', function () {
      it('selects list item identified by rank', async function () {
        const key = await createRecord({ values: [83, 39, 49, 20, 42, 41, 98] })

        await testNoMatch(key, exp.eq(exp.lists.getByRank(exp.binList('values'), exp.int(2), exp.type.INT, lists.returnType.VALUE), exp.int(42)))
        await testMatch(key, exp.eq(exp.lists.getByRank(exp.binList('values'), exp.int(2), exp.type.INT, lists.returnType.VALUE), exp.int(41)))
      })
    })

    describe('getByRank with context', function () {
      it('selects list item identified by rank', async function () {
        const key = await createRecord({ values: [83, [0, 4, 2, 8], 40] })
        const context = new Context().addListIndex(1)
        await testNoMatch(key, exp.eq(exp.lists.getByRank(exp.binList('values'), exp.int(2), exp.type.INT, lists.returnType.VALUE, context), exp.int(40)))
        await testMatch(key, exp.eq(exp.lists.getByRank(exp.binList('values'), exp.int(2), exp.type.INT, lists.returnType.VALUE, context), exp.int(4)))
      })
    })

    describe('getByRankRangeToEnd', function () {
      it('selects list items starting at specified rank to the last ranked item', async function () {
        const key = await createRecord({ values: [83, 39, 49, 20, 42, 41, 98] })

        await testNoMatch(key, exp.eq(exp.lists.getByRankRangeToEnd(exp.binList('values'), exp.int(2), lists.returnType.VALUE), exp.list([39, 41, 42, 49, 83, 98])))
        await testMatch(key, exp.eq(exp.lists.getByRankRangeToEnd(exp.binList('values'), exp.int(2), lists.returnType.VALUE), exp.list([41, 42, 49, 83, 98])))
      })
    })

    describe('getByRankRangeToEnd with context', function () {
      it('selects list items starting at specified rank to the last ranked item', async function () {
        const key = await createRecord({ values: [83, [0, 4, 2, 8]] })
        const context = new Context().addListIndex(1)
        await testNoMatch(key, exp.eq(exp.lists.getByRankRangeToEnd(exp.binList('values'), exp.int(1), lists.returnType.VALUE, context), exp.list([0, 2, 4, 8])))
        await testMatch(key, exp.eq(exp.lists.getByRankRangeToEnd(exp.binList('values'), exp.int(1), lists.returnType.VALUE, context), exp.list([2, 4, 8])))
      })
    })

    describe('getByRankRange', function () {
      it('selects "count" list items starting at specified rank', async function () {
        const key = await createRecord({ values: [83, 39, 49, 20, 42, 41, 98] })

        await testNoMatch(key, exp.eq(exp.lists.getByRankRange(exp.binList('values'), exp.int(2), exp.int(2), lists.returnType.VALUE), exp.list([39, 41, 42])))
        await testMatch(key, exp.eq(exp.lists.getByRankRange(exp.binList('values'), exp.int(2), exp.int(2), lists.returnType.VALUE), exp.list([42, 41])))
      })
    })

    describe('getByRankRange with context', function () {
      it('selects "count" list items starting at specified rank', async function () {
        const key = await createRecord({ values: [83, [0, 4, 2, 8]] })
        const context = new Context().addListIndex(1)
        await testNoMatch(key, exp.eq(exp.lists.getByRankRange(exp.binList('values'), exp.int(1), exp.int(4), lists.returnType.VALUE, context), exp.list([83, [0, 4, 2, 8]])))
        await testMatch(key, exp.eq(exp.lists.getByRankRange(exp.binList('values'), exp.int(1), exp.int(4), lists.returnType.VALUE, context), exp.list([2, 4, 8])))
      })
    })

    describe('list bin append expression', function () {
      it('appends integer value to list', async function () {
        const key = await createRecord({ list: [2, 3, 4, 5], intVal: 6 })
        const ops = [
          exp.operations.read(tempBin,
            exp.lists.append(exp.binList('list'), exp.binInt('intVal')),
            0),
          op.read('list')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins.list).to.eql([2, 3, 4, 5])
        expect(result.bins.ExpVar).to.eql([2, 3, 4, 5, 6])
      })

      it('appends integer value to a list within a nested context', async function () {
        const key = await createRecord({ list: [2, 3, 4, 5, [4]], intVal: 6 })
        const context = new Context().addListIndex(4)
        const ops = [
          exp.operations.read(tempBin,
            exp.lists.append(exp.binList('list'), exp.binInt('intVal'), null, context),
            0),
          op.read('list')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins.list).to.eql([2, 3, 4, 5, [4]])
        expect(result.bins.ExpVar).to.eql([2, 3, 4, 5, [4, 6]])
      })
    })

    describe('list bin appendItems expression', function () {
      it('appends list to itself', async function () {
        const key = await createRecord({ list: [2, 3, 4, 5] })
        const ops = [
          exp.operations.read(tempBin,
            exp.lists.appendItems(exp.binList('list'), exp.binList('list')),
            0),
          op.read('list')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins.list).to.eql([2, 3, 4, 5])
        expect(result.bins.ExpVar).to.eql([2, 3, 4, 5, 2, 3, 4, 5])
      })

      it('appends list to a list within a nested context', async function () {
        const key = await createRecord({ list: [2, 3, 4, 5, [80, 90, 100]] })
        const context = new Context().addListIndex(4)
        const ops = [
          exp.operations.read(tempBin,
            exp.lists.appendItems(exp.binList('list'), exp.binList('list'), null, context),
            0),
          op.read('list')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins.list).to.eql([2, 3, 4, 5, [80, 90, 100]])
        expect(result.bins.ExpVar).to.eql([2, 3, 4, 5, [80, 90, 100, 2, 3, 4, 5, [80, 90, 100]]])
      })
    })
  })
  describe('list bin insert expression', function () {
    it('inserts value at specified index', async function () {
      const key = await createRecord({ list: [2, 3, 4, 5], intVal: 6 })
      const ops = [
        exp.operations.read(tempBin,
          exp.lists.insert(exp.binList('list'), exp.binInt('intVal'), exp.int(2)),
          0),
        op.read('list')
      ]
      const result = await client.operate(key, ops, {})

      expect(result.bins.list).to.eql([2, 3, 4, 5])
      expect(result.bins.ExpVar).to.eql([2, 3, 6, 4, 5])
    })

    it('inserts value at specified index within a nested context', async function () {
      const key = await createRecord({ list: [2, 3, 4, 5, [4, 1, 9]], intVal: 7 })
      const context = new Context().addListIndex(4)
      const ops = [
        exp.operations.read(tempBin,
          exp.lists.insert(exp.binList('list'), exp.binInt('intVal'), exp.int(2), null, context),
          0),
        op.read('list')
      ]
      const result = await client.operate(key, ops, {})

      expect(result.bins.list).to.eql([2, 3, 4, 5, [4, 1, 9]])
      expect(result.bins.ExpVar).to.eql([2, 3, 4, 5, [4, 1, 7, 9]])
    })
  })
  describe('list bin insertItems expression', function () {
    it('inserts values at specified index', async function () {
      const key = await createRecord({ list: [2, 3, 4, 5] })
      const ops = [
        exp.operations.read(tempBin,
          exp.lists.insertItems(exp.binList('list'), exp.binList('list'), exp.int(1)),
          0),
        op.read('list')
      ]
      const result = await client.operate(key, ops, {})

      expect(result.bins.list).to.eql([2, 3, 4, 5])
      expect(result.bins.ExpVar).to.eql([2, 2, 3, 4, 5, 3, 4, 5])
    })

    it('inserts values at specified index within a nested context', async function () {
      const key = await createRecord({ list: [2, 3, [9, 9]] })
      const context = new Context().addListIndex(2)
      const ops = [
        exp.operations.read(tempBin,
          exp.lists.insertItems(exp.binList('list'), exp.binList('list'), exp.int(1), null, context),
          0),
        op.read('list')
      ]
      const result = await client.operate(key, ops, {})

      expect(result.bins.list).to.eql([2, 3, [9, 9]])
      expect(result.bins.ExpVar).to.eql([2, 3, [9, 2, 3, [9, 9], 9]])
    })
  })

  describe('list bin sort expression', function () {
    it('sorts specified list', async function () {
      const key = await createRecord({ list: [2, 3, 4, 5] })
      const ops = [
        exp.operations.write('list',
          exp.lists.insertItems(exp.binList('list'), exp.binList('list'), exp.int(1)),
          0),
        exp.operations.read(tempBin,
          exp.lists.sort(exp.binList('list'), 1),
          0),
        op.read('list')
      ]
      const result = await client.operate(key, ops, {})

      expect(result.bins.ExpVar).to.eql([5, 5, 4, 4, 3, 3, 2, 2])
      expect(result.bins.list).to.eql([2, 2, 3, 4, 5, 3, 4, 5])
    })

    it('sorts specified nested list', async function () {
      const key = await createRecord({ list: [2, 3, 4, 5, [9, 100]] })
      const context = new Context().addListIndex(4)
      const ops = [
        exp.operations.read(tempBin,
          exp.lists.sort(exp.binList('list'), 1, context),
          0),
        op.read('list')
      ]
      const result = await client.operate(key, ops, {})

      expect(result.bins.ExpVar).to.eql([2, 3, 4, 5, [100, 9]])
      expect(result.bins.list).to.eql([2, 3, 4, 5, [9, 100]])
    })
  })
})

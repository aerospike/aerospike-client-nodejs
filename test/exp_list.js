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
const op = Aerospike.operations
const lists = Aerospike.lists

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

    describe('list bin append expression', function () {
      it('evaluates exp list append to true if exp op read temp bin equals to appended list', async function () {
        const key = await createRecord({ list: [2, 3, 4, 5], intVal: 6 })
        const ops = [
          exp.operations.read(tempBin,
            exp.lists.append(exp.binList('list'), exp.binInt('intVal')),
            0),
          op.read('list')
        ]
        const result = await client.operate(key, ops, {})
        // console.log(result)
        expect(result.bins.list).to.eql([2, 3, 4, 5])
        expect(result.bins.ExpVar).to.eql([2, 3, 4, 5, 6])
      })
    })
    describe('list bin appendItems expression', function () {
      it('evaluates exp list appendItems to true if exp op read temp bin equals to appended list', async function () {
        const key = await createRecord({ list: [2, 3, 4, 5] })
        const ops = [
          exp.operations.read(tempBin,
            exp.lists.appendItems(exp.binList('list'), exp.binList('list')),
            0),
          op.read('list')
        ]
        const result = await client.operate(key, ops, {})
        // console.log(result)
        expect(result.bins.list).to.eql([2, 3, 4, 5])
        expect(result.bins.ExpVar).to.eql([2, 3, 4, 5, 2, 3, 4, 5])
      })
    })
  })
  describe('list bin insert expression', function () {
    it('evaluates exp list insert to true if exp op read temp bin equals to inserted list', async function () {
      const key = await createRecord({ list: [2, 3, 4, 5], intVal: 6 })
      const ops = [
        exp.operations.read(tempBin,
          exp.lists.insert(exp.binList('list'), exp.binInt('intVal'), exp.int(2)),
          0),
        op.read('list')
      ]
      const result = await client.operate(key, ops, {})
      // console.log(result)
      expect(result.bins.list).to.eql([2, 3, 4, 5])
      expect(result.bins.ExpVar).to.eql([2, 3, 6, 4, 5])
    })
  })
  describe('list bin insertItems expression', function () {
    it('evaluates exp list appendItems to true if exp op read temp bin equals to appended list', async function () {
      const key = await createRecord({ list: [2, 3, 4, 5] })
      const ops = [
        exp.operations.read(tempBin,
          exp.lists.insertItems(exp.binList('list'), exp.binList('list'), exp.int(1)),
          0),
        op.read('list')
      ]
      const result = await client.operate(key, ops, {})
      // console.log(result)
      expect(result.bins.list).to.eql([2, 3, 4, 5])
      expect(result.bins.ExpVar).to.eql([2, 2, 3, 4, 5, 3, 4, 5])
    })
  })
  describe('list bin sort expression', function () {
    it('evaluates exp list sort to true if exp op read temp bin equals to sorted list', async function () {
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
      // console.log(result)
      expect(result.bins.ExpVar).to.eql([5, 5, 4, 4, 3, 3, 2, 2])
      expect(result.bins.list).to.eql([2, 2, 3, 4, 5, 3, 4, 5])
    })
  })
})

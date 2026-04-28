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

    describe('removeByKey', function () {
      it('removes map item by key', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByKey(
              exp.binMap('tags'),
              exp.str('a')),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { b: 'green', c: 'yellow' } })
      })

      it('removes map item by key in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByKey(
              exp.binMap('tags'),
              exp.str('e'),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', f: 'white', g: 'black' } } })
      })
    })

    describe('removeByKeyList', function () {
      it('removes map item by key list', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByKeyList(
              exp.binMap('tags'),
              exp.list(['a', 'b'])),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { c: 'yellow' } })
      })

      it('removes map item by key list in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByKeyList(
              exp.binMap('tags'),
              exp.list(['d', 'e']),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { f: 'white', g: 'black' } } })
      })
    })

    describe('removeByKeyRange', function () {
      it('removes map item by key range', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByKeyRange(
              exp.binMap('tags'),
              exp.str('c'),
              exp.str('a')),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { c: 'yellow' } })
      })

      it('removes map item by key range in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByKeyRange(
              exp.binMap('tags'),
              exp.str('h'),
              exp.str('e'),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange' } } })
      })

      it('removes inverted map item by key range', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByKeyRange(
              exp.binMap('tags'),
              exp.str('c'),
              exp.str('a'),
              null,
              maps.returnType.INVERTED),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', b: 'green' } })
      })

      it('removes inverted map item by key range in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByKeyRange(
              exp.binMap('tags'),
              exp.str('h'),
              exp.str('e'),
              context,
              maps.returnType.INVERTED),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { e: 'pink', f: 'white', g: 'black' } } })
      })
    })

    describe('removeByKeyRelIndexRangeToEnd', function () {
      it('removes map item by key relative index range to end', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByKeyRelIndexRangeToEnd(
              exp.binMap('tags'),
              exp.int(1),
              exp.str('b')),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', b: 'green' } })
      })

      it('removes map item by key relative index range to end in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByKeyRelIndexRangeToEnd(
              exp.binMap('tags'),
              exp.int(1),
              exp.str('e'),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink' } } })
      })

      it('removes inverted map item by key relative index range to end', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByKeyRelIndexRangeToEnd(
              exp.binMap('tags'),
              exp.int(1),
              exp.str('b'),
              null,
              maps.returnType.INVERTED),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { c: 'yellow' } })
      })

      it('removes inverted map item by key relative index range to end in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByKeyRelIndexRangeToEnd(
              exp.binMap('tags'),
              exp.int(1),
              exp.str('e'),
              context,
              maps.returnType.INVERTED),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { f: 'white', g: 'black' } } })
      })
    })

    describe('removeByKeyRelIndexRange', function () {
      it('removes map item by key relative index range', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByKeyRelIndexRange(
              exp.binMap('tags'),
              exp.int(2),
              exp.int(0),
              exp.str('a')),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { c: 'yellow' } })
      })

      it('removes map item by key relative index range in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByKeyRelIndexRange(
              exp.binMap('tags'),
              exp.int(2),
              exp.int(0),
              exp.str('d'),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { f: 'white', g: 'black' } } })
      })

      it('removes inverted map item by key relative index range', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByKeyRelIndexRange(
              exp.binMap('tags'),
              exp.int(2),
              exp.int(0),
              exp.str('a'),
              null,
              maps.returnType.INVERTED),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', b: 'green' } })
      })

      it('removes inverted map item by key relative index range in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByKeyRelIndexRange(
              exp.binMap('tags'),
              exp.int(2),
              exp.int(0),
              exp.str('a'),
              context,
              maps.returnType.INVERTED),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink' } } })
      })
    })

    describe('removeByValue', function () {
      it('removes map item by value', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByValue(
              exp.binMap('tags'),
              exp.str('green')),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', c: 'yellow' } })
      })

      it('removes map item by value in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByValue(
              exp.binMap('tags'),
              exp.str('white'),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', g: 'black' } } })
      })
    })

    describe('removeByValueList', function () {
      it('removes map item by value list', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByValueList(
              exp.binMap('tags'),
              exp.list(['green', 'yellow'])),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue' } })
      })

      it('removes map item by value list in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByValueList(
              exp.binMap('tags'),
              exp.list(['orange', 'white']),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { e: 'pink', g: 'black' } } })
      })
    })

    describe('removeByValueRange', function () {
      it('removes map item by value range', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByValueRange(
              exp.binMap('tags'),
              exp.str('green'),
              exp.str('blue')),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { b: 'green', c: 'yellow' } })
      })

      it('removes map item by value range in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByValueRange(
              exp.binMap('tags'),
              exp.str('pink'),
              exp.str('black'),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { e: 'pink', f: 'white' } } })
      })

      it('removes inverted map item by value range', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByValueRange(
              exp.binMap('tags'),
              exp.str('green'),
              exp.str('blue'),
              null,
              maps.returnType.INVERTED),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue' } })
      })

      it('removes inverted map item by value range in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByValueRange(
              exp.binMap('tags'),
              exp.str('pink'),
              exp.str('black'),
              context,
              maps.returnType.INVERTED),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', g: 'black' } } })
      })
    })

    describe('removeByValueRelRankRangeToEnd', function () {
      it('removes map item by value relative rank range to end', async function () {
        const key = await createRecord({ tags: { a: 'yellow', b: 'green', c: 'blue' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByValueRelRankRangeToEnd(
              exp.binMap('tags'),
              exp.int(1),
              exp.str('blue')),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { c: 'blue' } })
      })

      it('removes map item by value relative rank range to end in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByValueRelRankRangeToEnd(
              exp.binMap('tags'),
              exp.int(1),
              exp.str('orange'),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', g: 'black' } } })
      })

      it('removes inverted map item by value relative rank range to end', async function () {
        const key = await createRecord({ tags: { a: 'yellow', b: 'green', c: 'blue' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByValueRelRankRangeToEnd(
              exp.binMap('tags'),
              exp.int(1),
              exp.str('blue'),
              null,
              maps.returnType.INVERTED),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'yellow', b: 'green' } })
      })

      it('removes inverted map item by value relative rank range to end in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByValueRelRankRangeToEnd(
              exp.binMap('tags'),
              exp.int(1),
              exp.str('black'),
              context,
              maps.returnType.INVERTED),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white' } } })
      })
    })

    describe('removeByValueRelRankRange', function () {
      it('removes map item by value relative rank range', async function () {
        const key = await createRecord({ tags: { a: 'yellow', b: 'green', c: 'blue' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByValueRelRankRange(
              exp.binMap('tags'),
              exp.int(1),
              exp.int(-1),
              exp.str('green')),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'yellow', b: 'green' } })
      })

      it('removes map item by value relative rank range in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByValueRelRankRange(
              exp.binMap('tags'),
              exp.int(1),
              exp.int(-1),
              exp.str('pink'),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { e: 'pink', f: 'white', g: 'black' } } })
      })

      it('removes inverted map item by value relative rank range', async function () {
        const key = await createRecord({ tags: { a: 'yellow', b: 'green', c: 'blue' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByValueRelRankRange(
              exp.binMap('tags'),
              exp.int(1),
              exp.int(-1),
              exp.str('green'),
              null,
              maps.returnType.INVERTED),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { c: 'blue' } })
      })

      it('removes inverted map item by value relative rank range in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByValueRelRankRange(
              exp.binMap('tags'),
              exp.int(1),
              exp.int(-1),
              exp.str('pink'),
              context,
              maps.returnType.INVERTED),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange' } } })
      })
    })

    describe('removeByIndex', function () {
      it('removes a map item by index', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByIndex(
              exp.binMap('tags'),
              exp.int(1)),
            0),
          op.read('tags')
        ]
        let result = await client.operate(key, ops, {})
        result = await client.get(key)
        expect(result.bins).to.eql({ tags: { a: 'blue', c: 'yellow' } })
      })

      it('removes a map item by index in a cdt context in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByIndex(
              exp.binMap('tags'),
              exp.int(1),
              context),
            0),
          op.read('tags')
        ]
        let result = await client.operate(key, ops, {})
        result = await client.get(key)
        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', f: 'white', g: 'black' } } })
      })
    })

    describe('removeByIndexRangeToEnd', function () {
      it('removes a map item by index range to end', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByIndexRangeToEnd(
              exp.binMap('tags'),
              exp.int(1)),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue' } })
      })

      it('removes a map item by index range to end in a cdt context in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByIndexRangeToEnd(
              exp.binMap('tags'),
              exp.int(1),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange' } } })
      })

      it('removes an inverted map item by index range to end', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByIndexRangeToEnd(
              exp.binMap('tags'),
              exp.int(1),
              null,
              maps.returnType.INVERTED),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { b: 'green', c: 'yellow' } })
      })

      it('removes an inverted map item by index range to end in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByIndexRangeToEnd(
              exp.binMap('tags'),
              exp.int(1),
              context,
              maps.returnType.INVERTED),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { e: 'pink', f: 'white', g: 'black' } } })
      })
    })

    describe('removeByIndexRange', function () {
      it('removes a map item by index range', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByIndexRange(
              exp.binMap('tags'),
              exp.int(2),
              exp.int(0)),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { c: 'yellow' } })
      })

      it('removes a map item by index range in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByIndexRange(
              exp.binMap('tags'),
              exp.int(2),
              exp.int(0),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { f: 'white', g: 'black' } } })
      })

      it('removes a inverted map item by index range', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByIndexRange(
              exp.binMap('tags'),
              exp.int(2),
              exp.int(0),
              null,
              maps.returnType.INVERTED),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', b: 'green' } })
      })

      it('removes a inverted map item by index range in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByIndexRange(
              exp.binMap('tags'),
              exp.int(2),
              exp.int(0),
              context,
              maps.returnType.INVERTED),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink' } } })
      })
    })

    describe('removeByRank', function () {
      it('removes a map item by rank', async function () {
        const key = await createRecord({ tags: { a: 'yellow', b: 'green', c: 'blue' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByRank(
              exp.binMap('tags'),
              exp.int(2)),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { b: 'green', c: 'blue' } })
      })

      it('removes a map item by rank in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByRank(
              exp.binMap('tags'),
              exp.int(2),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', f: 'white', g: 'black' } } })
      })
    })

    describe('removeByRankRangeToEnd', function () {
      it('removes a map item by rank range to end', async function () {
        const key = await createRecord({ tags: { a: 'yellow', b: 'green', c: 'blue' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByRankRangeToEnd(
              exp.binMap('tags'),
              exp.int(1)),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { c: 'blue' } })
      })

      it('removes a map item by rank range to end in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByRankRangeToEnd(
              exp.binMap('tags'),
              exp.int(1),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { g: 'black' } } })
      })

      it('removes an inverted map item by rank range to end', async function () {
        const key = await createRecord({ tags: { a: 'yellow', b: 'green', c: 'blue' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByRankRangeToEnd(
              exp.binMap('tags'),
              exp.int(1),
              null,
              maps.returnType.INVERTED),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'yellow', b: 'green' } })
      })

      it('removes an inverted map item by rank range to end in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByRankRangeToEnd(
              exp.binMap('tags'),
              exp.int(1),
              context,
              maps.returnType.INVERTED),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white' } } })
      })
    })

    describe('removeByRankRange', function () {
      it('removes a map item by rank range', async function () {
        const key = await createRecord({ tags: { a: 'yellow', b: 'green', c: 'blue' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByRankRange(
              exp.binMap('tags'),
              exp.int(2),
              exp.int(0)),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'yellow' } })
      })

      it('removes a map item by rank range in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByRankRange(
              exp.binMap('tags'),
              exp.int(2),
              exp.int(0),
              context),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { e: 'pink', f: 'white' } } })
      })

      it('removes an inverted map item by rank range', async function () {
        const key = await createRecord({ tags: { a: 'yellow', b: 'green', c: 'blue' } })

        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByRankRange(
              exp.binMap('tags'),
              exp.int(2),
              exp.int(0),
              null,
              maps.returnType.INVERTED),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { b: 'green', c: 'blue' } })
      })

      it('removes an inverted map item by rank range in a cdt context', async function () {
        const key = await createRecord({ tags: { a: 'blue', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        const ops = [
          exp.operations.write('tags',
            exp.maps.removeByRankRange(
              exp.binMap('tags'),
              exp.int(2),
              exp.int(0),
              context,
              maps.returnType.INVERTED),
            0),
          op.read('tags')
        ]
        const result = await client.operate(key, ops, {})

        expect(result.bins).to.eql({ tags: { a: 'blue', nested: { d: 'orange', g: 'black' } } })
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

    describe('getByKeyList', function () {
      it('matches the count of the matched map values', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })
        await testNoMatch(key, exp.eq(exp.maps.getByKeyList(exp.binMap('tags'), exp.list(['a', 'b']), maps.returnType.COUNT), exp.int(1)))
        await testMatch(key, exp.eq(exp.maps.getByKeyList(exp.binMap('tags'), exp.list(['a', 'b']), maps.returnType.COUNT), exp.int(2)))
      })

      it('matches the count of the matched map values of a nested map', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
        const context = new Context().addMapKey('nested')
        await testNoMatch(key, exp.eq(exp.maps.getByKeyList(exp.binMap('tags'), exp.list(['d', 'e']), maps.returnType.COUNT, context), exp.int(1)))
        await testMatch(key, exp.eq(exp.maps.getByKeyList(exp.binMap('tags'), exp.list(['d', 'e']), maps.returnType.COUNT, context), exp.int(2)))
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

    describe('getByKeyRelIndexRangeToEnd', function () {
      it('matches the count of the matched map values', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', d: 'yellow' } })
        await testNoMatch(key, exp.eq(exp.maps.getByKeyRelIndexRangeToEnd(exp.binMap('tags'), exp.int(0), exp.str('b'), maps.returnType.COUNT), exp.int(1)))
        await testMatch(key, exp.eq(exp.maps.getByKeyRelIndexRangeToEnd(exp.binMap('tags'), exp.int(0), exp.str('b'), maps.returnType.COUNT), exp.int(2)))
      })

      it('matches the count of the matched map values of a nested map', async function () {
        const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', g: 'white', h: 'black' } } })
        const context = new Context().addMapKey('nested')
        await testNoMatch(key, exp.eq(exp.maps.getByKeyRelIndexRangeToEnd(exp.binMap('tags'), exp.int(0), exp.str('e'), maps.returnType.COUNT, context), exp.int(2)))
        await testMatch(key, exp.eq(exp.maps.getByKeyRelIndexRangeToEnd(exp.binMap('tags'), exp.int(0), exp.str('e'), maps.returnType.COUNT, context), exp.int(3)))
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

  describe('getByValueList', function () {
    it('matches the count of the matched values', async function () {
      const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow' } })

      await testNoMatch(key, exp.eq(exp.maps.getByValueList(exp.binMap('tags'), exp.list(['green', 'yellow']), maps.returnType.COUNT), exp.int(3)))
      await testMatch(key, exp.eq(exp.maps.getByValueList(exp.binMap('tags'), exp.list(['green', 'yellow']), maps.returnType.COUNT), exp.int(2)))
    })

    it('matches the count of the matched values', async function () {
      const key = await createRecord({ tags: { a: 'blue', b: 'green', c: 'yellow', nested: { d: 'orange', e: 'pink', f: 'white', g: 'black' } } })
      const context = new Context().addMapKey('nested')

      await testNoMatch(key, exp.eq(exp.maps.getByValueList(exp.binMap('tags'), exp.list(['orange', 'white']), maps.returnType.COUNT, context), exp.int(3)))
      await testMatch(key, exp.eq(exp.maps.getByValueList(exp.binMap('tags'), exp.list(['orange', 'white']), maps.returnType.COUNT, context), exp.int(2)))
    })
  })

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

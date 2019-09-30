// *****************************************************************************
// Copyright 2013-2019 Aerospike, Inc.
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

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const maps = Aerospike.maps
const Context = Aerospike.cdt.Context
const status = Aerospike.status

const eql = require('deep-eql')

const {
  assertError,
  assertRecordEql,
  assertResultEql,
  assertResultSatisfy,
  cleanup,
  createRecord,
  expectError,
  initState,
  operate
} = require('./util/statefulAsyncTest')

const orderMap = (bin, order, ctx) => {
  const policy = new maps.MapPolicy({ order })
  const setMapPolicy = maps.setPolicy(bin, policy)
  if (ctx) setMapPolicy.withContext(ctx)
  return operate(setMapPolicy)
}
const orderByKey = (bin, ctx) => orderMap(bin, maps.order.KEY_ORDERED, ctx)
const orderByKeyValue = (bin, ctx) => orderMap(bin, maps.order.KEY_VALUE_ORDERED, ctx)

describe('client.operate() - CDT Map operations', function () {
  helper.skipUnlessSupportsFeature(Aerospike.features.CDT_MAP, this)

  describe('maps.setPolicy', function () {
    it('changes the map order', function () {
      return initState()
        .then(createRecord({ map: { c: 1, b: 2, a: 3 } }))
        .then(orderByKey('map'))
        .then(operate(maps.getByKeyRange('map', 'a', 'z', maps.returnType.KEY)))
        .then(assertResultEql({ map: ['a', 'b', 'c'] }))
        .then(cleanup())
    })
  })

  describe('maps.put', function () {
    it('adds the item to the map and returns the size of the map', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.put('map', 'd', 99)))
        .then(assertResultEql({ map: 4 }))
        .then(assertRecordEql({ map: { a: 1, b: 2, c: 3, d: 99 } }))
        .then(cleanup())
    })

    it('replaces the item and returns the size of the map', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.put('map', 'b', 99)))
        .then(assertResultEql({ map: 3 }))
        .then(assertRecordEql({ map: { a: 1, b: 99, c: 3 } }))
        .then(cleanup())
    })

    it('creates a new map if it does not exist yet', function () {
      return initState()
        .then(createRecord({ i: 1 }))
        .then(operate(maps.put('map', 'a', 1)))
        .then(assertResultEql({ map: 1 }))
        .then(assertRecordEql({ i: 1, map: { a: 1 } }))
        .then(cleanup())
    })

    it('fails if the bin does not contain a map', function () {
      return initState()
        .then(createRecord({ map: 'this is not a map' }))
        .then(expectError())
        .then(operate(maps.put('map', 'a', 1)))
        .then(assertError(status.ERR_BIN_INCOMPATIBLE_TYPE))
        .then(cleanup())
    })

    context('update-only write mode', function () {
      const updateOnlyPolicy = new maps.MapPolicy({
        writeMode: maps.writeMode.UPDATE_ONLY
      })

      it('overwrites an existing key', function () {
        return initState()
          .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
          .then(operate(maps.put('map', 'b', 99, updateOnlyPolicy)))
          .then(assertResultEql({ map: 3 }))
          .then(assertRecordEql({ map: { a: 1, b: 99, c: 3 } }))
          .then(cleanup())
      })

      it('fails to write a non-existing key', function () {
        return initState()
          .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
          .then(expectError())
          .then(operate(maps.put('map', 'd', 99, updateOnlyPolicy)))
          .then(assertError(status.ERR_FAIL_ELEMENT_NOT_FOUND))
          .then(cleanup())
      })
    })

    context('with update-only flag', function () {
      helper.skipUnlessVersion('>= 4.3.0', this)

      const policy = new maps.MapPolicy({
        writeFlags: maps.writeFlags.UPDATE_ONLY
      })

      it('overwrites an existing key', function () {
        return initState()
          .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
          .then(operate(maps.put('map', 'b', 99, policy)))
          .then(assertResultEql({ map: 3 }))
          .then(assertRecordEql({ map: { a: 1, b: 99, c: 3 } }))
          .then(cleanup())
      })

      it('fails to write a non-existing key', function () {
        return initState()
          .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
          .then(expectError())
          .then(operate(maps.put('map', 'd', 99, policy)))
          .then(assertError(status.ERR_FAIL_ELEMENT_NOT_FOUND))
          .then(cleanup())
      })

      context('with no-fail flag', function () {
        const policy = new maps.MapPolicy({
          writeFlags: maps.writeFlags.UPDATE_ONLY | maps.writeFlags.NO_FAIL
        })

        it('does not add the item but returns ok', function () {
          return initState()
            .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
            .then(operate(maps.put('map', 'd', 99, policy)))
            .then(assertResultEql({ map: 3 }))
            .then(assertRecordEql({ map: { a: 1, b: 2, c: 3 } }))
            .then(cleanup())
        })
      })
    })

    context('create-only write mode', function () {
      const createOnlyPolicy = new maps.MapPolicy({
        writeMode: maps.writeMode.CREATE_ONLY
      })

      it('fails to overwrite an existing key', function () {
        return initState()
          .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
          .then(expectError())
          .then(operate(maps.put('map', 'b', 99, createOnlyPolicy)))
          .then(assertError(status.ERR_FAIL_ELEMENT_EXISTS))
          .then(cleanup())
      })

      it('creates a new key if it does not exist', function () {
        return initState()
          .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
          .then(operate(maps.put('map', 'd', 99, createOnlyPolicy)))
          .then(assertResultEql({ map: 4 }))
          .then(assertRecordEql({ map: { a: 1, b: 2, c: 3, d: 99 } }))
          .then(cleanup())
      })
    })

    context('with create-only flag', function () {
      helper.skipUnlessVersion('>= 4.3.0', this)

      const policy = new maps.MapPolicy({
        writeFlags: maps.writeFlags.CREATE_ONLY
      })

      it('fails to overwrite an existing key', function () {
        return initState()
          .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
          .then(expectError())
          .then(operate(maps.put('map', 'b', 99, policy)))
          .then(assertError(status.ERR_FAIL_ELEMENT_EXISTS))
          .then(cleanup())
      })

      it('creates a new key if it does not exist', function () {
        return initState()
          .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
          .then(operate(maps.put('map', 'd', 99, policy)))
          .then(assertResultEql({ map: 4 }))
          .then(assertRecordEql({ map: { a: 1, b: 2, c: 3, d: 99 } }))
          .then(cleanup())
      })

      context('with no-fail flag', function () {
        const policy = new maps.MapPolicy({
          writeFlags: maps.writeFlags.CREATE_ONLY | maps.writeFlags.NO_FAIL
        })

        it('does not update the item but returns ok', function () {
          return initState()
            .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
            .then(operate(maps.put('map', 'b', 99, policy)))
            .then(assertResultEql({ map: 3 }))
            .then(assertRecordEql({ map: { a: 1, b: 2, c: 3 } }))
            .then(cleanup())
        })
      })
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('adds the item to the nested map', function () {
        return initState()
          .then(createRecord({ list: [{ a: 1, b: 2, c: 3 }] }))
          .then(operate(maps.put('list', 'd', 99).withContext(ctx => ctx.addListIndex(0))))
          .then(assertResultEql({ list: 4 }))
          .then(assertRecordEql({ list: [{ a: 1, b: 2, c: 3, d: 99 }] }))
          .then(cleanup())
      })
    })
  })

  describe('maps.putItems', function () {
    it('adds each item to the map and returns the size of the map', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.putItems('map', { c: 99, d: 100 })))
        .then(assertResultEql({ map: 4 }))
        .then(assertRecordEql({ map: { a: 1, b: 2, c: 99, d: 100 } }))
        .then(cleanup())
    })

    context('with update-only flag', function () {
      helper.skipUnlessVersion('>= 4.3.0', this)

      const policy = new maps.MapPolicy({
        writeFlags: maps.writeFlags.UPDATE_ONLY
      })

      it('fails if any of the items do not yet exist in the map', function () {
        return initState()
          .then(createRecord({ map: { a: 1, b: 2, c: 3, d: 4, e: 5 } }))
          .then(expectError())
          .then(operate(maps.putItems('map', { c: 10, x: 100 }, policy)))
          .then(assertError(status.ERR_FAIL_ELEMENT_NOT_FOUND))
          .then(cleanup())
      })

      context('with no-fail flag', function () {
        const policy = new maps.MapPolicy({
          writeFlags: maps.writeFlags.UPDATE_ONLY | maps.writeFlags.NO_FAIL
        })

        it('does not update the map but returns ok', function () {
          return initState()
            .then(createRecord({ map: { a: 1, b: 2, c: 3, d: 4, e: 5 } }))
            .then(operate(maps.putItems('map', { c: 10, x: 100 }, policy)))
            .then(assertResultEql({ map: 5 }))
            .then(assertRecordEql({ map: { a: 1, b: 2, c: 3, d: 4, e: 5 } }))
            .then(cleanup())
        })

        context('with partial flag', function () {
          const policy = new maps.MapPolicy({
            writeFlags: maps.writeFlags.UPDATE_ONLY | maps.writeFlags.NO_FAIL | maps.writeFlags.PARTIAL
          })

          it('updates only the existing items', function () {
            return initState()
              .then(createRecord({ map: { a: 1, b: 2, c: 3, d: 4, e: 5 } }))
              .then(operate(maps.putItems('map', { c: 10, x: 100 }, policy)))
              .then(assertResultEql({ map: 5 }))
              .then(assertRecordEql({ map: { a: 1, b: 2, c: 10, d: 4, e: 5 } }))
              .then(cleanup())
          })
        })
      })
    })

    context('with create-only flag', function () {
      helper.skipUnlessVersion('>= 4.3.0', this)

      const policy = new maps.MapPolicy({
        writeFlags: maps.writeFlags.CREATE_ONLY
      })

      it('fails if any of the items already exist in the map', function () {
        return initState()
          .then(createRecord({ map: { a: 1, b: 2, c: 3, d: 4, e: 5 } }))
          .then(expectError())
          .then(operate(maps.putItems('map', { c: 10, x: 100 }, policy)))
          .then(assertError(status.ERR_FAIL_ELEMENT_EXISTS))
          .then(cleanup())
      })

      context('with no-fail flag', function () {
        const policy = new maps.MapPolicy({
          writeFlags: maps.writeFlags.CREATE_ONLY | maps.writeFlags.NO_FAIL
        })

        it('does not update the map but returns ok', function () {
          return initState()
            .then(createRecord({ map: { a: 1, b: 2, c: 3, d: 4, e: 5 } }))
            .then(operate(maps.putItems('map', { c: 10, x: 100 }, policy)))
            .then(assertResultEql({ map: 5 }))
            .then(assertRecordEql({ map: { a: 1, b: 2, c: 3, d: 4, e: 5 } }))
            .then(cleanup())
        })

        context('with partial flag', function () {
          const policy = new maps.MapPolicy({
            writeFlags: maps.writeFlags.CREATE_ONLY | maps.writeFlags.NO_FAIL | maps.writeFlags.PARTIAL
          })

          it('adds only the keys that do not exist yet', function () {
            return initState()
              .then(createRecord({ map: { a: 1, b: 2, c: 3, d: 4, e: 5 } }))
              .then(operate(maps.putItems('map', { c: 10, x: 100 }, policy)))
              .then(assertResultEql({ map: 6 }))
              .then(assertRecordEql({ map: { a: 1, b: 2, c: 3, d: 4, e: 5, x: 100 } }))
              .then(cleanup())
          })
        })
      })
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('adds each item to the nested map', function () {
        return initState()
          .then(createRecord({ map: { nested: { a: 1, b: 2, c: 3 } } }))
          .then(operate(maps.putItems('map', { c: 99, d: 100 }).withContext(ctx => ctx.addMapKey('nested'))))
          .then(assertResultEql({ map: 4 }))
          .then(assertRecordEql({ map: { nested: { a: 1, b: 2, c: 99, d: 100 } } }))
          .then(cleanup())
      })
    })
  })

  describe('maps.increment', function () {
    it('increments the value of the entry and returns the final value', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.increment('map', 'b', 10)))
        .then(assertResultEql({ map: 12 }))
        .then(assertRecordEql({ map: { a: 1, b: 12, c: 3 } }))
        .then(cleanup())
    })

    it('creates a new entry if the key does not exist yet', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.increment('map', 'd', 10)))
        .then(assertResultEql({ map: 10 }))
        .then(assertRecordEql({ map: { a: 1, b: 2, c: 3, d: 10 } }))
        .then(cleanup())
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('increments the value of the entry and returns the final value', function () {
        return initState()
          .then(createRecord({ list: [[1, 2, 3], { a: 1, b: 2, c: 3 }] }))
          .then(operate(maps.increment('list', 'b', 10).withContext(ctx => ctx.addListIndex(1))))
          .then(assertResultEql({ list: 12 }))
          .then(assertRecordEql({ list: [[1, 2, 3], { a: 1, b: 12, c: 3 }] }))
          .then(cleanup())
      })
    })
  })

  describe('maps.decrement', function () {
    it('decrements the value of the entry and returns the final value', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 12, c: 3 } }))
        .then(operate(maps.decrement('map', 'b', 10)))
        .then(assertResultEql({ map: 2 }))
        .then(assertRecordEql({ map: { a: 1, b: 2, c: 3 } }))
        .then(cleanup())
    })

    it('creates a new entry if the key does not exist yet', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.decrement('map', 'd', 1)))
        .then(assertResultEql({ map: -1 }))
        .then(assertRecordEql({ map: { a: 1, b: 2, c: 3, d: -1 } }))
        .then(cleanup())
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('decrements the value of the entry and returns the final value', function () {
        return initState()
          .then(createRecord({ list: [{ a: 1, b: 12, c: 3 }, ['a', 'b', 'c']] }))
          .then(operate(maps.decrement('list', 'b', 10).withContext(ctx => ctx.addListIndex(0))))
          .then(assertResultEql({ list: 2 }))
          .then(assertRecordEql({ list: [{ a: 1, b: 2, c: 3 }, ['a', 'b', 'c']] }))
          .then(cleanup())
      })
    })
  })

  describe('maps.clear', function () {
    it('removes all entries from the map', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 12, c: 3 } }))
        .then(operate(maps.clear('map')))
        .then(assertResultEql({ map: null }))
        .then(assertRecordEql({ map: { } }))
        .then(cleanup())
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes all entries from the map', function () {
        return initState()
          .then(createRecord({ map: { nested: { deepNested: { a: 1, b: 12, c: 3 } } } }))
          .then(operate(
            maps
              .clear('map')
              .withContext(ctx => ctx.addMapKey('nested').addMapKey('deepNested'))
          ))
          .then(assertRecordEql({ map: { nested: { deepNested: { } } } }))
          .then(cleanup())
      })
    })
  })

  describe('maps.removeByKey', function () {
    it('removes a map entry identified by key', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.removeByKey('map', 'b', maps.returnType.VALUE)))
        .then(assertResultEql({ map: 2 }))
        .then(assertRecordEql({ map: { a: 1, c: 3 } }))
        .then(cleanup())
    })

    it('does not fail when removing a non-existing key', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.removeByKey('map', 'd', maps.returnType.VALUE)))
        .then(assertResultEql({ map: null }))
        .then(assertRecordEql({ map: { a: 1, b: 2, c: 3 } }))
        .then(cleanup())
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes a map entry identified by key', function () {
        return initState()
          .then(createRecord({ list: [{ a: 1, b: 2, c: 3 }, { a: 2, b: 3, c: 4 }] }))
          .then(operate(maps.removeByKey('list', 'b').withContext(ctx => ctx.addListIndex(-1))))
          .then(assertRecordEql({ list: [{ a: 1, b: 2, c: 3 }, { a: 2, c: 4 }] }))
          .then(cleanup())
      })
    })
  })

  describe('maps.removeByKeyList', function () {
    it('removes map entries identified by one or more keys', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.removeByKeyList('map', ['a', 'c'], maps.returnType.VALUE)))
        .then(assertResultSatisfy(result => eql(result.map.sort(), [1, 3])))
        .then(assertRecordEql({ map: { b: 2 } }))
        .then(cleanup())
    })

    it('skips non-existent keys', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.removeByKeyList('map', ['a', 'x', 'y', 'z', 'c'], maps.returnType.VALUE)))
        .then(assertResultSatisfy(result => eql(result.map.sort(), [1, 3])))
        .then(assertRecordEql({ map: { b: 2 } }))
        .then(cleanup())
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes map entries identified by one or more keys', function () {
        return initState()
          .then(createRecord({ maps: { a: { a: 1, b: 2, c: 3 }, b: { a: 2, b: 3, c: 4 } } }))
          .then(operate(maps.removeByKeyList('maps', ['a', 'c']).withContext(ctx => ctx.addMapKey('a'))))
          .then(assertRecordEql({ maps: { a: { b: 2 }, b: { a: 2, b: 3, c: 4 } } }))
          .then(cleanup())
      })
    })
  })

  describe('maps.removeByKeyRange', function () {
    it('removes map entries identified by key range', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3, d: 4 } }))
        .then(orderByKey('map'))
        .then(operate(maps.removeByKeyRange('map', 'b', 'd', maps.returnType.VALUE)))
        .then(assertResultEql({ map: [2, 3] }))
        .then(assertRecordEql({ map: { a: 1, d: 4 } }))
        .then(cleanup())
    })

    it('removes all keys from the specified start key until the end', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3, d: 4 } }))
        .then(orderByKey('map'))
        .then(operate(maps.removeByKeyRange('map', 'b', null, maps.returnType.VALUE)))
        .then(assertResultEql({ map: [2, 3, 4] }))
        .then(assertRecordEql({ map: { a: 1 } }))
        .then(cleanup())
    })

    it('removes all keys from the start to the specified end', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3, d: 4 } }))
        .then(orderByKey('map'))
        .then(operate(maps.removeByKeyRange('map', null, 'b', maps.returnType.VALUE)))
        .then(assertResultEql({ map: [1] }))
        .then(assertRecordEql({ map: { b: 2, c: 3, d: 4 } }))
        .then(cleanup())
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes map entries identified by key range', function () {
        const mapContext = new Context().addListIndex(0)
        return initState()
          .then(createRecord({ list: [{ a: 1, b: 2, c: 3, d: 4 }] }))
          .then(orderByKey('list', mapContext))
          .then(operate(maps.removeByKeyRange('list', 'b', 'd').withContext(mapContext)))
          .then(assertRecordEql({ list: [{ a: 1, d: 4 }] }))
          .then(cleanup())
      })
    })
  })

  describe('maps.removeByKeyRelIndexRange', function () {
    helper.skipUnlessVersion('>= 4.3.0', this)

    context('with count', function () {
      it('removes map entries nearest to key and greater, by index', function () {
        return initState()
          .then(createRecord({ map: { a: 17, e: 2, f: 15, j: 10 } }))
          .then(orderByKey('map'))
          .then(operate(maps.removeByKeyRelIndexRange('map', 'f', 0, 1).andReturn(maps.returnType.KEY)))
          .then(assertResultEql({ map: ['f'] }))
          .then(assertRecordEql({ map: { a: 17, e: 2, j: 10 } }))
          .then(cleanup())
      })
    })

    context('without count', function () {
      it('removes map entries nearest to key and greater, by index', function () {
        return initState()
          .then(createRecord({ map: { a: 17, e: 2, f: 15, j: 10 } }))
          .then(orderByKey('map'))
          .then(operate(maps.removeByKeyRelIndexRange('map', 'f', 0).andReturn(maps.returnType.KEY)))
          .then(assertResultEql({ map: ['f', 'j'] }))
          .then(assertRecordEql({ map: { a: 17, e: 2 } }))
          .then(cleanup())
      })
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes map entries nearest to key and greater, by index', function () {
        const mapContext = new Context().addListIndex(0)
        return initState()
          .then(createRecord({ list: [{ a: 17, e: 2, f: 15, j: 10 }, { a: 32, f: 14 }] }))
          .then(orderByKey('list', mapContext))
          .then(operate(maps.removeByKeyRelIndexRange('list', 'f', 0, 1).withContext(mapContext)))
          .then(assertRecordEql({ list: [{ a: 17, e: 2, j: 10 }, { a: 32, f: 14 }] }))
          .then(cleanup())
      })
    })
  })

  describe('maps.removeByValue', function () {
    it('removes a map entry identified by value', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.removeByValue('map', 2, maps.returnType.RANK)))
        .then(assertResultEql({ map: [1] }))
        .then(assertRecordEql({ map: { a: 1, c: 3 } }))
        .then(cleanup())
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes a map entry identified by value', function () {
        return initState()
          .then(createRecord({ list: [{ a: 1, b: 2 }, { a: 1, b: 2 }, { a: 2, b: 3 }] }))
          .then(operate(
            maps
              .removeByValue('list', 2)
              .withContext(ctx => ctx.addListValue({ a: 1, b: 2 })) // matches only the first list value
              .andReturn(maps.returnType.RANK)
          ))
          .then(assertResultEql({ list: [1] }))
          .then(assertRecordEql({ list: [{ a: 1 }, { a: 1, b: 2 }, { a: 2, b: 3 }] }))
          .then(cleanup())
      })
    })
  })

  describe('maps.removeByValueList', function () {
    it('removes map entries identified by one or more values', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.removeByValueList('map', [1, 3], maps.returnType.RANK)))
        .then(assertResultEql({ map: [0, 2] }))
        .then(assertRecordEql({ map: { b: 2 } }))
        .then(cleanup())
    })

    it('skips non-existent values', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.removeByValueList('map', [1, 99, 3], maps.returnType.RANK)))
        .then(assertResultEql({ map: [0, 2] }))
        .then(assertRecordEql({ map: { b: 2 } }))
        .then(cleanup())
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes map entries identified by one or more values', function () {
        return initState()
          .then(createRecord({ map: { a: { a: 1, b: 2, c: 3 }, b: { b: 2, c: 3, d: 4 } } }))
          .then(operate(maps.removeByValueList('map', [1, 3]).withContext(ctx => ctx.addMapKey('a'))))
          .then(assertRecordEql({ map: { a: { b: 2 }, b: { b: 2, c: 3, d: 4 } } }))
          .then(cleanup())
      })
    })
  })

  describe('maps.removeByValueRange', function () {
    it('removes map entries identified by value range', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 2, d: 3 } }))
        .then(operate(maps.removeByValueRange('map', 2, 3, maps.returnType.RANK)))
        .then(assertResultEql({ map: [1, 2] }))
        .then(assertRecordEql({ map: { a: 1, d: 3 } }))
        .then(cleanup())
    })

    it('removes all keys from the specified start value until the end', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.removeByValueRange('map', 2, null, maps.returnType.RANK)))
        .then(assertResultEql({ map: [1, 2] }))
        .then(assertRecordEql({ map: { a: 1 } }))
        .then(cleanup())
    })

    it('removes all keys from the start to the specified end value', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.removeByValueRange('map', null, 2, maps.returnType.RANK)))
        .then(assertResultEql({ map: [0] }))
        .then(assertRecordEql({ map: { b: 2, c: 3 } }))
        .then(cleanup())
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes map entries identified by value range', function () {
        return initState()
          .then(createRecord({ list: [['a', 'b', 'c'], { a: 1, b: 2, c: 2, d: 3 }] }))
          .then(operate(maps.removeByValueRange('list', 2, 3).withContext(ctx => ctx.addListIndex(-1))))
          .then(assertRecordEql({ list: [['a', 'b', 'c'], { a: 1, d: 3 }] }))
          .then(cleanup())
      })
    })
  })

  describe('maps.removeByValueRelRankRange', function () {
    helper.skipUnlessVersion('>= 4.3.0', this)

    context('with count', function () {
      it('removes map entries nearest to value and greater by relative rank', function () {
        return initState()
          .then(createRecord({ map: { e: 2, j: 10, f: 15, a: 17 } }))
          .then(orderByKeyValue('map'))
          .then(operate(maps.removeByValueRelRankRange('map', 11, 1, 1).andReturn(maps.returnType.KEY)))
          .then(assertResultEql({ map: ['a'] }))
          .then(assertRecordEql({ map: { e: 2, j: 10, f: 15 } }))
          .then(cleanup())
      })
    })

    context('without count', function () {
      it('removes map entries nearest to value and greater by relative rank', function () {
        return initState()
          .then(createRecord({ map: { e: 2, j: 10, f: 15, a: 17 } }))
          .then(orderByKeyValue('map'))
          .then(operate(maps.removeByValueRelRankRange('map', 11, -1).andReturn(maps.returnType.KEY)))
          .then(assertResultEql({ map: ['j', 'f', 'a'] }))
          .then(assertRecordEql({ map: { e: 2 } }))
          .then(cleanup())
      })
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes map entries nearest to value and greater by relative rank', function () {
        const mapContext = new Context()
          .addListIndex(2)
          .addListIndex(1)
        return initState()
          .then(createRecord({ list: ['a', 'b', ['c', { e: 2, j: 10, f: 15, a: 17 }], 'd', 'e'] }))
          .then(orderByKeyValue('list', mapContext))
          .then(operate(maps.removeByValueRelRankRange('list', 11, 1, 1).withContext(mapContext)))
          .then(assertRecordEql({ list: ['a', 'b', ['c', { e: 2, j: 10, f: 15 }], 'd', 'e'] }))
          .then(cleanup())
      })
    })
  })

  describe('maps.removeByIndex', function () {
    it('removes a map entry identified by index', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.removeByIndex('map', 1, maps.returnType.KEY)))
        .then(assertResultEql({ map: 'b' }))
        .then(assertRecordEql({ map: { a: 1, c: 3 } }))
        .then(cleanup())
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes a map entry identified by index', function () {
        return initState()
          .then(createRecord({ map: { nested: { a: 1, b: 2, c: 3 } } }))
          .then(operate(maps.removeByIndex('map', 1).withContext(ctx => ctx.addMapValue({ a: 1, b: 2, c: 3 }))))
          .then(assertRecordEql({ map: { nested: { a: 1, c: 3 } } }))
          .then(cleanup())
      })
    })
  })

  describe('maps.removeByIndexRange', function () {
    it('removes map entries identified by index range', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 2, d: 3 } }))
        .then(operate(maps.removeByIndexRange('map', 1, 2, maps.returnType.KEY)))
        .then(assertResultEql({ map: ['b', 'c'] }))
        .then(assertRecordEql({ map: { a: 1, d: 3 } }))
        .then(cleanup())
    })

    it('removes all map entries starting at the specified index if count is null', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.removeByIndexRange('map', 1, null, maps.returnType.KEY)))
        .then(assertResultEql({ map: ['b', 'c'] }))
        .then(assertRecordEql({ map: { a: 1 } }))
        .then(cleanup())
    })

    it('removes all map entries starting at the specified index if count is undefined', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.removeByIndexRange('map', 1)))
        .then(assertResultEql({ map: null }))
        .then(assertRecordEql({ map: { a: 1 } }))
        .then(cleanup())
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes map entries identified by index range', function () {
        return initState()
          .then(createRecord({ map: { nested: { a: 1, b: 2, c: 2, d: 3 } } }))
          .then(operate(maps.removeByIndexRange('map', 1, 2).withContext(ctx => ctx.addMapKey('nested'))))
          .then(assertRecordEql({ map: { nested: { a: 1, d: 3 } } }))
          .then(cleanup())
      })
    })
  })

  describe('maps.removeByRank', function () {
    it('removes a map entry identified by rank', function () {
      return initState()
        .then(createRecord({ map: { a: 3, b: 2, c: 1 } }))
        .then(operate(maps.removeByRank('map', 0, maps.returnType.VALUE)))
        .then(assertResultEql({ map: 1 }))
        .then(assertRecordEql({ map: { a: 3, b: 2 } }))
        .then(cleanup())
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes a map entry identified by rank', function () {
        return initState()
          .then(createRecord({ list: [{ a: 3, b: 2, c: 1 }] }))
          .then(operate(maps.removeByRank('list', 0).withContext(ctx => ctx.addListIndex(0))))
          .then(assertRecordEql({ list: [{ a: 3, b: 2 }] }))
          .then(cleanup())
      })
    })
  })

  describe('maps.removeByRankRange', function () {
    it('removes map entries identified by rank range', function () {
      return initState()
        .then(createRecord({ map: { a: 3, b: 2, c: 1 } }))
        .then(operate(maps.removeByRankRange('map', 0, 2, maps.returnType.VALUE)))
        .then(assertResultEql({ map: [1, 2] }))
        .then(assertRecordEql({ map: { a: 3 } }))
        .then(cleanup())
    })

    it('removes all map entries starting at the specified rank until the end', function () {
      return initState()
        .then(createRecord({ map: { a: 3, b: 2, c: 1 } }))
        .then(operate(maps.removeByRankRange('map', 1, null, maps.returnType.VALUE)))
        .then(assertResultEql({ map: [2, 3] }))
        .then(assertRecordEql({ map: { c: 1 } }))
        .then(cleanup())
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes map entries identified by rank range', function () {
        return initState()
          .then(createRecord({ list: [{ a: 3, b: 2, c: 1 }] }))
          .then(operate(maps.removeByRankRange('list', 0, 2).withContext(ctx => ctx.addListIndex(-1))))
          .then(assertRecordEql({ list: [{ a: 3 }] }))
          .then(cleanup())
      })
    })
  })

  describe('maps.size', function () {
    it('returns the size of the map', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.size('map')))
        .then(assertResultEql({ map: 3 }))
        .then(cleanup())
    })

    it('returns zero if the map is empty', function () {
      return initState()
        .then(createRecord({ map: { } }))
        .then(operate(maps.size('map')))
        .then(assertResultEql({ map: 0 }))
        .then(cleanup())
    })

    it('returns null if the map does not exist', function () {
      return initState()
        .then(createRecord({ i: 1 }))
        .then(operate(maps.size('map')))
        .then(assertResultEql({ map: null }))
        .then(cleanup())
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('returns the size of the map', function () {
        return initState()
          .then(createRecord({ map: { nested: { a: 1, b: 2, c: 3 } } }))
          .then(operate(maps.size('map').withContext(ctx => ctx.addMapKey('nested'))))
          .then(assertResultEql({ map: 3 }))
          .then(cleanup())
      })
    })
  })

  describe('maps.getByKey', function () {
    it('fetches a map entry identified by key', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.getByKey('map', 'b', maps.returnType.KEY_VALUE)))
        .then(assertResultEql({ map: ['b', 2] }))
        .then(cleanup())
    })

    it('does not fail if the key does not exist', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.getByKey('map', 'z', maps.returnType.KEY_VALUE)))
        .then(assertResultEql({ map: [] }))
        .then(cleanup())
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('fetches a map entry identified by key', function () {
        return initState()
          .then(createRecord({ list: [{ a: 1, b: 2, c: 3 }, { b: 3 }] }))
          .then(operate(
            maps
              .getByKey('list', 'b')
              .withContext(ctx => ctx.addListIndex(0))
              .andReturn(maps.returnType.KEY_VALUE)
          ))
          .then(assertResultEql({ list: ['b', 2] }))
          .then(cleanup())
      })
    })
  })

  describe('maps.getByKeyRange', function () {
    it('fetches map entries identified by key range', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3, d: 4 } }))
        .then(orderByKey('map'))
        .then(operate(maps.getByKeyRange('map', 'b', 'd', maps.returnType.KEY)))
        .then(assertResultEql({ map: ['b', 'c'] }))
        .then(cleanup())
    })

    it('fetches all keys from the specified start key until the end', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3, d: 4 } }))
        .then(orderByKey('map'))
        .then(operate(maps.getByKeyRange('map', 'b', null, maps.returnType.KEY)))
        .then(assertResultEql({ map: ['b', 'c', 'd'] }))
        .then(cleanup())
    })

    it('fetches all keys from the start to the specified end', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.getByKeyRange('map', null, 'b', maps.returnType.KEY)))
        .then(assertResultEql({ map: ['a'] }))
        .then(cleanup())
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('fetches map entries identified by key range', function () {
        const mapContext = new Context().addListIndex(-1)
        return initState()
          .then(createRecord({ list: [{ b: 3, c: 4 }, { a: 1, b: 2, c: 3, d: 4 }] }))
          .then(orderByKey('list', mapContext))
          .then(operate(
            maps
              .getByKeyRange('list', 'b', 'd')
              .withContext(mapContext)
              .andReturn(maps.returnType.KEY)
          ))
          .then(assertResultEql({ list: ['b', 'c'] }))
          .then(cleanup())
      })
    })
  })

  describe('maps.getByKeyRelIndexRange', function () {
    helper.skipUnlessVersion('>= 4.3.0', this)

    context('with count', function () {
      it('retrieves map entries nearest to key and greater, by index', function () {
        return initState()
          .then(createRecord({ map: { a: 17, e: 2, f: 15, j: 10 } }))
          .then(orderByKey('map'))
          .then(operate(maps.getByKeyRelIndexRange('map', 'f', 0, 1).andReturn(maps.returnType.KEY)))
          .then(assertResultEql({ map: ['f'] }))
          .then(cleanup())
      })
    })

    context('without count', function () {
      it('retrieves map entries nearest to key and greater, by index', function () {
        return initState()
          .then(createRecord({ map: { a: 17, e: 2, f: 15, j: 10 } }))
          .then(orderByKey('map'))
          .then(operate(maps.getByKeyRelIndexRange('map', 'f', 0).andReturn(maps.returnType.KEY)))
          .then(assertResultEql({ map: ['f', 'j'] }))
          .then(cleanup())
      })
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('retrieves map entries nearest to key and greater, by index', function () {
        const mapContext = new Context().addListIndex(-1)
        return initState()
          .then(createRecord({ list: [{ a: 17, e: 2, f: 15, j: 10 }] }))
          .then(orderByKey('list', mapContext))
          .then(operate(
            maps
              .getByKeyRelIndexRange('list', 'f', 0)
              .withContext(mapContext)
              .andReturn(maps.returnType.KEY)
          ))
          .then(assertResultEql({ list: ['f', 'j'] }))
          .then(cleanup())
      })
    })
  })

  describe('maps.getByValue', function () {
    it('fetches a map entry identified by value', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.getByValue('map', 2, maps.returnType.VALUE)))
        .then(assertResultEql({ map: [2] }))
        .then(cleanup())
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('fetches a map entry identified by value', function () {
        return initState()
          .then(createRecord({ map: { nested: { a: 1, b: 2, c: 2 } } }))
          .then(operate(
            maps
              .getByValue('map', 2)
              .withContext(ctx => ctx.addMapKey('nested'))
              .andReturn(maps.returnType.KEY)
          ))
          .then(assertResultSatisfy(result => eql(result.map.sort(), ['b', 'c'])))
          .then(cleanup())
      })
    })
  })

  describe('maps.getByValueRange', function () {
    it('fetches map entries identified by value range', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 2, d: 3 } }))
        .then(operate(maps.getByValueRange('map', 2, 3, maps.returnType.VALUE)))
        .then(assertResultEql({ map: [2, 2] }))
        .then(cleanup())
    })

    it('fetches all values from the specified start value until the end', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.getByValueRange('map', 2, null, maps.returnType.VALUE)))
        .then(assertResultSatisfy(result => eql(result.map.sort(), [2, 3])))
        .then(cleanup())
    })

    it('fetches all values from the start to the specified end', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.getByValueRange('map', null, 2, maps.returnType.VALUE)))
        .then(assertResultEql({ map: [1] }))
        .then(cleanup())
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('fetches map entries identified by value range', function () {
        return initState()
          .then(createRecord({ list: [{ a: 2, b: 3, c: 4 }, { a: 1, b: 2, c: 2, d: 3 }] }))
          .then(operate(
            maps
              .getByValueRange('list', 2, 3)
              .withContext(ctx => ctx.addListIndex(1))
              .andReturn(maps.returnType.VALUE)
          ))
          .then(assertResultEql({ list: [2, 2] }))
          .then(cleanup())
      })
    })
  })

  describe('maps.getByValueRelRankRange', function () {
    helper.skipUnlessVersion('>= 4.3.0', this)

    context('with count', function () {
      it('retrieves map entries nearest to value and greater by relative rank', function () {
        return initState()
          .then(createRecord({ map: { e: 2, j: 10, f: 15, a: 17 } }))
          .then(orderByKeyValue('map'))
          .then(operate(maps.getByValueRelRankRange('map', 11, 1, 1).andReturn(maps.returnType.KEY)))
          .then(assertResultEql({ map: ['a'] }))
          .then(cleanup())
      })
    })

    context('without count', function () {
      it('retrieves map entries nearest to value and greater by relative rank', function () {
        return initState()
          .then(createRecord({ map: { e: 2, j: 10, f: 15, a: 17 } }))
          .then(orderByKeyValue('map'))
          .then(operate(maps.getByValueRelRankRange('map', 11, -1).andReturn(maps.returnType.KEY)))
          .then(assertResultEql({ map: ['j', 'f', 'a'] }))
          .then(cleanup())
      })
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('retrieves map entries nearest to value and greater by relative rank', function () {
        const mapContext = new Context().addMapKey('nested')
        return initState()
          .then(createRecord({ map: { nested: { e: 2, j: 10, f: 15, a: 17 } } }))
          .then(orderByKeyValue('map', mapContext))
          .then(operate(
            maps
              .getByValueRelRankRange('map', 11, 1, 1)
              .withContext(mapContext)
              .andReturn(maps.returnType.KEY)
          ))
          .then(assertResultEql({ map: ['a'] }))
          .then(cleanup())
      })
    })
  })

  describe('maps.getByIndex', function () {
    it('fetches a map entry identified by index', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.getByIndex('map', 1, maps.returnType.KEY_VALUE)))
        .then(assertResultEql({ map: ['b', 2] }))
        .then(cleanup())
    })

    it('fetches a map entry identified by negative index', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.getByIndex('map', -1, maps.returnType.KEY_VALUE)))
        .then(assertResultEql({ map: ['c', 3] }))
        .then(cleanup())
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('fetches a map entry identified by index', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, { a: 1, b: 2, c: 3 }] }))
          .then(operate(
            maps
              .getByIndex('list', 1)
              .withContext(ctx => ctx.addListIndex(4))
              .andReturn(maps.returnType.KEY_VALUE)
          ))
          .then(assertResultEql({ list: ['b', 2] }))
          .then(cleanup())
      })
    })
  })

  describe('maps.getByIndexRange', function () {
    it('fetches map entries identified by index range', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 2, d: 3 } }))
        .then(operate(maps.getByIndexRange('map', 1, 2, maps.returnType.KEY_VALUE)))
        .then(assertResultEql({ map: ['b', 2, 'c', 2] }))
        .then(cleanup())
    })

    it('fetches map entries identified by negative index range', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 2, d: 3 } }))
        .then(operate(maps.getByIndexRange('map', -2, 2, maps.returnType.KEY_VALUE)))
        .then(assertResultEql({ map: ['c', 2, 'd', 3] }))
        .then(cleanup())
    })

    it('fetches all map entries starting from the specified index until the end', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(operate(maps.getByIndexRange('map', 1, null, maps.returnType.KEY_VALUE)))
        .then(assertResultEql({ map: ['b', 2, 'c', 3] }))
        .then(cleanup())
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('fetches map entries identified by index range', function () {
        return initState()
          .then(createRecord({ list: [{ a: 1, b: 2, c: 2, d: 3 }] }))
          .then(operate(
            maps
              .getByIndexRange('list', 1, 2)
              .withContext(ctx => ctx.addListIndex(0))
              .andReturn(maps.returnType.KEY_VALUE)
          ))
          .then(assertResultEql({ list: ['b', 2, 'c', 2] }))
          .then(cleanup())
      })
    })
  })

  describe('maps.getByRank', function () {
    it('fetches a map entry identified by rank', function () {
      return initState()
        .then(createRecord({ map: { a: 3, b: 2, c: 1 } }))
        .then(operate(maps.getByRank('map', 0, maps.returnType.VALUE)))
        .then(assertResultEql({ map: 1 }))
        .then(cleanup())
    })

    it('fetches a map entry identified by negative rank', function () {
      return initState()
        .then(createRecord({ map: { a: 3, b: 2, c: 1 } }))
        .then(operate(maps.getByRank('map', -1, maps.returnType.VALUE)))
        .then(assertResultEql({ map: 3 }))
        .then(cleanup())
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('fetches a map entry identified by rank', function () {
        return initState()
          .then(createRecord({ map: { nested: { a: 3, b: 2, c: 1 } } }))
          .then(operate(
            maps
              .getByRank('map', 0)
              .withContext(ctx => ctx.addMapKey('nested'))
              .andReturn(maps.returnType.VALUE)
          ))
          .then(assertResultEql({ map: 1 }))
          .then(cleanup())
      })
    })
  })

  describe('maps.getByRankRange', function () {
    it('fetches map entries identified by rank range', function () {
      return initState()
        .then(createRecord({ map: { a: 3, b: 2, c: 1 } }))
        .then(operate(maps.getByRankRange('map', 0, 2, maps.returnType.VALUE)))
        .then(assertResultEql({ map: [1, 2] }))
        .then(cleanup())
    })

    it('fetches map entries identified by negative rank range', function () {
      return initState()
        .then(createRecord({ map: { a: 3, b: 2, c: 1 } }))
        .then(operate(maps.getByRankRange('map', -2, 2, maps.returnType.VALUE)))
        .then(assertResultEql({ map: [2, 3] }))
        .then(cleanup())
    })

    it('fetches all map entries starting at the specified rank until the end', function () {
      return initState()
        .then(createRecord({ map: { a: 3, b: 2, c: 1 } }))
        .then(operate(maps.getByRankRange('map', 1, null, maps.returnType.VALUE)))
        .then(assertResultEql({ map: [2, 3] }))
        .then(cleanup())
    })

    context('with nested map context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('fetches map entries identified by rank range', function () {
        return initState()
          .then(createRecord({ list: [{ a: 3, b: 2, c: 1 }] }))
          .then(operate(
            maps
              .getByRankRange('list', 0, 2)
              .withContext(ctx => ctx.addListIndex(0))
              .andReturn(maps.returnType.VALUE)
          ))
          .then(assertResultEql({ list: [1, 2] }))
          .then(cleanup())
      })
    })
  })

  context('returnTypes', function () {
    it('returns nothing', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(orderByKey('map'))
        .then(operate(maps.getByKey('map', 'b', maps.returnType.NONE)))
        .then(assertResultEql({ map: null }))
        .then(cleanup())
    })

    it('returns index', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(orderByKey('map'))
        .then(operate(maps.getByKey('map', 'a', maps.returnType.INDEX)))
        .then(assertResultEql({ map: 0 }))
        .then(cleanup())
    })

    it('returns reverse index', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(orderByKey('map'))
        .then(operate(maps.getByKey('map', 'a', maps.returnType.REVERSE_INDEX)))
        .then(assertResultEql({ map: 2 }))
        .then(cleanup())
    })

    it('returns value order (rank)', function () {
      return initState()
        .then(createRecord({ map: { a: 3, b: 2, c: 1 } }))
        .then(orderByKey('map'))
        .then(operate(maps.getByKey('map', 'a', maps.returnType.RANK)))
        .then(assertResultEql({ map: 2 }))
        .then(cleanup())
    })

    it('returns reverse value order (reverse rank)', function () {
      return initState()
        .then(createRecord({ map: { a: 3, b: 2, c: 1 } }))
        .then(orderByKey('map'))
        .then(operate(maps.getByKey('map', 'a', maps.returnType.REVERSE_RANK)))
        .then(assertResultEql({ map: 0 }))
        .then(cleanup())
    })

    it('returns count of items selected', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(orderByKey('map'))
        .then(operate(maps.getByKeyRange('map', 'a', 'c', maps.returnType.COUNT)))
        .then(assertResultEql({ map: 2 }))
        .then(cleanup())
    })

    it('returns key for a single read', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(orderByKey('map'))
        .then(operate(maps.getByIndex('map', 0, maps.returnType.KEY)))
        .then(assertResultEql({ map: 'a' }))
        .then(cleanup())
    })

    it('returns keys for range read', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(orderByKey('map'))
        .then(operate(maps.getByIndexRange('map', 0, 2, maps.returnType.KEY)))
        .then(assertResultEql({ map: ['a', 'b'] }))
        .then(cleanup())
    })

    it('returns value for a single read', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(orderByKey('map'))
        .then(operate(maps.getByIndex('map', 0, maps.returnType.VALUE)))
        .then(assertResultEql({ map: 1 }))
        .then(cleanup())
    })

    it('returns values for range read', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(orderByKey('map'))
        .then(operate(maps.getByIndexRange('map', 0, 2, maps.returnType.VALUE)))
        .then(assertResultEql({ map: [1, 2] }))
        .then(cleanup())
    })

    it('returns key/value for a single read', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(orderByKey('map'))
        .then(operate(maps.getByIndex('map', 0, maps.returnType.KEY_VALUE)))
        .then(assertResultEql({ map: ['a', 1] }))
        .then(cleanup())
    })

    it('returns key/value for a range read', function () {
      return initState()
        .then(createRecord({ map: { a: 1, b: 2, c: 3 } }))
        .then(orderByKey('map'))
        .then(operate(maps.getByIndexRange('map', 0, 2, maps.returnType.KEY_VALUE)))
        .then(assertResultEql({ map: ['a', 1, 'b', 2] }))
        .then(cleanup())
    })
  })
})

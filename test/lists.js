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
/* global expect */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const AerospikeError = Aerospike.AerospikeError
const lists = Aerospike.lists
const ops = Aerospike.operations
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

const orderList = (bin, ctx) => {
  const setListOrder = lists.setOrder(bin, lists.order.ORDERED)
  if (ctx) setListOrder.withContext(ctx)
  return operate(setListOrder)
}

describe('client.operate() - CDT List operations', function () {
  helper.skipUnlessSupportsFeature(Aerospike.features.CDT_LIST, this)

  let ListOutOfBoundsError
  before(() => {
    ListOutOfBoundsError = helper.cluster.isVersionInRange('>=4.6.0')
      ? status.ERR_OP_NOT_APPLICABLE
      : status.ERR_REQUEST_INVALID
  })

  describe('lists.setOrder', function () {
    it('changes the list order', function () {
      return initState()
        .then(createRecord({ list: [3, 1, 2] }))
        .then(operate([
          lists.setOrder('list', lists.order.ORDERED),
          ops.read('list')
        ]))
        .then(assertResultEql({ list: [1, 2, 3] }))
        .then(cleanup())
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('changes the order of a nested list', function () {
        return initState()
          .then(createRecord({ list: [[3, 1, 2], [6, 5, 4]] }))
          .then(operate([
            lists.setOrder('list', lists.order.ORDERED).withContext(ctx => ctx.addListIndex(0)),
            lists.setOrder('list', lists.order.ORDERED).withContext(ctx => ctx.addListIndex(1)),
            ops.read('list')
          ]))
          .then(assertResultEql({ list: [[1, 2, 3], [4, 5, 6]] }))
          .then(cleanup())
      })
    })
  })

  describe('lists.sort', function () {
    it('sorts the list', function () {
      return initState()
        .then(createRecord({ list: [3, 1, 2, 1] }))
        .then(operate([
          lists.sort('list', lists.sortFlags.DEFAULT),
          ops.read('list')
        ]))
        .then(assertResultEql({ list: [1, 1, 2, 3] }))
        .then(cleanup())
    })

    context('with DROP_DUPLICATES flag', function () {
      it('sorts the list and drops duplicates', function () {
        return initState()
          .then(createRecord({ list: [3, 1, 2, 1] }))
          .then(operate([
            lists.sort('list', lists.sortFlags.DROP_DUPLICATES),
            ops.read('list')
          ]))
          .then(assertResultEql({ list: [1, 2, 3] }))
          .then(cleanup())
      })
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('sorts a nested list', function () {
        return initState()
          .then(createRecord({ list: [['a', 'b', 'c'], [3, 1, 2, 1]] }))
          .then(operate([
            lists.sort('list', lists.sortFlags.DEFAULT).withContext(ctx => ctx.addListIndex(-1)),
            ops.read('list')
          ]))
          .then(assertResultEql({ list: [['a', 'b', 'c'], [1, 1, 2, 3]] }))
          .then(cleanup())
      })
    })
  })

  describe('lists.append', function () {
    it('appends an item to the list and returns the list size', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(operate(lists.append('list', 99)))
        .then(assertResultEql({ list: 6 }))
        .then(assertRecordEql({ list: [1, 2, 3, 4, 5, 99] }))
        .then(cleanup)
    })

    context('with add-unique flag', function () {
      const policy = {
        writeFlags: lists.writeFlags.ADD_UNIQUE
      }

      it('returns an error when trying to append a non-unique element', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, 5] }))
          .then(expectError())
          .then(operate(lists.append('list', 3, policy)))
          .then(assertError(status.ERR_FAIL_ELEMENT_EXISTS))
          .then(cleanup)
      })

      context('with no-fail flag', function () {
        helper.skipUnlessVersion('>= 4.3.0', this)

        const policy = {
          writeFlags: lists.writeFlags.ADD_UNIQUE | lists.writeFlags.NO_FAIL
        }

        it('returns an error when trying to append a non-unique element', function () {
          return initState()
            .then(createRecord({ list: [1, 2, 3, 4, 5] }))
            .then(operate(lists.append('list', 3, policy)))
            .then(assertResultEql({ list: 5 }))
            .then(assertRecordEql({ list: [1, 2, 3, 4, 5] }))
            .then(cleanup)
        })
      })
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('appends a value to a nested list', function () {
        return initState()
          .then(createRecord({ list: [1, 2, ['a', 'b', 'c'], 4, 5] }))
          .then(operate(lists.append('list', 'd').withContext(ctx => ctx.addListIndex(2))))
          .then(assertResultEql({ list: 4 }))
          .then(assertRecordEql({ list: [1, 2, ['a', 'b', 'c', 'd'], 4, 5] }))
          .then(cleanup)
      })
    })
  })

  describe('lists.appendItems', function () {
    it('appends the items to the list and returns the list size', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(operate(lists.appendItems('list', [99, 100])))
        .then(assertResultEql({ list: 7 }))
        .then(assertRecordEql({ list: [1, 2, 3, 4, 5, 99, 100] }))
        .then(cleanup)
    })

    it('returns an error if the value to append is not an array', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(expectError())
        .then(operate(lists.appendItems('list', 99)))
        .then(assertError(status.ERR_PARAM))
        .then(cleanup)
    })

    context('with add-unique flag', function () {
      const policy = {
        writeFlags: lists.writeFlags.ADD_UNIQUE
      }

      it('returns an error when appending duplicate items', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, 5] }))
          .then(expectError())
          .then(operate(lists.appendItems('list', [3, 6], policy)))
          .then(assertError(status.ERR_FAIL_ELEMENT_EXISTS))
          .then(cleanup)
      })

      context('with no-fail flag', function () {
        helper.skipUnlessVersion('>= 4.3.0', this)

        const policy = {
          writeFlags: lists.writeFlags.ADD_UNIQUE | lists.writeFlags.NO_FAIL
        }

        it('does not append any items but returns ok', function () {
          return initState()
            .then(createRecord({ list: [1, 2, 3, 4, 5] }))
            .then(operate(lists.appendItems('list', [3, 6], policy)))
            .then(assertResultEql({ list: 5 }))
            .then(assertRecordEql({ list: [1, 2, 3, 4, 5] }))
            .then(cleanup)
        })

        context('with partial flag', function () {
          const policy = {
            writeFlags: lists.writeFlags.ADD_UNIQUE | lists.writeFlags.NO_FAIL | lists.writeFlags.PARTIAL
          }

          it('appends only the unique items', function () {
            return initState()
              .then(createRecord({ list: [1, 2, 3, 4, 5] }))
              .then(operate(lists.appendItems('list', [3, 6], policy)))
              .then(assertResultEql({ list: 6 }))
              .then(assertRecordEql({ list: [1, 2, 3, 4, 5, 6] }))
              .then(cleanup)
          })
        })
      })
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('appends the items to a nested list', function () {
        return initState()
          .then(createRecord({ map: { list: [1, 2, 3, 4, 5] } }))
          .then(operate(lists.appendItems('map', [99, 100]).withContext(ctx => ctx.addMapKey('list'))))
          .then(assertResultEql({ map: 7 }))
          .then(assertRecordEql({ map: { list: [1, 2, 3, 4, 5, 99, 100] } }))
          .then(cleanup)
      })
    })
  })

  describe('lists.insert', function () {
    it('inserts the item at the specified index and returns the list size', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(operate(lists.insert('list', 2, 99)))
        .then(assertResultEql({ list: 6 }))
        .then(assertRecordEql({ list: [1, 2, 99, 3, 4, 5] }))
        .then(cleanup)
    })

    context('with add-unique flag', function () {
      const policy = {
        writeFlags: lists.writeFlags.ADD_UNIQUE
      }

      it('returns an error when trying to insert a non-unique element', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, 5] }))
          .then(expectError())
          .then(operate(lists.insert('list', 2, 3, policy)))
          .then(assertError(status.ERR_FAIL_ELEMENT_EXISTS))
          .then(cleanup)
      })

      context('with no-fail flag', function () {
        helper.skipUnlessVersion('>= 4.3.0', this)

        const policy = {
          writeFlags: lists.writeFlags.ADD_UNIQUE | lists.writeFlags.NO_FAIL
        }

        it('does not insert the item but returns ok', function () {
          return initState()
            .then(createRecord({ list: [1, 2, 3, 4, 5] }))
            .then(operate(lists.insert('list', 2, 3, policy)))
            .then(assertResultEql({ list: 5 }))
            .then(assertRecordEql({ list: [1, 2, 3, 4, 5] }))
            .then(cleanup)
        })
      })
    })

    context('with insert-bounded flag', function () {
      helper.skipUnlessVersion('>= 4.3.0', this)

      const policy = new Aerospike.ListPolicy({
        writeFlags: lists.writeFlags.INSERT_BOUNDED
      })

      it('returns an error when trying to insert an item outside the current bounds of the list', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, 5] }))
          .then(expectError())
          .then(operate(lists.insert('list', 10, 99, policy)))
          .then(assertError(ListOutOfBoundsError))
          .then(cleanup)
      })

      context('with no-fail flag', function () {
        const policy = new Aerospike.ListPolicy({
          writeFlags: lists.writeFlags.INSERT_BOUNDED | lists.writeFlags.NO_FAIL
        })

        it('does not insert an item outside bounds, but returns ok', function () {
          return initState()
            .then(createRecord({ list: [1, 2, 3, 4, 5] }))
            .then(operate(lists.insert('list', 10, 99, policy)))
            .then(assertResultEql({ list: 5 }))
            .then(assertRecordEql({ list: [1, 2, 3, 4, 5] }))
            .then(cleanup)
        })
      })
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('inserts the item at the specified index of a nested list', function () {
        return initState()
          .then(createRecord({ map: { list: [1, 2, 3, 4, 5] } }))
          .then(operate(lists.insert('map', 2, 99).withContext(ctx => ctx.addMapKey('list'))))
          .then(assertResultEql({ map: 6 }))
          .then(assertRecordEql({ map: { list: [1, 2, 99, 3, 4, 5] } }))
          .then(cleanup)
      })
    })
  })

  describe('lists.insertItems', function () {
    it('inserts the items at the specified index and returns the list size', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(operate(lists.insertItems('list', 2, [99, 100])))
        .then(assertResultEql({ list: 7 }))
        .then(assertRecordEql({ list: [1, 2, 99, 100, 3, 4, 5] }))
        .then(cleanup)
    })

    it('returns an error if the value to insert is not an array', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(expectError())
        .then(operate(lists.insertItems('list', 2, 99)))
        .then(assertError(status.ERR_PARAM))
        .then(cleanup)
    })

    context('with add-unique flag', function () {
      const policy = {
        writeFlags: lists.writeFlags.ADD_UNIQUE
      }

      it('returns an error when trying to insert items that already exist in the list', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, 5] }))
          .then(expectError())
          .then(operate(lists.insertItems('list', 2, [3, 99], policy)))
          .then(assertError(status.ERR_FAIL_ELEMENT_EXISTS))
          .then(cleanup)
      })

      context('with no-fail flag', function () {
        helper.skipUnlessVersion('>= 4.3.0', this)

        const policy = {
          writeFlags: lists.writeFlags.ADD_UNIQUE | lists.writeFlags.NO_FAIL
        }

        it('does not insert any items but returns ok', function () {
          return initState()
            .then(createRecord({ list: [1, 2, 3, 4, 5] }))
            .then(operate(lists.insertItems('list', 2, [3, 99], policy)))
            .then(assertResultEql({ list: 5 }))
            .then(assertRecordEql({ list: [1, 2, 3, 4, 5] }))
            .then(cleanup)
        })

        context('with partial flag', function () {
          const policy = {
            writeFlags: lists.writeFlags.ADD_UNIQUE | lists.writeFlags.NO_FAIL | lists.writeFlags.PARTIAL
          }

          it('inserts only the unique items', function () {
            return initState()
              .then(createRecord({ list: [1, 2, 3, 4, 5] }))
              .then(operate(lists.insertItems('list', 2, [3, 99], policy)))
              .then(assertResultEql({ list: 6 }))
              .then(assertRecordEql({ list: [1, 2, 99, 3, 4, 5] }))
              .then(cleanup)
          })
        })
      })
    })

    context('with insert-bounded flag', function () {
      helper.skipUnlessVersion('>= 4.3.0', this)

      const policy = new Aerospike.ListPolicy({
        writeFlags: lists.writeFlags.INSERT_BOUNDED
      })

      it('returns an error when trying to insert items outside the current bounds of the list', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, 5] }))
          .then(expectError())
          .then(operate(lists.insertItems('list', 10, [99, 100], policy)))
          .then(assertError(ListOutOfBoundsError))
          .then(cleanup)
      })

      context('with no-fail flag', function () {
        const policy = new Aerospike.ListPolicy({
          writeFlags: lists.writeFlags.INSERT_BOUNDED | lists.writeFlags.NO_FAIL
        })

        it('does not insert the items outside bounds, but returns ok', function () {
          return initState()
            .then(createRecord({ list: [1, 2, 3, 4, 5] }))
            .then(operate(lists.insertItems('list', 10, [99, 100], policy)))
            .then(assertResultEql({ list: 5 }))
            .then(assertRecordEql({ list: [1, 2, 3, 4, 5] }))
            .then(cleanup)
        })
      })
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('inserts the items at the specified index of a nested list', function () {
        return initState()
          .then(createRecord({ map: { list: [1, 2, 3, 4, 5] } }))
          .then(operate(lists.insertItems('map', 2, [99, 100]).withContext(ctx => ctx.addMapKey('list'))))
          .then(assertResultEql({ map: 7 }))
          .then(assertRecordEql({ map: { list: [1, 2, 99, 100, 3, 4, 5] } }))
          .then(cleanup)
      })
    })
  })

  describe('lists.pop', function () {
    it('removes the item at the specified index and returns it', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(operate(lists.pop('list', 2)))
        .then(assertResultEql({ list: 3 }))
        .then(assertRecordEql({ list: [1, 2, 4, 5] }))
        .then(cleanup)
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes the item at the specified index and returns it', function () {
        return initState()
          .then(createRecord({ list: [[1, 2, 3, 4, 5], [6, 7, 8]] }))
          .then(operate(lists.pop('list', 2).withContext(ctx => ctx.addListIndex(0))))
          .then(assertResultEql({ list: 3 }))
          .then(assertRecordEql({ list: [[1, 2, 4, 5], [6, 7, 8]] }))
          .then(cleanup)
      })
    })
  })

  describe('lists.popRange', function () {
    it('removes the items at the specified range and returns them', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(operate(lists.popRange('list', 2, 2)))
        .then(assertResultEql({ list: [3, 4] }))
        .then(assertRecordEql({ list: [1, 2, 5] }))
        .then(cleanup)
    })

    it('removes and returns all items starting from the specified index if count is not specified', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(operate(lists.popRange('list', 2)))
        .then(assertResultEql({ list: [3, 4, 5] }))
        .then(assertRecordEql({ list: [1, 2] }))
        .then(cleanup)
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes the items in the specified range and returns them', function () {
        return initState()
          .then(createRecord({ list: [[1, 2, 3, 4, 5], [6, 7, 8]] }))
          .then(operate(lists.popRange('list', 2).withContext(ctx => ctx.addListIndex(1))))
          .then(assertResultEql({ list: [8] }))
          .then(assertRecordEql({ list: [[1, 2, 3, 4, 5], [6, 7]] }))
          .then(cleanup)
      })
    })
  })

  describe('lists.remove', function () {
    it('removes the item at the specified index and returns the number of items removed', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(operate(lists.remove('list', 2)))
        .then(assertResultEql({ list: 1 }))
        .then(assertRecordEql({ list: [1, 2, 4, 5] }))
        .then(cleanup)
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes the item at the specified index', function () {
        return initState()
          .then(createRecord({ list: [[1, 2, 3, 4, 5], [6, 7, 8]] }))
          .then(operate(lists.remove('list', 2).withContext(ctx => ctx.addListIndex(1))))
          .then(assertResultEql({ list: 1 }))
          .then(assertRecordEql({ list: [[1, 2, 3, 4, 5], [6, 7]] }))
          .then(cleanup)
      })
    })
  })

  describe('lists.removeRange', function () {
    it('removes the items in the specified range and returns the number of items removed', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(operate(lists.removeRange('list', 2, 2)))
        .then(assertResultEql({ list: 2 }))
        .then(assertRecordEql({ list: [1, 2, 5] }))
        .then(cleanup)
    })

    it('removes all items starting from the specified index and returns the number of items removed if count is not specified', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(operate(lists.removeRange('list', 2)))
        .then(assertResultEql({ list: 3 }))
        .then(assertRecordEql({ list: [1, 2] }))
        .then(cleanup)
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes the item at the specified range', function () {
        return initState()
          .then(createRecord({ list: [[1, 2, 3, 4, 5], [6, 7, 8]] }))
          .then(operate(lists.removeRange('list', 1, 3).withContext(ctx => ctx.addListIndex(0))))
          .then(assertResultEql({ list: 3 }))
          .then(assertRecordEql({ list: [[1, 5], [6, 7, 8]] }))
          .then(cleanup)
      })
    })
  })

  describe('lists.removeByIndex', function () {
    context('returnType=VALUE', function () {
      it('removes the item at the specified index and returns the value', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, 5] }))
          .then(operate(lists.removeByIndex('list', 2).andReturn(lists.returnType.VALUE)))
          .then(assertResultEql({ list: 3 }))
          .then(assertRecordEql({ list: [1, 2, 4, 5] }))
          .then(cleanup)
      })
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes the item at the specified index', function () {
        return initState()
          .then(createRecord({ map: { list: [1, 2, 3, 4, 5] } }))
          .then(operate(lists.removeByIndex('map', 2).withContext(ctx => ctx.addMapKey('list'))))
          .then(assertRecordEql({ map: { list: [1, 2, 4, 5] } }))
          .then(cleanup)
      })
    })
  })

  describe('lists.removeByIndexRange', function () {
    context('returnType=VALUE', function () {
      it('removes the items in the specified range and returns the values', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, 5] }))
          .then(operate(lists.removeByIndexRange('list', 2, 2).andReturn(lists.returnType.VALUE)))
          .then(assertResultEql({ list: [3, 4] }))
          .then(assertRecordEql({ list: [1, 2, 5] }))
          .then(cleanup)
      })

      it('removes the items starting from the specified index and returns the values', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, 5] }))
          .then(operate(lists.removeByIndexRange('list', 2).andReturn(lists.returnType.VALUE)))
          .then(assertResultEql({ list: [3, 4, 5] }))
          .then(assertRecordEql({ list: [1, 2] }))
          .then(cleanup)
      })
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes the item int the specified range', function () {
        return initState()
          .then(createRecord({ map: { list: [1, 2, 3, 4, 5] } }))
          .then(operate(lists.removeByIndexRange('map', 1, 3).withContext(ctx => ctx.addMapKey('list'))))
          .then(assertRecordEql({ map: { list: [1, 5] } }))
          .then(cleanup)
      })
    })
  })

  describe('lists.removeByValue', function () {
    context('returnType=INDEX', function () {
      it('removes all items with the specified value and returns the indexes', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 1, 2, 3] }))
          .then(operate(lists.removeByValue('list', 3).andReturn(lists.returnType.INDEX)))
          .then(assertResultEql({ list: [2, 5] }))
          .then(assertRecordEql({ list: [1, 2, 1, 2] }))
          .then(cleanup)
      })
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes all items with the specified value', function () {
        return initState()
          .then(createRecord({ list: [[3, 2, 1], [1, 2, 3, 1, 2, 3]] }))
          .then(operate(lists.removeByValue('list', 3).withContext(ctx => ctx.addListValue([3, 2, 1]))))
          .then(assertRecordEql({ list: [[2, 1], [1, 2, 3, 1, 2, 3]] }))
          .then(cleanup)
      })
    })
  })

  describe('lists.removeByValueList', function () {
    context('returnType=INDEX', function () {
      it('removes all items with the specified values and returns the indexes', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 1, 2, 3] }))
          .then(operate(lists.removeByValueList('list', [1, 3]).andReturn(lists.returnType.INDEX)))
          .then(assertResultEql({ list: [0, 2, 3, 5] }))
          .then(assertRecordEql({ list: [2, 2] }))
          .then(cleanup)
      })
    })

    context('invert results', function () {
      it('removes all items except with the specified values', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 1, 2, 3] }))
          .then(operate(lists.removeByValueList('list', [1, 3]).invertSelection()))
          .then(assertRecordEql({ list: [1, 3, 1, 3] }))
          .then(cleanup)
      })

      context('with nested list context', function () {
        helper.skipUnlessVersion('>= 4.6.0', this)

        it('removes all items except with the specified values', function () {
          return initState()
            .then(createRecord({ list: [[3, 2, 1], [1, 2, 3, 1, 2, 3]] }))
            .then(operate(
              lists
                .removeByValueList('list', [1, 4])
                .withContext(ctx => ctx.addListIndex(-1))
                .invertSelection()
            ))
            .then(assertRecordEql({ list: [[3, 2, 1], [1, 1]] }))
            .then(cleanup)
        })
      })
    })
  })

  describe('lists.removeByValueRange', function () {
    context('returnType=INDEX', function () {
      it('removes all items in the specified range of values and returns the indexes', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, 5] }))
          .then(operate(lists.removeByValueRange('list', 2, 5).andReturn(lists.returnType.INDEX)))
          .then(assertResultEql({ list: [1, 2, 3] }))
          .then(assertRecordEql({ list: [1, 5] }))
          .then(cleanup)
      })
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes all items in the specified range of values', function () {
        return initState()
          .then(createRecord({ list: [[1, 2, 3, 4, 5], [6, 7, 8]] }))
          .then(operate(lists.removeByValueRange('list', 2, 5).withContext(ctx => ctx.addListIndex(0))))
          .then(assertRecordEql({ list: [[1, 5], [6, 7, 8]] }))
          .then(cleanup)
      })
    })
  })

  describe('lists.removeByValueRelRankRange', function () {
    helper.skipUnlessVersion('>= 4.3.0', this)

    context('with count', function () {
      it('removes all items nearest to value and greater, by relative rank', function () {
        return initState()
          .then(createRecord({ list: [0, 4, 5, 9, 11, 15] }))
          .then(orderList('list'))
          .then(operate(lists.removeByValueRelRankRange('list', 5, 0, 2).andReturn(lists.returnType.VALUE)))
          .then(assertResultEql({ list: [5, 9] }))
          .then(assertRecordEql({ list: [0, 4, 11, 15] }))
          .then(cleanup)
      })
    })

    context('without count', function () {
      it('removes all items nearest to value and greater, by relative rank', function () {
        return initState()
          .then(createRecord({ list: [0, 4, 5, 9, 11, 15] }))
          .then(orderList('list'))
          .then(operate(lists.removeByValueRelRankRange('list', 5, 0).andReturn(lists.returnType.VALUE)))
          .then(assertResultEql({ list: [5, 9, 11, 15] }))
          .then(assertRecordEql({ list: [0, 4] }))
          .then(cleanup)
      })
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes all items nearest to value and greater, by relative rank', function () {
        const listContext = new Context().addMapKey('list')
        return initState()
          .then(createRecord({ map: { list: [0, 4, 5, 9, 11, 15] } }))
          .then(orderList('map', listContext))
          .then(operate(lists.removeByValueRelRankRange('map', 5, 0, 2).withContext(listContext)))
          .then(assertRecordEql({ map: { list: [0, 4, 11, 15] } }))
          .then(cleanup)
      })
    })
  })

  describe('lists.removeByRank', function () {
    context('returnType=VALUE', function () {
      it('removes the item with the specified list rank and returns the value', function () {
        return initState()
          .then(createRecord({ list: [3, 1, 2, 4] }))
          .then(operate(lists.removeByRank('list', 1).andReturn(lists.returnType.VALUE)))
          .then(assertResultEql({ list: 2 }))
          .then(assertRecordEql({ list: [3, 1, 4] }))
          .then(cleanup)
      })
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes the item with the specified list rank', function () {
        return initState()
          .then(createRecord({ list: [[2, 3, 1, 4], [3, 1, 2, 4]] }))
          .then(operate(lists.removeByRank('list', 1).withContext(ctx => ctx.addListIndex(1))))
          .then(assertRecordEql({ list: [[2, 3, 1, 4], [3, 1, 4]] }))
          .then(cleanup)
      })
    })
  })

  describe('lists.removeByRankRange', function () {
    context('returnType=VALUE', function () {
      it('removes the item with the specified list rank and returns the value', function () {
        return initState()
          .then(createRecord({ list: [3, 1, 2, 5, 4] }))
          .then(operate(lists.removeByRankRange('list', 1, 3).andReturn(lists.returnType.VALUE)))
          .then(assertResultSatisfy(result => eql(result.list.sort(), [2, 3, 4])))
          .then(assertRecordEql({ list: [1, 5] }))
          .then(cleanup)
      })
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes the item with the specified list rank', function () {
        return initState()
          .then(createRecord({ list: [[3, 1, 2, 5, 4], [1, 2, 3]] }))
          .then(operate(lists.removeByRankRange('list', 1, 3).withContext(ctx => ctx.addListIndex(0))))
          .then(assertRecordEql({ list: [[1, 5], [1, 2, 3]] }))
          .then(cleanup)
      })
    })
  })

  describe('lists.clear', function () {
    it('removes all elements from the list', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(operate(lists.clear('list')))
        .then(assertRecordEql({ list: [] }))
        .then(cleanup)
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes all elements from the list', function () {
        return initState()
          .then(createRecord({ map: { list: [1, 2, 3, 4, 5] } }))
          .then(operate(lists.clear('map').withContext(ctx => ctx.addMapKey('list'))))
          .then(assertRecordEql({ map: { list: [] } }))
          .then(cleanup)
      })
    })
  })

  describe('lists.set', function () {
    it('sets the item at the specified index', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(operate(lists.set('list', 2, 99)))
        .then(assertRecordEql({ list: [1, 2, 99, 4, 5] }))
        .then(cleanup)
    })

    context('with add-unique flag', function () {
      const policy = {
        writeFlags: lists.writeFlags.ADD_UNIQUE
      }

      it('fails with an error if the value already exists in the list', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, 5] }))
          .then(expectError())
          .then(operate(lists.set('list', 2, 5, policy)))
          .then(assertError(status.ERR_FAIL_ELEMENT_EXISTS))
          .then(assertRecordEql({ list: [1, 2, 3, 4, 5] }))
          .then(cleanup)
      })

      context('with no-fail flag', function () {
        helper.skipUnlessVersion('>= 4.3.0', this)

        const policy = {
          writeFlags: lists.writeFlags.ADD_UNIQUE | lists.writeFlags.NO_FAIL
        }

        it('does not set the value but returns ok', function () {
          return initState()
            .then(createRecord({ list: [1, 2, 3, 4, 5] }))
            .then(operate(lists.set('list', 2, 5, policy)))
            .then(assertRecordEql({ list: [1, 2, 3, 4, 5] }))
            .then(cleanup)
        })
      })
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('sets the item at the specified index', function () {
        return initState()
          .then(createRecord({ map: { list: [1, 2, 3, 4, 5] } }))
          .then(operate(lists.set('map', 2, 99).withContext(ctx => ctx.addMapKey('list'))))
          .then(assertRecordEql({ map: { list: [1, 2, 99, 4, 5] } }))
          .then(cleanup)
      })
    })
  })

  describe('lists.trim', function () {
    it('removes all elements not within the specified range and returns the number of elements removed', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(operate(lists.trim('list', 1, 3)))
        .then(assertResultEql({ list: 2 }))
        .then(assertRecordEql({ list: [2, 3, 4] }))
        .then(cleanup)
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('removes all elements not within the specified range', function () {
        return initState()
          .then(createRecord({ list: [['a', 'b', 'c'], [1, 2, 3, 4, 5]] }))
          .then(operate(lists.trim('list', 1, 3).withContext(ctx => ctx.addListValue([1, 2, 3, 4, 5]))))
          .then(assertResultEql({ list: 2 }))
          .then(assertRecordEql({ list: [['a', 'b', 'c'], [2, 3, 4]] }))
          .then(cleanup)
      })
    })
  })

  describe('lists.get', function () {
    it('returns the item at the specified index', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(operate(lists.get('list', 2)))
        .then(assertResultEql({ list: 3 }))
        .then(cleanup)
    })

    it('should return an error if the index is out of bounds', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(expectError())
        .then(operate(lists.get('list', 99)))
        .then(assertError(ListOutOfBoundsError))
        .then(cleanup)
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('returns the item at the specified index', function () {
        return initState()
          .then(createRecord({ list: [['a', 'b', 'c'], [1, 2, 3, 4, 5]] }))
          .then(operate(lists.get('list', 2).withContext(ctx => ctx.addListIndex(1))))
          .then(assertResultEql({ list: 3 }))
          .then(cleanup)
      })
    })
  })

  describe('lists.getRange', function () {
    it('returns the items in the specified range', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(operate(lists.getRange('list', 1, 3)))
        .then(assertResultEql({ list: [2, 3, 4] }))
        .then(cleanup)
    })

    it('returns all items starting at the specified index if count is not specified', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(operate(lists.getRange('list', 1)))
        .then(assertResultEql({ list: [2, 3, 4, 5] }))
        .then(cleanup)
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('returns the items in the specified range', function () {
        return initState()
          .then(createRecord({ map: { list: [1, 2, 3, 4, 5] } }))
          .then(operate(lists.getRange('map', 1, 3).withContext(ctx => ctx.addMapKey('list'))))
          .then(assertResultEql({ map: [2, 3, 4] }))
          .then(cleanup)
      })
    })
  })

  describe('lists.getByIndex', function () {
    context('returnType=VALUE', function () {
      it('fetches the item at the specified index and returns its value', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, 5] }))
          .then(operate(lists.getByIndex('list', 2).andReturn(lists.returnType.VALUE)))
          .then(assertResultEql({ list: 3 }))
          .then(cleanup)
      })

      context('with nested list context', function () {
        helper.skipUnlessVersion('>= 4.6.0', this)

        it('fetches the item at the specified index and returns its value', function () {
          return initState()
            .then(createRecord({ list: [['a', 'b', 'c'], [1, 2, 3, 4, 5]] }))
            .then(operate(
              lists
                .getByIndex('list', 2)
                .withContext(ctx => ctx.addListIndex(1))
                .andReturn(lists.returnType.VALUE)
            ))
            .then(assertResultEql({ list: 3 }))
            .then(cleanup)
        })
      })
    })
  })

  describe('lists.getByIndexRange', function () {
    context('returnType=VALUE', function () {
      it('fetches the items in the specified range and returns the values', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, 5] }))
          .then(operate(lists.getByIndexRange('list', 2, 2).andReturn(lists.returnType.VALUE)))
          .then(assertResultEql({ list: [3, 4] }))
          .then(cleanup)
      })

      it('fetches the items starting from the specified index and returns the values', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, 5] }))
          .then(operate(lists.getByIndexRange('list', 2).andReturn(lists.returnType.VALUE)))
          .then(assertResultEql({ list: [3, 4, 5] }))
          .then(cleanup)
      })

      context('with nested list context', function () {
        helper.skipUnlessVersion('>= 4.6.0', this)

        it('fetches the items in the specified range and returns the values', function () {
          return initState()
            .then(createRecord({ map: { list: [1, 2, 3, 4, 5] } }))
            .then(operate(
              lists
                .getByIndexRange('map', 2, 2)
                .withContext(ctx => ctx.addMapKey('list'))
                .andReturn(lists.returnType.VALUE)
            ))
            .then(assertResultEql({ map: [3, 4] }))
            .then(cleanup)
        })
      })
    })
  })

  describe('lists.getByValue', function () {
    context('returnType=INDEX', function () {
      it('fetches all items with the specified value and returns the indexes', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 1, 2, 3] }))
          .then(operate(lists.getByValue('list', 3).andReturn(lists.returnType.INDEX)))
          .then(assertResultEql({ list: [2, 5] }))
          .then(cleanup)
      })

      context('with nested list context', function () {
        helper.skipUnlessVersion('>= 4.6.0', this)

        it('fetches all items with the specified value and returns the indexes', function () {
          return initState()
            .then(createRecord({ list: [['a', 'b', 'c'], [1, 2, 3, 1, 2, 3]] }))
            .then(operate(
              lists
                .getByValue('list', 3)
                .withContext(ctx => ctx.addListIndex(1))
                .andReturn(lists.returnType.INDEX)
            ))
            .then(assertResultEql({ list: [2, 5] }))
            .then(cleanup)
        })
      })
    })
  })

  describe('lists.getByValueList', function () {
    context('returnType=INDEX', function () {
      it('fetches all items with the specified values and returns the indexes', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 1, 2, 3] }))
          .then(operate(lists.getByValueList('list', [1, 3]).andReturn(lists.returnType.INDEX)))
          .then(assertResultEql({ list: [0, 2, 3, 5] }))
          .then(cleanup)
      })

      context('with nested list context', function () {
        helper.skipUnlessVersion('>= 4.6.0', this)

        it('fetches all items with the specified values and returns the indexes', function () {
          return initState()
            .then(createRecord({ list: [['a', 'b', 'c'], [1, 2, 3, 1, 2, 3]] }))
            .then(operate(
              lists
                .getByValueList('list', [1, 3])
                .withContext(ctx => ctx.addListIndex(1))
                .andReturn(lists.returnType.INDEX)
            ))
            .then(assertResultEql({ list: [0, 2, 3, 5] }))
            .then(cleanup)
        })
      })
    })

    context('invert results', function () {
      it('fetches all items except with the specified values', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 1, 2, 3] }))
          .then(operate(lists.getByValueList('list', [1, 3]).invertSelection().andReturn(lists.returnType.INDEX)))
          .then(assertResultEql({ list: [1, 4] }))
          .then(cleanup)
      })
    })
  })

  describe('lists.getByValueRange', function () {
    context('returnType=INDEX', function () {
      it('fetches all items in the specified range of values and returns the indexes', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, 5] }))
          .then(operate(lists.getByValueRange('list', 2, 5).andReturn(lists.returnType.INDEX)))
          .then(assertResultEql({ list: [1, 2, 3] }))
          .then(cleanup)
      })

      context('with nested list context', function () {
        helper.skipUnlessVersion('>= 4.6.0', this)

        it('fetches all items in the specified range of values and returns the indexes', function () {
          return initState()
            .then(createRecord({ map: { list: [1, 2, 3, 4, 5] } }))
            .then(operate(
              lists
                .getByValueRange('map', 2, 5)
                .withContext(ctx => ctx.addMapKey('list'))
                .andReturn(lists.returnType.INDEX)
            ))
            .then(assertResultEql({ map: [1, 2, 3] }))
            .then(cleanup)
        })
      })
    })
  })

  describe('lists.getByValueRelRankRange', function () {
    helper.skipUnlessVersion('>= 4.3.0', this)

    context('with count', function () {
      it('fetches all items nearest to value and greater, by relative rank', function () {
        return initState()
          .then(createRecord({ list: [0, 4, 5, 9, 11, 15] }))
          .then(orderList('list'))
          .then(operate(lists.getByValueRelRankRange('list', 5, 0, 2).andReturn(lists.returnType.VALUE)))
          .then(assertResultEql({ list: [5, 9] }))
          .then(cleanup)
      })
    })
    context('without count', function () {
      it('fetches all items nearest to value and greater, by relative rank', function () {
        return initState()
          .then(createRecord({ list: [0, 4, 5, 9, 11, 15] }))
          .then(orderList('list'))
          .then(operate(lists.getByValueRelRankRange('list', 5, 0).andReturn(lists.returnType.VALUE)))
          .then(assertResultEql({ list: [5, 9, 11, 15] }))
          .then(cleanup)
      })
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('fetches all items nearest to value and greater, by relative rank', function () {
        const listContext = new Context().addMapKey('list')
        return initState()
          .then(createRecord({ map: { list: [0, 4, 5, 9, 11, 15] } }))
          .then(orderList('map', listContext))
          .then(operate(
            lists
              .getByValueRelRankRange('map', 5, 0, 2)
              .withContext(listContext)
              .andReturn(lists.returnType.VALUE)
          ))
          .then(assertResultEql({ map: [5, 9] }))
          .then(cleanup)
      })
    })
  })

  describe('lists.getByRank', function () {
    context('returnType=VALUE', function () {
      it('fetches the item with the specified list rank and returns the value', function () {
        return initState()
          .then(createRecord({ list: [3, 1, 2, 4] }))
          .then(operate(lists.getByRank('list', 1).andReturn(lists.returnType.VALUE)))
          .then(assertResultEql({ list: 2 }))
          .then(cleanup)
      })

      context('with nested list context', function () {
        helper.skipUnlessVersion('>= 4.6.0', this)

        it('fetches the item with the specified list rank and returns the value', function () {
          return initState()
            .then(createRecord({ list: [[3, 1, 2, 4], ['a', 'b', 'c']] }))
            .then(operate(
              lists
                .getByRank('list', 1)
                .withContext(ctx => ctx.addListIndex(0))
                .andReturn(lists.returnType.VALUE)
            ))
            .then(assertResultEql({ list: 2 }))
            .then(cleanup)
        })
      })
    })
  })

  describe('lists.getByRankRange', function () {
    context('returnType=VALUE', function () {
      it('fetches the item with the specified list rank and returns the value', function () {
        return initState()
          .then(createRecord({ list: [3, 1, 2, 5, 4] }))
          .then(operate(lists.getByRankRange('list', 1, 3).andReturn(lists.returnType.VALUE)))
          .then(assertResultSatisfy(result => eql(result.list.sort(), [2, 3, 4])))
          .then(cleanup)
      })

      context('with nested list context', function () {
        helper.skipUnlessVersion('>= 4.6.0', this)

        it('fetches the item with the specified list rank and returns the value', function () {
          return initState()
            .then(createRecord({ list: [[3, 1, 2, 5, 4], ['a', 'b', 'c']] }))
            .then(operate(
              lists
                .getByRankRange('list', 1, 3)
                .withContext(ctx => ctx.addListIndex(0))
                .andReturn(lists.returnType.VALUE)
            ))
            .then(assertResultSatisfy(result => eql(result.list.sort(), [2, 3, 4])))
            .then(cleanup)
        })
      })
    })
  })

  describe('lists.increment', function () {
    helper.skipUnlessVersion('>= 3.15.0', this)

    it('increments the element at the specified index and returns the final value', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(operate(lists.increment('list', 1, 3)))
        .then(assertResultEql({ list: 5 }))
        .then(assertRecordEql({ list: [1, 5, 3, 4, 5] }))
        .then(cleanup)
    })

    it('increments the element at the specified index by one and returns the final value', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(operate(lists.increment('list', 2)))
        .then(assertResultEql({ list: 4 }))
        .then(assertRecordEql({ list: [1, 2, 4, 4, 5] }))
        .then(cleanup)
    })

    context('ordered lists', function () {
      it('reorders the list with the incremented value', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, 5] }))
          .then(orderList('list'))
          .then(operate(lists.increment('list', 2, 10)))
          .then(assertResultEql({ list: 13 }))
          .then(assertRecordEql({ list: [1, 2, 4, 5, 13] }))
          .then(cleanup)
      })
    })

    context('with add-unique flag', function () {
      const policy = {
        writeFlags: lists.writeFlags.ADD_UNIQUE
      }

      it('fails with an error if the incremented number already exists in the list', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, 5] }))
          .then(expectError())
          .then(operate(lists.increment('list', 2, 1, policy)))
          .then(assertError(status.ERR_FAIL_ELEMENT_EXISTS))
          .then(cleanup)
      })

      context('with no-fail flag', function () {
        helper.skipUnlessVersion('>= 4.3.0', this)

        const policy = {
          writeFlags: lists.writeFlags.ADD_UNIQUE | lists.writeFlags.NO_FAIL
        }

        it('does not increment the item but returns ok', function () {
          return initState()
            .then(createRecord({ list: [1, 2, 3, 4, 5] }))
            .then(operate(lists.increment('list', 2, 1, policy)))
            // Note: Operation returns post-increment value even though
            // operation was not executed due to add-unique constraint!
            .then(assertResultEql({ list: 4 }))
            .then(assertRecordEql({ list: [1, 2, 3, 4, 5] }))
            .then(cleanup)
        })
      })
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('increments the element at the specified index and returns the final value', function () {
        return initState()
          .then(createRecord({ map: { list: [1, 2, 3, 4, 5] } }))
          .then(operate(lists.increment('map', 1, 3).withContext(ctx => ctx.addMapKey('list'))))
          .then(assertResultEql({ map: 5 }))
          .then(assertRecordEql({ map: { list: [1, 5, 3, 4, 5] } }))
          .then(cleanup)
      })
    })
  })

  describe('lists.size', function () {
    it('returns the element count', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(operate(lists.size('list')))
        .then(assertResultEql({ list: 5 }))
        .then(cleanup)
    })

    context('with nested list context', function () {
      helper.skipUnlessVersion('>= 4.6.0', this)

      it('returns the element count', function () {
        return initState()
          .then(createRecord({ list: [[], [1, 2, 3, 4, 5]] }))
          .then(operate(lists.size('list').withContext(ctx => ctx.addListIndex(-1))))
          .then(assertResultEql({ list: 5 }))
          .then(cleanup)
      })
    })
  })

  describe('ListOperation', function () {
    describe('#invertSelection', function () {
      it('throws an error if the operation is not invertible', function () {
        const op = lists.size('lists')
        expect(() => op.invertSelection()).to.throw(AerospikeError, 'List operation cannot be inverted')
      })
    })
  })
})

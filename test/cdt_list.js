// *****************************************************************************
// Copyright 2013-2018 Aerospike, Inc.
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
const status = Aerospike.status

describe('client.operate() - CDT List operations', function () {
  let client = helper.client

  class State {
    enrich (name, promise) {
      if (this._expectError) {
        return promise.catch(error => {
          this['error'] = error
          return this
        })
      } else {
        return promise.then(value => {
          this[name] = value
          return this
        })
      }
    }

    passthrough (promise) {
      return promise.then(() => this)
    }

    resolve (value) {
      return Promise.resolve(value).then(() => this)
    }

    expectError () {
      this._expectError = true
      return this
    }
  }

  function initState () {
    return Promise.resolve(new State())
  }

  function expectError () {
    return function (state) {
      return state.expectError()
    }
  }

  function createRecord (bins) {
    return function (state) {
      let key = helper.keygen.string(helper.namespace, helper.set, {prefix: 'cdt_list/'})()
      let meta = { ttl: 600 }
      let policy = new Aerospike.WritePolicy({
        exists: Aerospike.policy.exists.CREATE_OR_REPLACE
      })
      return state.enrich('key', client.put(key, bins, meta, policy))
    }
  }

  function operate (ops) {
    if (!Array.isArray(ops)) {
      ops = [ops]
    }
    return function (state) {
      return state.enrich('result', client.operate(state.key, ops))
    }
  }

  function assertResultEql (expected) {
    return function (state) {
      return state.resolve(expect(state.result.bins).to.eql(expected, 'operate result'))
    }
  }

  function assertRecordEql (expected) {
    return function (state) {
      return state.passthrough(client.get(state.key)
        .then(record => expect(record.bins).to.eql(expected, 'record bins after operation')))
    }
  }

  function assertError (code) {
    return function (state) {
      return state.resolve(
        expect(state.error, 'error raised by operate command')
          .to.be.instanceof(AerospikeError)
          .with.property('code', code))
    }
  }

  function cleanup () {
    return function (state) {
      return state.passthrough(client.remove(state.key))
    }
  }

  describe('lists.setOrder', function () {
    it('changes the list order', function () {
      return initState()
        .then(createRecord({ list: [ 3, 1, 2 ] }))
        .then(operate([
          lists.setOrder('list', lists.order.ORDERED),
          ops.read('list')
        ]))
        .then(assertResultEql({ list: [1, 2, 3] }))
        .then(cleanup())
    })
  })

  describe('lists.sort', function () {
    it('sorts the list', function () {
      return initState()
        .then(createRecord({ list: [ 3, 1, 2, 1 ] }))
        .then(operate([
          lists.sort('list', lists.sortFlags.DEFAULT),
          ops.read('list')
        ]))
        .then(assertResultEql({ list: [1, 1, 2, 3] }))
        .then(cleanup())
    })

    it('sorts the list and drops duplicates', function () {
      return initState()
        .then(createRecord({ list: [ 3, 1, 2, 1 ] }))
        .then(operate([
          lists.sort('list', lists.sortFlags.DROP_DUPLICATES),
          ops.read('list')
        ]))
        .then(assertResultEql({ list: [1, 2, 3] }))
        .then(cleanup())
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

    context('add-unique policy', function () {
      it('returns an error when trying to append a non-unique element', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, 5] }))
          .then(expectError())
          .then(operate(lists.append('list', 3, { writeFlags: lists.writeFlags.ADD_UNIQUE })))
          .then(assertError(status.ERR_FAIL_ELEMENT_EXISTS))
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

    context('add-unique policy', function () {
      it('does not append items that already exist in the list', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, 5] }))
          .then(operate(lists.appendItems('list', [3, 6], { writeFlags: lists.writeFlags.ADD_UNIQUE })))
          .then(assertResultEql({ list: 6 }))
          .then(assertRecordEql({ list: [1, 2, 3, 4, 5, 6] }))
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

    context('add-unique policy', function () {
      it('returns an error when trying to insert a non-unique element', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, 5] }))
          .then(expectError())
          .then(operate(lists.insert('list', 2, 3, { writeFlags: lists.writeFlags.ADD_UNIQUE })))
          .then(assertError(status.ERR_FAIL_ELEMENT_EXISTS))
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

    context('add-unique policy', function () {
      it('does not insert items that already exist in the list', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, 5] }))
          .then(operate(lists.insertItems('list', 2, [3, 99], { writeFlags: lists.writeFlags.ADD_UNIQUE })))
          .then(assertResultEql({ list: 6 }))
          .then(assertRecordEql({ list: [1, 2, 99, 3, 4, 5] }))
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
  })

  describe('lists.clear', function () {
    it('removes all elements from the list', function () {
      return initState()
        .then(createRecord({ list: [1, 2, 3, 4, 5] }))
        .then(operate(lists.clear('list')))
        .then(assertRecordEql({ list: [] }))
        .then(cleanup)
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
        .then(assertError(status.ERR_REQUEST_INVALID))
        .then(cleanup)
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
  })

  describe('lists.increment', function () {
    beforeEach(function () {
      if (!helper.cluster.build_gte('3.15.0')) {
        this.skip('list increment operation not supported')
      }
    })

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

    context('add-unique policy', function () {
      it('fails with an error if the incremented number already exists in the list', function () {
        return initState()
          .then(createRecord({ list: [1, 2, 3, 4, 5] }))
          .then(expectError())
          .then(operate(lists.increment('list', 2, 1, { writeFlags: lists.writeFlags.ADD_UNIQUE })))
          .then(assertError(status.ERR_FAIL_ELEMENT_EXISTS))
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
  })
})

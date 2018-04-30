// *****************************************************************************
// Copyright 2013-2017 Aerospike, Inc.
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

/* global expect, describe, it, beforeEach */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const AerospikeError = Aerospike.AerospikeError
const lists = Aerospike.lists
const ops = Aerospike.operations
const status = Aerospike.status

describe('client.operate() - CDT List operations', function () {
  var client = helper.client
  var key = null

  function setup (record, done) {
    key = helper.keygen.string(helper.namespace, helper.set, {prefix: 'cdt_list/'})()
    let meta = { ttl: 600 }
    let policy = new Aerospike.WritePolicy({
      exists: Aerospike.policy.exists.CREATE_OR_REPLACE
    })
    client.put(key, record, meta, policy, function (err) {
      if (err) throw err
      done()
    })
  }

  function teardown (done) {
    client.remove(key, done)
  }

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
      let key = helper.keygen.string(helper.namespace, helper.set, {prefix: 'cdt_map/'})()
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

  function assertResultSatisfy (matcher) {
    return function (state) {
      return state.resolve(expect(state.result.bins).to.satisfy(matcher, 'operate result'))
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

  // Helper method to execute a single operation on the given record and verify:
  // 1) The results returned by the operation,
  // 2) The contents of the record after the operation.
  function verifyOperation (record, op, expectedResult, expectedBinsPostOp, done) {
    setup(record, function () {
      client.operate(key, [op], function (err, result) {
        if (err) throw err
        expect(result.bins).to.eql(expectedResult)
        client.get(key, function (err, record) {
          if (err) throw err
          expect(record.bins).to.eql(expectedBinsPostOp)
          teardown(done)
        })
      })
    })
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
    it('sorts the map', function () {
      return initState()
        .then(createRecord({ list: [ 3, 1, 2, 1 ] }))
        .then(operate([
          lists.sort('list', lists.sortFlags.DEFAULT),
          ops.read('list')
        ]))
        .then(assertResultEql({ list: [1, 1, 2, 3] }))
        .then(cleanup())
    })

    it('sorts the map and drops duplicates', function () {
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
    it('appends an item to the list and returns the list size', function (done) {
      var record = { list: [1, 2, 3, 4, 5] }
      var operation = lists.append('list', 99)
      var expectedResult = { list: 6 }
      var expectedRecord = { list: [1, 2, 3, 4, 5, 99] }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('lists.appendItems', function () {
    it('appends the items to the list and returns the list size', function (done) {
      var record = { list: [1, 2, 3, 4, 5] }
      var operation = lists.appendItems('list', [99, 100])
      var expectedResult = { list: 7 }
      var expectedRecord = { list: [1, 2, 3, 4, 5, 99, 100] }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })

    it('returns an error if the value to append is not an array', function (done) {
      var record = { list: [1, 2, 3, 4, 5] }
      var operation = lists.appendItems('list', 99)
      setup(record, function () {
        client.operate(key, [operation], function (err, result) {
          expect(err.code).to.equal(status.ERR_PARAM)
          teardown(done)
        })
      })
    })
  })

  describe('lists.insert', function () {
    it('inserts the item at the specified index and returns the list size', function (done) {
      var record = { list: [1, 2, 3, 4, 5] }
      var operation = lists.insert('list', 2, 99)
      var expectedResult = { list: 6 }
      var expectedRecord = { list: [1, 2, 99, 3, 4, 5] }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('lists.insertItems', function () {
    it('inserts the items at the specified index and returns the list size', function (done) {
      var record = { list: [1, 2, 3, 4, 5] }
      var operation = lists.insertItems('list', 2, [99, 100])
      var expectedResult = { list: 7 }
      var expectedRecord = { list: [1, 2, 99, 100, 3, 4, 5] }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })

    it('returns an error if the value to insert is not an array', function (done) {
      var record = { list: [1, 2, 3, 4, 5] }
      var operation = lists.insertItems('list', 2, 99)
      setup(record, function () {
        client.operate(key, [operation], function (err, result) {
          expect(err.code).to.equal(status.ERR_PARAM)
          teardown(done)
        })
      })
    })
  })

  describe('lists.pop', function () {
    it('removes the item at the specified index and returns it', function (done) {
      var record = { list: [1, 2, 3, 4, 5] }
      var operation = lists.pop('list', 2)
      var expectedResult = { list: 3 }
      var expectedRecord = { list: [1, 2, 4, 5] }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('lists.popRange', function () {
    it('removes the items at the specified range and returns them', function (done) {
      var record = { list: [1, 2, 3, 4, 5] }
      var operation = lists.popRange('list', 2, 2)
      var expectedResult = { list: [3, 4] }
      var expectedRecord = { list: [1, 2, 5] }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })

    it('removes and returns all items starting from the specified index if count is not specified', function (done) {
      var record = { list: [1, 2, 3, 4, 5] }
      var operation = lists.popRange('list', 2)
      var expectedResult = { list: [3, 4, 5] }
      var expectedRecord = { list: [1, 2] }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('lists.remove', function () {
    it('removes the item at the specified index and returns the number of items removed', function (done) {
      var record = { list: [1, 2, 3, 4, 5] }
      var operation = lists.remove('list', 2)
      var expectedResult = { list: 1 }
      var expectedRecord = { list: [1, 2, 4, 5] }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('lists.removeRange', function () {
    it('removes the items in the specified range and returns the number of items removed', function (done) {
      var record = { list: [1, 2, 3, 4, 5] }
      var operation = lists.removeRange('list', 2, 2)
      var expectedResult = { list: 2 }
      var expectedRecord = { list: [1, 2, 5] }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })

    it('removes all items starting from the specified index and returns the number of items removed if count is not specified', function (done) {
      var record = { list: [1, 2, 3, 4, 5] }
      var operation = lists.removeRange('list', 2)
      var expectedResult = { list: 3 }
      var expectedRecord = { list: [1, 2] }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('lists.clear', function () {
    it('removes all elements from the list', function (done) {
      var record = { list: [1, 2, 3, 4, 5] }
      var operation = lists.clear('list')
      var expectedResult = { }
      var expectedRecord = { list: [] }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('lists.set', function () {
    it('sets the item at the specified index', function (done) {
      var record = { list: [1, 2, 3, 4, 5] }
      var operation = lists.set('list', 2, 99)
      var expectedResult = { }
      var expectedRecord = { list: [1, 2, 99, 4, 5] }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('lists.trim', function () {
    it('removes all elements not within the specified range and returns the number of elements removed', function (done) {
      var record = { list: [1, 2, 3, 4, 5] }
      var operation = lists.trim('list', 1, 3)
      var expectedResult = { list: 2 }
      var expectedRecord = { list: [2, 3, 4] }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('lists.get', function () {
    it('returns the item at the specified index', function (done) {
      var record = { list: [1, 2, 3, 4, 5] }
      var operation = lists.get('list', 2)
      var expectedResult = { list: 3 }
      var expectedRecord = { list: [1, 2, 3, 4, 5] }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })

    it('should return an error if the index is out of bounds', function (done) {
      var record = { list: [1, 2, 3, 4, 5] }
      var operation = lists.get('list', 99)
      setup(record, function () {
        client.operate(key, [operation], function (err, result) {
          expect(err.code).to.equal(status.ERR_REQUEST_INVALID)
          teardown(done)
        })
      })
    })
  })

  describe('lists.getRange', function () {
    it('returns the items in the specified range', function (done) {
      var record = { list: [1, 2, 3, 4, 5] }
      var operation = lists.getRange('list', 1, 3)
      var expectedResult = { list: [2, 3, 4] }
      var expectedRecord = { list: [1, 2, 3, 4, 5] }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })

    it('returns all items starting at the specified index if count is not specified', function (done) {
      var record = { list: [1, 2, 3, 4, 5] }
      var operation = lists.getRange('list', 1)
      var expectedResult = { list: [2, 3, 4, 5] }
      var expectedRecord = { list: [1, 2, 3, 4, 5] }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('lists.increment', function () {
    beforeEach(function () {
      if (!helper.cluster.build_gte('3.15.0')) {
        this.skip('list increment operation not supported')
      }
    })

    it('increments the element at the specified index and returns the final value', function (done) {
      var record = { list: [1, 2, 3, 4, 5] }
      var operation = lists.increment('list', 1, 3)
      var expectedResult = { list: 5 }
      var expectedRecord = { list: [1, 5, 3, 4, 5] }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })

    it('increments the element at the specified index by one and returns the final value', function (done) {
      var record = { list: [1, 2, 3, 4, 5] }
      var operation = lists.increment('list', 2)
      var expectedResult = { list: 4 }
      var expectedRecord = { list: [1, 2, 4, 4, 5] }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })

  describe('lists.size', function () {
    it('returns the element count', function (done) {
      var record = { list: [1, 2, 3, 4, 5] }
      var operation = lists.size('list')
      var expectedResult = { list: 5 }
      var expectedRecord = { list: [1, 2, 3, 4, 5] }
      verifyOperation(record, operation, expectedResult, expectedRecord, done)
    })
  })
})
